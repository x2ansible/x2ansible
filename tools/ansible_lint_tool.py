import logging
import requests
from typing import Dict
import re

logger = logging.getLogger("AnsibleLintTool")

def ansible_lint_tool(playbook: str, profile: str = "basic") -> Dict:
    """
    Validates an Ansible playbook using remote ansible-lint FastAPI service.
    
    This tool validates Ansible playbooks against various lint profiles to ensure
    best practices, syntax correctness, and adherence to Ansible standards.

    :param playbook: The content of the Ansible playbook (YAML string)
    :param profile: Lint profile to use. Options: basic, production, safety, test, minimal
    :return: Comprehensive linting result dictionary with validation status and issues
    """
    # Robust cleaning of playbook content to handle agent-added quotes and escaping
    cleaned_playbook = playbook.strip()
    
    # Log what we received
    logger.info(f"📥 Received playbook: {len(playbook)} chars")
    logger.info(f"📝 Raw input (first 100 chars): {repr(playbook[:100])}")

    # === START: Improved robust cleaning ===
    # 1. Remove ONLY if the whole playbook is wrapped in triple quotes (not field quotes)
    if cleaned_playbook.startswith("'''") and cleaned_playbook.endswith("'''"):
        cleaned_playbook = cleaned_playbook[3:-3].strip()
        logger.info("🧹 Removed outer triple single quotes from playbook")
    elif cleaned_playbook.startswith('"""') and cleaned_playbook.endswith('"""'):
        cleaned_playbook = cleaned_playbook[3:-3].strip()
        logger.info("🧹 Removed outer triple double quotes from playbook")
    # 2. Remove accidental single/double quote wrapping of the *whole* playbook (never internal)
    elif cleaned_playbook.startswith("'") and cleaned_playbook.endswith("'") and cleaned_playbook.count('\n') > 1:
        cleaned_playbook = cleaned_playbook[1:-1].strip()
        logger.info("🧹 Removed outer single quotes from playbook")
    elif cleaned_playbook.startswith('"') and cleaned_playbook.endswith('"') and cleaned_playbook.count('\n') > 1:
        cleaned_playbook = cleaned_playbook[1:-1].strip()
        logger.info("🧹 Removed outer double quotes from playbook")

    # 3. Fix escaped newlines/tabs
    cleaned_playbook = cleaned_playbook.replace('\\n', '\n').replace('\\t', '\t')

    # 4. Ensure ONE YAML document marker at the top (not multiple!)
    cleaned_playbook = re.sub(r"^('?-{3,}'?\n)+", '', cleaned_playbook)  # Remove all starting document markers, quoted or not
    cleaned_playbook = '---\n' + cleaned_playbook.lstrip()
    logger.info(f"📝 Ensured single YAML document start marker at top")

    logger.info("🧾 Sending playbook content for lint (first 10 lines):\n" +
                "\n".join(cleaned_playbook.splitlines()[:10]))
    # === END: Improved robust cleaning ===

    # Log the cleaned version
    logger.info(f"🧹 Cleaned playbook: {len(cleaned_playbook)} chars")
    logger.info(f"📄 Cleaned content (first 200 chars): {repr(cleaned_playbook[:200])}")
    
    # Optional: Validate basic YAML structure before sending (can be disabled for testing)
    ENABLE_PREVALIDATION = False  # Disabled for now to test raw flow
    
    if ENABLE_PREVALIDATION:
        try:
            import yaml
            
            # Try to parse the YAML
            parsed = yaml.safe_load(cleaned_playbook)
            if parsed is None:
                raise ValueError("Parsed YAML is empty")
                
            # Ensure it's a list (playbook should be a list of plays)
            if not isinstance(parsed, list):
                raise ValueError(f"Playbook must be a list of plays, got {type(parsed).__name__}")
                
            # Basic validation of playbook structure
            for i, play in enumerate(parsed):
                if not isinstance(play, dict):
                    raise ValueError(f"Play {i} must be a dictionary, got {type(play).__name__}")
                if 'hosts' not in play and 'import_playbook' not in play:
                    raise ValueError(f"Play {i} must have 'hosts' or 'import_playbook' defined")
            
            logger.info(f"✅ YAML pre-validation passed: {len(parsed)} plays found")
            
        except yaml.YAMLError as e:
            error_msg = f"Invalid YAML syntax: {str(e)}"
            logger.error(f"❌ YAML pre-validation failed: {error_msg}")
            return _create_error_result(error_msg, -10)
            
        except ValueError as e:
            error_msg = f"Invalid playbook structure: {str(e)}"
            logger.error(f"❌ Playbook structure validation failed: {error_msg}")
            return _create_error_result(error_msg, -11)
            
        except Exception as e:
            logger.warning(f"⚠️ YAML pre-validation warning: {e}")
            # Continue anyway - let ansible-lint handle edge cases
    else:
        logger.info("⚠️ Pre-validation disabled - sending directly to ansible-lint")
    
    url = "https://lint-api-route-convert2ansible.apps.prod.rhoai.rh-aiservices-bu.com/v1/lint/" + profile
    
    files = {'file': ('playbook.yml', cleaned_playbook.encode('utf-8'), 'application/x-yaml')}
    headers = {'accept': 'application/json'}
    
    logger.info(f"🚀 Sending to ansible-lint service: {url}")
    logger.info(f"📊 Final payload size: {len(cleaned_playbook)} chars")
    
    try:
        response = requests.post(url, files=files, headers=headers, timeout=60)
        response.raise_for_status()
        
        result = response.json()
        exit_code = result.get('exit_code', -1)
        stdout = result.get('stdout', '')
        stderr = result.get('stderr', '')
        
        # Determine validation status
        validation_passed = exit_code == 0
        
        if validation_passed:
            logger.info("✅ Playbook validation PASSED!")
            return {
                "validation_passed": True,
                "exit_code": exit_code,
                "message": "✅ Playbook successfully passed all lint checks",
                "summary": {
                    "passed": True,
                    "violations": 0,
                    "warnings": 0,
                    "total_issues": 0
                },
                "issues": [],
                "raw_output": {"stdout": stdout, "stderr": stderr}
            }
        else:
            logger.warning(f"❌ Playbook validation FAILED (exit_code: {exit_code})")
            
            # Parse issues for better feedback
            issues = _extract_issues(stdout, stderr)
            summary_stats = _calculate_summary_stats(issues, stderr)
            
            return {
                "validation_passed": False,
                "exit_code": exit_code,
                "message": f"❌ Playbook validation failed - {summary_stats['total_issues']} issues found",
                "summary": summary_stats,
                "issues": issues,
                "raw_output": {"stdout": stdout, "stderr": stderr},
                "recommendations": _generate_recommendations(issues)
            }
            
    except requests.exceptions.Timeout:
        logger.error("⏰ Lint service timeout")
        return _create_error_result("Lint service timed out", -2)
        
    except requests.exceptions.ConnectionError:
        logger.error("🔌 Cannot connect to lint service")
        return _create_error_result("Cannot connect to ansible-lint service", -3)
        
    except Exception as e:
        logger.error(f"💥 Validation error: {e}")
        return _create_error_result(f"Validation failed: {str(e)}", -1)


def _extract_issues(stdout: str, stderr: str) -> list:
    """Extract specific, actionable issues from ansible-lint output."""
    issues = []
    
    try:
        lines = stdout.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Parse rule violations like "syntax-check[unknown-module]: description"
            if '[' in line and ']:' in line and not line.startswith('~'):
                parts = line.split(']:')
                if len(parts) >= 2:
                    rule_part = parts[0]
                    description = parts[1].strip()
                    
                    # Extract rule info
                    if '[' in rule_part:
                        rule_category = rule_part.split('[')[0].strip()
                        rule_specific = rule_part.split('[')[1].replace(']', '')
                        
                        issue = {
                            "rule": f"{rule_category}[{rule_specific}]",
                            "category": rule_category,
                            "specific_rule": rule_specific,
                            "description": description,
                            "severity": "fatal" if "fatal" in stderr.lower() else "error",
                            "file": "playbook.yml"
                        }
                        issues.append(issue)
                        
    except Exception as e:
        logger.warning(f"Failed to parse issues: {e}")
    
    return issues


def _calculate_summary_stats(issues: list, stderr: str) -> Dict:
    """Calculate summary statistics from parsed issues."""
    violations = len([i for i in issues if i.get("severity") in ["fatal", "error"]])
    warnings = len([i for i in issues if i.get("severity") == "warning"])
    
    return {
        "passed": False,
        "violations": violations,
        "warnings": warnings,
        "total_issues": len(issues),
        "has_fatal": any(i.get("severity") == "fatal" for i in issues)
    }


def _generate_recommendations(issues: list) -> list:
    """Generate actionable fix recommendations."""
    recommendations = []
    
    for issue in issues:
        rule = issue.get("specific_rule", "")
        
        if "unknown-module" in rule:
            recommendations.append({
                "issue": issue.get("rule"),
                "recommendation": "Install missing collection or fix module name",
                "action": "Add 'collections:' section or use fully qualified collection name",
                "example": "Use 'ansible.posix.firewalld' instead of 'firewalld'"
            })
        else:
            recommendations.append({
                "issue": issue.get("rule"),
                "recommendation": f"Review and fix {issue.get('category', 'general')} issue",
                "action": "See ansible-lint documentation for specific rule"
            })
    
    return recommendations


def _create_error_result(error_message: str, exit_code: int) -> Dict:
    """Create standardized error result."""
    return {
        "validation_passed": False,
        "exit_code": exit_code,
        "message": f"Validation failed: {error_message}",
        "summary": {
            "passed": False,
            "violations": 1,
            "warnings": 0,
            "total_issues": 1,
            "error": True
        },
        "issues": [{
            "rule": "system-error",
            "category": "system",
            "description": error_message,
            "severity": "fatal"
        }],
        "raw_output": {"stdout": "", "stderr": error_message},
        "error": error_message
    }
