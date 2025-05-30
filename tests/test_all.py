#!/usr/bin/env python3
"""
Complete Agent Testing Script - Tests each agent individually
Simulates UI calls through API endpoints to verify agent functionality
"""

import requests
import json
import time
from typing import Dict, Any, Optional

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_colored(text: str, color: str = Colors.WHITE):
    print(f"{color}{text}{Colors.END}")

def print_section(title: str):
    print_colored(f"\n{'='*60}", Colors.CYAN)
    print_colored(f" {title}", Colors.CYAN + Colors.BOLD)
    print_colored(f"{'='*60}", Colors.CYAN)

class AgentTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip("/")
        self.results = {}
        
    def make_request(self, method: str, endpoint: str, data: Dict[str, Any] = None, timeout: int = 60) -> Dict[str, Any]:
        """Make HTTP request and return parsed response"""
        url = f"{self.base_url}{endpoint}"
        try:
            if method.upper() == "GET":
                response = requests.get(url, timeout=timeout)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, timeout=timeout)
            else:
                return {"error": f"Unsupported method: {method}"}
            
            return {
                "status_code": response.status_code,
                "success": response.status_code < 400,
                "data": response.json() if response.status_code < 400 else None,
                "error": response.text if response.status_code >= 400 else None,
                "url": url
            }
        except requests.exceptions.Timeout:
            return {"error": f"Request timeout after {timeout}s", "url": url}
        except requests.exceptions.RequestException as e:
            return {"error": str(e), "url": url}
        except json.JSONDecodeError as e:
            return {"error": f"Invalid JSON response: {e}", "url": url}

    def test_system_health(self):
        """Test overall system health"""
        print_section("SYSTEM HEALTH CHECK")
        
        result = self.make_request("GET", "/health")
        if result.get("success"):
            data = result["data"]
            print_colored("✅ System Health: HEALTHY", Colors.GREEN)
            
            services = data.get("services", {})
            for service_name, service_info in services.items():
                available = service_info.get("available", False)
                status_icon = "✅" if available else "❌"
                color = Colors.GREEN if available else Colors.RED
                
                print_colored(f"   {status_icon} {service_name}: {'Available' if available else 'Unavailable'}", color)
                
                # Show additional health info for context_agent
                if service_name == "context_agent" and available:
                    health = service_info.get("health", {})
                    health_status = health.get("status", "unknown")
                    query_success = health.get("test_query_success", False)
                    print_colored(f"      Health: {health_status} | Query Test: {query_success}", 
                                Colors.GREEN if health_status == "healthy" else Colors.YELLOW)
                
                # Show additional info for llama_stack
                elif service_name == "llama_stack":
                    base_url = service_info.get("base_url", "unknown")
                    model = service_info.get("model", "unknown")
                    print_colored(f"      URL: {base_url} | Model: {model}", Colors.BLUE)
            
            agents_available = data.get("agents_available", 0)
            print_colored(f"\n📊 Summary: {agents_available}/4 agents available", Colors.BLUE)
            
            # Test LlamaStack connectivity directly
            self._test_llamastack_direct_connectivity(data)
            
        else:
            print_colored(f"❌ System Health Check FAILED: {result.get('error')}", Colors.RED)
            return False
        
        self.results["system_health"] = result
        return result.get("success", False)
    
    def _test_llamastack_direct_connectivity(self, health_data):
        """Test direct LlamaStack connectivity"""
        print_colored(f"\n🔍 Testing LlamaStack Direct Connectivity:", Colors.BLUE)
        
        # Get LlamaStack URL from health data
        llama_service = health_data.get("services", {}).get("llama_stack", {})
        llama_url = llama_service.get("base_url", "http://lss-chai.apps.cluster-7nc6z.7nc6z.sandbox2170.opentlc.com")
        
        try:
            # Test LlamaStack health endpoint directly
            health_url = f"{llama_url}/v1/health"
            response = requests.get(health_url, timeout=10)
            
            if response.status_code == 200:
                health_data_ls = response.json()
                status = health_data_ls.get("status", "unknown")
                print_colored(f"   ✅ LlamaStack Health: {status}", Colors.GREEN)
                
                # Test agents endpoint
                agents_url = f"{llama_url}/v1/agents"
                agents_response = requests.get(agents_url, timeout=10)
                if agents_response.status_code == 200:
                    agents_data = agents_response.json()
                    agent_count = len(agents_data.get("data", []))
                    print_colored(f"   ✅ LlamaStack Agents: {agent_count} registered", Colors.GREEN)
                else:
                    print_colored(f"   ⚠️  LlamaStack Agents endpoint: {agents_response.status_code}", Colors.YELLOW)
                
                # Test vector DBs endpoint
                vectordb_url = f"{llama_url}/v1/vector-dbs"
                vectordb_response = requests.get(vectordb_url, timeout=10)
                if vectordb_response.status_code == 200:
                    vectordb_data = vectordb_response.json()
                    if isinstance(vectordb_data, dict):
                        db_count = len(vectordb_data.get("data", []))
                    else:
                        db_count = len(vectordb_data) if isinstance(vectordb_data, list) else 0
                    print_colored(f"   ✅ LlamaStack Vector DBs: {db_count} available", Colors.GREEN)
                else:
                    print_colored(f"   ⚠️  LlamaStack Vector DBs endpoint: {vectordb_response.status_code}", Colors.YELLOW)
                    
            else:
                print_colored(f"   ❌ LlamaStack Health Check Failed: {response.status_code}", Colors.RED)
                print_colored(f"      Response: {response.text[:100]}", Colors.RED)
                
        except Exception as e:
            print_colored(f"   ❌ LlamaStack Connection Failed: {e}", Colors.RED)

    def test_classifier_agent(self):
        """Test ClassifierAgent with various IaC code samples"""
        print_section("CLASSIFIER AGENT TEST")
        
        # Test health endpoint first
        health_result = self.make_request("GET", "/api/v2/classify/health")
        if not health_result.get("success"):
            print_colored("❌ Classifier health check failed", Colors.RED)
            self.results["classifier"] = {"health": False, "tests": []}
            return False
        
        print_colored("✅ Classifier health check passed", Colors.GREEN)
        
        # Test cases with different IaC code types
        test_cases = [
            {
                "name": "Terraform Code",
                "code": '''resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1d0"
  instance_type = "t2.micro"
  
  tags = {
    Name = "HelloWorld"
  }
}

provider "aws" {
  region = "us-west-2"
}''',
                "expected_tool": "terraform"
            },
            {
                "name": "Chef Recipe",
                "code": '''package 'apache2' do
  action :install
end

service 'apache2' do
  action [:enable, :start]
end

file '/var/www/html/index.html' do
  content '<h1>Hello World!</h1>'
  mode '0644'
  owner 'www-data'
  group 'www-data'
end''',
                "expected_tool": "chef"
            },
            {
                "name": "Puppet Manifest",
                "code": '''class apache {
  package { 'apache2':
    ensure => installed,
  }
  
  service { 'apache2':
    ensure => running,
    enable => true,
    require => Package['apache2'],
  }
  
  file { '/var/www/html/index.html':
    ensure  => present,
    content => '<h1>Hello World!</h1>',
    require => Package['apache2'],
  }
}''',
                "expected_tool": "puppet"
            },
            {
                "name": "Dockerfile",
                "code": '''FROM ubuntu:20.04

RUN apt-get update && apt-get install -y apache2

COPY index.html /var/www/html/

EXPOSE 80

CMD ["apache2ctl", "-D", "FOREGROUND"]''',
                "expected_tool": "docker"
            }
        ]
        
        test_results = []
        
        for test_case in test_cases:
            print_colored(f"\n🧪 Testing: {test_case['name']}", Colors.YELLOW)
            
            start_time = time.time()
            result = self.make_request("POST", "/api/v2/classify", {
                "code": test_case["code"]
            }, timeout=120)  # Extended timeout for AI processing
            duration = time.time() - start_time
            
            if result.get("success"):
                data = result["data"]["result"]
                classification = data.get("classification", "unknown").lower()
                convertible = data.get("convertible", False)
                confidence_source = data.get("confidence_source", "unknown")
                
                print_colored(f"   ✅ Classification: {classification}", Colors.GREEN)
                print_colored(f"   📊 Convertible: {convertible}", Colors.GREEN if convertible else Colors.YELLOW)
                print_colored(f"   🔍 Confidence Source: {confidence_source}", Colors.BLUE)
                print_colored(f"   ⏱️  Duration: {duration:.2f}s", Colors.BLUE)
                
                # Check if classification matches expected
                expected = test_case["expected_tool"]
                if expected in classification:
                    print_colored(f"   🎯 Expected tool '{expected}' detected correctly", Colors.GREEN)
                else:
                    print_colored(f"   ⚠️  Expected '{expected}' but got '{classification}'", Colors.YELLOW)
                
                test_results.append({
                    "name": test_case["name"],
                    "success": True,
                    "classification": classification,
                    "expected": expected,
                    "match": expected in classification,
                    "convertible": convertible,
                    "duration": duration
                })
            else:
                print_colored(f"   ❌ FAILED: {result.get('error')}", Colors.RED)
                test_results.append({
                    "name": test_case["name"],
                    "success": False,
                    "error": result.get("error")
                })
        
        # Summary
        successful_tests = sum(1 for t in test_results if t.get("success", False))
        print_colored(f"\n📊 Classifier Summary: {successful_tests}/{len(test_cases)} tests passed", 
                     Colors.GREEN if successful_tests == len(test_cases) else Colors.YELLOW)
        
        self.results["classifier"] = {
            "health": True,
            "tests": test_results,
            "success_rate": successful_tests / len(test_cases)
        }
        
        return successful_tests > 0

    def test_context_agent(self):
        """Test ContextAgent with various queries"""
        print_section("CONTEXT AGENT TEST")
        
        # Test health endpoint
        health_result = self.make_request("GET", "/api/v2/context/health")
        if not health_result.get("success"):
            print_colored("❌ Context agent health check failed", Colors.RED)
            self.results["context"] = {"health": False, "tests": []}
            return False
        
        print_colored("✅ Context agent health check passed", Colors.GREEN)
        
        # Test queries
        test_queries = [
            {
                "name": "Docker Installation Query",
                "query": "How to install Docker using Ansible playbook?",
                "expected_keywords": ["docker", "install", "ansible"]
            },
            {
                "name": "Apache Configuration Query", 
                "query": "Configure Apache web server with SSL certificates",
                "expected_keywords": ["apache", "ssl", "certificate"]
            },
            {
                "name": "Database Setup Query",
                "query": "Set up MySQL database with user creation",
                "expected_keywords": ["mysql", "database", "user"]
            }
        ]
        
        test_results = []
        
        for test_query in test_queries:
            print_colored(f"\n🧪 Testing: {test_query['name']}", Colors.YELLOW)
            
            start_time = time.time()
            result = self.make_request("POST", "/api/v2/context/query", {
                "query": test_query["query"],
                "top_k": 3
            }, timeout=90)
            duration = time.time() - start_time
            
            if result.get("success"):
                data = result["data"]
                context_chunks = data.get("context", [])
                
                print_colored(f"   ✅ Query successful", Colors.GREEN)
                print_colored(f"   📄 Retrieved {len(context_chunks)} context chunks", Colors.BLUE)
                print_colored(f"   ⏱️  Duration: {duration:.2f}s", Colors.BLUE)
                
                # Show preview of first chunk if available
                if context_chunks:
                    first_chunk = context_chunks[0].get("text", "")
                    if "No relevant patterns found" in first_chunk:
                        print_colored(f"   ℹ️  Vector DB appears empty (normal for new setup)", Colors.YELLOW)
                    else:
                        preview = first_chunk[:100] + "..." if len(first_chunk) > 100 else first_chunk
                        print_colored(f"   📝 Preview: {preview}", Colors.BLUE)
                
                test_results.append({
                    "name": test_query["name"],
                    "success": True,
                    "context_count": len(context_chunks),
                    "duration": duration,
                    "has_content": len(context_chunks) > 0 and "No relevant patterns found" not in str(context_chunks)
                })
            else:
                print_colored(f"   ❌ FAILED: {result.get('error')}", Colors.RED)
                test_results.append({
                    "name": test_query["name"],
                    "success": False,
                    "error": result.get("error")
                })
        
        # Summary
        successful_tests = sum(1 for t in test_results if t.get("success", False))
        print_colored(f"\n📊 Context Agent Summary: {successful_tests}/{len(test_queries)} tests passed", 
                     Colors.GREEN if successful_tests == len(test_queries) else Colors.YELLOW)
        
        self.results["context"] = {
            "health": True,
            "tests": test_results,
            "success_rate": successful_tests / len(test_queries)
        }
        
        return successful_tests > 0

    def test_code_generator_agent(self):
        """Test CodeGeneratorAgent with sample conversions"""
        print_section("CODE GENERATOR AGENT TEST")
        
        # Test health endpoint
        health_result = self.make_request("GET", "/api/v2/generate/health")
        if not health_result.get("success"):
            print_colored("❌ Code generator health check failed", Colors.RED)
            self.results["code_generator"] = {"health": False, "tests": []}
            return False
        
        print_colored("✅ Code generator health check passed", Colors.GREEN)
        
        # Test cases for code generation
        test_cases = [
            {
                "name": "Simple Package Installation",
                "code": '''package 'nginx' do
  action :install
end

service 'nginx' do
  action [:enable, :start]
end''',
                "context": "Convert this Chef recipe to install and start nginx web server",
                "expected_patterns": ["nginx", "package", "service", "present", "started"]
            },
            {
                "name": "File Management",
                "code": '''file { '/etc/nginx/nginx.conf':
  ensure  => present,
  content => template('nginx/nginx.conf.erb'),
  require => Package['nginx'],
  notify  => Service['nginx'],
}''',
                "context": "Convert this Puppet manifest for nginx configuration file management",
                "expected_patterns": ["file", "copy", "template", "nginx.conf"]
            }
        ]
        
        test_results = []
        
        for test_case in test_cases:
            print_colored(f"\n🧪 Testing: {test_case['name']}", Colors.YELLOW)
            
            start_time = time.time()
            result = self.make_request("POST", "/api/v2/generate", {
                "code": test_case["code"],
                "context": test_case["context"]
            }, timeout=120)
            duration = time.time() - start_time
            
            if result.get("success"):
                playbook = result["data"].get("playbook", "")
                
                print_colored(f"   ✅ Generation successful", Colors.GREEN)
                print_colored(f"   📄 Playbook length: {len(playbook)} characters", Colors.BLUE)
                print_colored(f"   ⏱️  Duration: {duration:.2f}s", Colors.BLUE)
                
                # Check if playbook starts with YAML marker
                if playbook.strip().startswith("---"):
                    print_colored(f"   ✅ Valid YAML format detected", Colors.GREEN)
                else:
                    print_colored(f"   ⚠️  Playbook doesn't start with '---'", Colors.YELLOW)
                
                # Check for expected patterns
                found_patterns = []
                for pattern in test_case["expected_patterns"]:
                    if pattern.lower() in playbook.lower():
                        found_patterns.append(pattern)
                
                print_colored(f"   🔍 Found patterns: {found_patterns}", Colors.BLUE)
                
                # Show preview
                lines = playbook.split('\n')[:8]
                preview = '\n'.join(lines)
                print_colored(f"   📝 Preview:\n{preview}", Colors.BLUE)
                
                test_results.append({
                    "name": test_case["name"],
                    "success": True,
                    "playbook_length": len(playbook),
                    "duration": duration,
                    "valid_yaml": playbook.strip().startswith("---"),
                    "found_patterns": found_patterns
                })
            else:
                print_colored(f"   ❌ FAILED: {result.get('error')}", Colors.RED)
                test_results.append({
                    "name": test_case["name"],
                    "success": False,
                    "error": result.get("error")
                })
        
        # Summary
        successful_tests = sum(1 for t in test_results if t.get("success", False))
        print_colored(f"\n📊 Code Generator Summary: {successful_tests}/{len(test_cases)} tests passed", 
                     Colors.GREEN if successful_tests == len(test_cases) else Colors.YELLOW)
        
        self.results["code_generator"] = {
            "health": True,
            "tests": test_results,
            "success_rate": successful_tests / len(test_cases)
        }
        
        return successful_tests > 0

    def test_validation_agent(self):
        """Test ValidationAgent with sample playbooks"""
        print_section("VALIDATION AGENT TEST")
        
        # Test health endpoint
        health_result = self.make_request("GET", "/api/v2/validate/health")
        if not health_result.get("success"):
            print_colored("❌ Validation agent health check failed", Colors.RED)
            self.results["validation"] = {"health": False, "tests": []}
            return False
        
        print_colored("✅ Validation agent health check passed", Colors.GREEN)
        
        # Test cases for validation
        test_cases = [
            {
                "name": "Valid Simple Playbook",
                "playbook": '''---
- name: Install and start nginx
  hosts: all
  become: yes
  tasks:
    - name: Install nginx package
      package:
        name: nginx
        state: present
        
    - name: Start nginx service
      service:
        name: nginx
        state: started
        enabled: yes''',
                "profile": "basic",
                "should_pass": True
            },
            {
                "name": "Invalid Playbook (Missing Hosts)",
                "playbook": '''---
- name: Bad playbook
  tasks:
    - name: This should fail
      debug:
        msg: "Missing hosts declaration"''',
                "profile": "basic", 
                "should_pass": False
            }
        ]
        
        test_results = []
        
        for test_case in test_cases:
            print_colored(f"\n🧪 Testing: {test_case['name']}", Colors.YELLOW)
            
            start_time = time.time()
            result = self.make_request("POST", "/api/v2/validate", {
                "playbook": test_case["playbook"],
                "profile": test_case["profile"]
            }, timeout=90)
            duration = time.time() - start_time
            
            if result.get("success"):
                data = result["data"]["result"]
                passed = data.get("passed", False)
                summary = data.get("summary", {})
                issues = data.get("issues", [])
                
                print_colored(f"   ✅ Validation completed", Colors.GREEN)
                print_colored(f"   📊 Result: {'PASSED' if passed else 'FAILED'}", 
                             Colors.GREEN if passed else Colors.RED)
                print_colored(f"   🔍 Issues found: {len(issues)}", Colors.BLUE)
                print_colored(f"   ⏱️  Duration: {duration:.2f}s", Colors.BLUE)
                
                # Show issues if any
                if issues:
                    print_colored(f"   ⚠️  Sample issues:", Colors.YELLOW)
                    for issue in issues[:3]:  # Show first 3 issues
                        if isinstance(issue, dict):
                            rule = issue.get("rule", {})
                            print_colored(f"      - {rule.get('id', 'unknown')}: {issue.get('message', 'No message')}", Colors.YELLOW)
                
                # Check if result matches expectation
                expected = test_case["should_pass"]
                if passed == expected:
                    print_colored(f"   🎯 Result matches expectation", Colors.GREEN)
                else:
                    print_colored(f"   ⚠️  Expected {'PASS' if expected else 'FAIL'} but got {'PASS' if passed else 'FAIL'}", Colors.YELLOW)
                
                test_results.append({
                    "name": test_case["name"],
                    "success": True,
                    "passed": passed,
                    "expected": expected,
                    "correct_result": passed == expected,
                    "issues_count": len(issues),
                    "duration": duration
                })
            else:
                print_colored(f"   ❌ FAILED: {result.get('error')}", Colors.RED)
                test_results.append({
                    "name": test_case["name"],
                    "success": False,
                    "error": result.get("error")
                })
        
        # Summary
        successful_tests = sum(1 for t in test_results if t.get("success", False))
        print_colored(f"\n📊 Validation Agent Summary: {successful_tests}/{len(test_cases)} tests passed", 
                     Colors.GREEN if successful_tests == len(test_cases) else Colors.YELLOW)
        
        self.results["validation"] = {
            "health": True,
            "tests": test_results,
            "success_rate": successful_tests / len(test_cases)
        }
        
        return successful_tests > 0

    def test_llamastack_integration(self):
        """Test LlamaStack integration and API availability"""
        print_section("LLAMASTACK INTEGRATION TEST")
        
        # Get LlamaStack URL from debug endpoint
        debug_result = self.make_request("GET", "/debug/llamastack-api")
        if not debug_result.get("success"):
            print_colored("❌ Could not get LlamaStack debug info", Colors.RED)
            return False
        
        debug_data = debug_data = debug_result["data"]
        llamastack_url = debug_data.get("llamastack_base_url", "")
        agent_id = debug_data.get("agent_id", "")
        vector_db_id = debug_data.get("vector_db_id", "")
        
        print_colored(f"🔍 Testing LlamaStack: {llamastack_url}", Colors.BLUE)
        print_colored(f"🤖 Using Agent ID: {agent_id}", Colors.BLUE)
        print_colored(f"🗃️  Using Vector DB: {vector_db_id}", Colors.BLUE)
        
        api_tests = debug_data.get("api_tests", {})
        summary = debug_data.get("summary", {})
        
        print_colored(f"\n📊 API Endpoint Test Results:", Colors.BLUE)
        
        test_results = []
        for test_name, result in api_tests.items():
            success = result.get("success", False)
            status_code = result.get("status_code", "ERROR")
            status_icon = "✅" if success else "❌"
            color = Colors.GREEN if success else Colors.RED
            
            print_colored(f"   {status_icon} {test_name}: {status_code}", color)
            test_results.append(success)
            
            # Show additional details for important endpoints
            if test_name == "session_turn" and success:
                print_colored(f"      ℹ️  Session/turn API working - RAG queries should work", Colors.GREEN)
            elif test_name == "vector_io_query" and success:
                print_colored(f"      ℹ️  Vector-io API working - fallback queries available", Colors.GREEN)
        
        working_endpoints = summary.get("working_endpoints", 0)
        total_endpoints = summary.get("total_endpoints", 0)
        
        print_colored(f"\n📈 LlamaStack API Summary:", Colors.BLUE)
        print_colored(f"   Working endpoints: {working_endpoints}/{total_endpoints}", Colors.BLUE)
        
        # Show recommendations
        recommendations = summary.get("recommendations", [])
        if recommendations:
            print_colored(f"   📋 Recommendations:", Colors.BLUE)
            for rec in recommendations:
                print_colored(f"      {rec}", Colors.YELLOW)
        
        success_rate = working_endpoints / total_endpoints if total_endpoints > 0 else 0
        
        if success_rate >= 0.6:
            print_colored(f"   ✅ LlamaStack integration: GOOD", Colors.GREEN)
        elif success_rate >= 0.3:
            print_colored(f"   ⚠️  LlamaStack integration: PARTIAL", Colors.YELLOW)
        else:
            print_colored(f"   ❌ LlamaStack integration: POOR", Colors.RED)
        
        self.results["llamastack"] = {
            "success": success_rate >= 0.3,
            "working_endpoints": working_endpoints,
            "total_endpoints": total_endpoints,
            "success_rate": success_rate,
            "recommendations": recommendations
        }
        
        return success_rate >= 0.3

    def test_end_to_end_workflow(self):
        """Test complete workflow: Classify -> Context -> Generate -> Validate"""
        print_section("END-TO-END WORKFLOW TEST")
        
        sample_chef_code = '''cookbook_file '/etc/motd' do
  source 'motd'
  mode '0644'
  owner 'root'
  group 'root'
end

package 'htop' do
  action :install
end

service 'ssh' do
  action [:enable, :start]
end'''
        
        workflow_results = {}
        
        # Step 1: Classify
        print_colored("\n🔄 Step 1: Classifying code...", Colors.YELLOW)
        start_time = time.time()
        classify_result = self.make_request("POST", "/api/v2/classify", {"code": sample_chef_code})
        
        if classify_result.get("success"):
            classification = classify_result["data"]["result"]
            print_colored(f"   ✅ Classified as: {classification.get('classification')}", Colors.GREEN)
            print_colored(f"   📊 Convertible: {classification.get('convertible')}", Colors.GREEN)
            workflow_results["classify"] = {"success": True, "data": classification}
        else:
            print_colored(f"   ❌ Classification failed: {classify_result.get('error')}", Colors.RED)
            workflow_results["classify"] = {"success": False}
            return False
        
        # Step 2: Get Context
        print_colored("\n🔄 Step 2: Getting context...", Colors.YELLOW)
        context_result = self.make_request("POST", "/api/v2/context/query", {
            "query": "Convert Chef cookbook to Ansible playbook with package installation and service management",
            "top_k": 3
        })
        
        if context_result.get("success"):
            context_data = context_result["data"]
            context_chunks = context_data.get("context", [])
            print_colored(f"   ✅ Retrieved {len(context_chunks)} context chunks", Colors.GREEN)
            
            # Combine context chunks for generation
            context_text = "\n".join([chunk.get("text", "") for chunk in context_chunks])
            workflow_results["context"] = {"success": True, "context_text": context_text}
        else:
            print_colored(f"   ❌ Context retrieval failed: {context_result.get('error')}", Colors.RED)
            context_text = "No specific context available."
            workflow_results["context"] = {"success": False, "context_text": context_text}
        
        # Step 3: Generate Playbook
        print_colored("\n🔄 Step 3: Generating Ansible playbook...", Colors.YELLOW)
        generate_result = self.make_request("POST", "/api/v2/generate", {
            "code": sample_chef_code,
            "context": context_text
        })
        
        if generate_result.get("success"):
            playbook = generate_result["data"].get("playbook", "")
            print_colored(f"   ✅ Generated playbook ({len(playbook)} chars)", Colors.GREEN)
            workflow_results["generate"] = {"success": True, "playbook": playbook}
        else:
            print_colored(f"   ❌ Generation failed: {generate_result.get('error')}", Colors.RED)
            workflow_results["generate"] = {"success": False}
            return False
        
        # Step 4: Validate Playbook
        print_colored("\n🔄 Step 4: Validating playbook...", Colors.YELLOW)
        validate_result = self.make_request("POST", "/api/v2/validate", {
            "playbook": playbook,
            "profile": "basic"
        })
        
        if validate_result.get("success"):
            validation = validate_result["data"]["result"]
            passed = validation.get("passed", False)
            issues_count = len(validation.get("issues", []))
            print_colored(f"   ✅ Validation completed: {'PASSED' if passed else 'FAILED'}", 
                         Colors.GREEN if passed else Colors.RED)
            print_colored(f"   📊 Issues found: {issues_count}", Colors.BLUE)
            workflow_results["validate"] = {"success": True, "passed": passed, "issues_count": issues_count}
        else:
            print_colored(f"   ❌ Validation failed: {validate_result.get('error')}", Colors.RED)
            workflow_results["validate"] = {"success": False}
        
        # Workflow Summary
        total_duration = time.time() - start_time
        successful_steps = sum(1 for step in workflow_results.values() if step.get("success", False))
        
        print_colored(f"\n🎯 End-to-End Workflow Summary:", Colors.BLUE)
        print_colored(f"   ✅ Successful steps: {successful_steps}/4", Colors.GREEN)
        print_colored(f"   ⏱️  Total duration: {total_duration:.2f}s", Colors.BLUE)
        
        if successful_steps == 4:
            print_colored(f"   🎉 Complete workflow SUCCESS!", Colors.GREEN)
        elif successful_steps >= 2:
            print_colored(f"   ⚠️  Partial workflow success", Colors.YELLOW)
        else:
            print_colored(f"   ❌ Workflow mostly failed", Colors.RED)
        
        self.results["end_to_end"] = {
            "workflow_results": workflow_results,
            "successful_steps": successful_steps,
            "total_duration": total_duration
        }
        
        return successful_steps >= 3
        """Test complete workflow: Classify -> Context -> Generate -> Validate"""
        print_section("END-TO-END WORKFLOW TEST")
        
        sample_chef_code = '''cookbook_file '/etc/motd' do
  source 'motd'
  mode '0644'
  owner 'root'
  group 'root'
end

package 'htop' do
  action :install
end

service 'ssh' do
  action [:enable, :start]
end'''
        
        workflow_results = {}
        
        # Step 1: Classify
        print_colored("\n🔄 Step 1: Classifying code...", Colors.YELLOW)
        start_time = time.time()
        classify_result = self.make_request("POST", "/api/v2/classify", {"code": sample_chef_code})
        
        if classify_result.get("success"):
            classification = classify_result["data"]["result"]
            print_colored(f"   ✅ Classified as: {classification.get('classification')}", Colors.GREEN)
            print_colored(f"   📊 Convertible: {classification.get('convertible')}", Colors.GREEN)
            workflow_results["classify"] = {"success": True, "data": classification}
        else:
            print_colored(f"   ❌ Classification failed: {classify_result.get('error')}", Colors.RED)
            workflow_results["classify"] = {"success": False}
            return False
        
        # Step 2: Get Context
        print_colored("\n🔄 Step 2: Getting context...", Colors.YELLOW)
        context_result = self.make_request("POST", "/api/v2/context/query", {
            "query": "Convert Chef cookbook to Ansible playbook with package installation and service management",
            "top_k": 3
        })
        
        if context_result.get("success"):
            context_data = context_result["data"]
            context_chunks = context_data.get("context", [])
            print_colored(f"   ✅ Retrieved {len(context_chunks)} context chunks", Colors.GREEN)
            
            # Combine context chunks for generation
            context_text = "\n".join([chunk.get("text", "") for chunk in context_chunks])
            workflow_results["context"] = {"success": True, "context_text": context_text}
        else:
            print_colored(f"   ❌ Context retrieval failed: {context_result.get('error')}", Colors.RED)
            context_text = "No specific context available."
            workflow_results["context"] = {"success": False, "context_text": context_text}
        
        # Step 3: Generate Playbook
        print_colored("\n🔄 Step 3: Generating Ansible playbook...", Colors.YELLOW)
        generate_result = self.make_request("POST", "/api/v2/generate", {
            "code": sample_chef_code,
            "context": context_text
        })
        
        if generate_result.get("success"):
            playbook = generate_result["data"].get("playbook", "")
            print_colored(f"   ✅ Generated playbook ({len(playbook)} chars)", Colors.GREEN)
            workflow_results["generate"] = {"success": True, "playbook": playbook}
        else:
            print_colored(f"   ❌ Generation failed: {generate_result.get('error')}", Colors.RED)
            workflow_results["generate"] = {"success": False}
            return False
        
        # Step 4: Validate Playbook
        print_colored("\n🔄 Step 4: Validating playbook...", Colors.YELLOW)
        validate_result = self.make_request("POST", "/api/v2/validate", {
            "playbook": playbook,
            "profile": "basic"
        })
        
        if validate_result.get("success"):
            validation = validate_result["data"]["result"]
            passed = validation.get("passed", False)
            issues_count = len(validation.get("issues", []))
            print_colored(f"   ✅ Validation completed: {'PASSED' if passed else 'FAILED'}", 
                         Colors.GREEN if passed else Colors.RED)
            print_colored(f"   📊 Issues found: {issues_count}", Colors.BLUE)
            workflow_results["validate"] = {"success": True, "passed": passed, "issues_count": issues_count}
        else:
            print_colored(f"   ❌ Validation failed: {validate_result.get('error')}", Colors.RED)
            workflow_results["validate"] = {"success": False}
        
        # Workflow Summary
        total_duration = time.time() - start_time
        successful_steps = sum(1 for step in workflow_results.values() if step.get("success", False))
        
        print_colored(f"\n🎯 End-to-End Workflow Summary:", Colors.BLUE)
        print_colored(f"   ✅ Successful steps: {successful_steps}/4", Colors.GREEN)
        print_colored(f"   ⏱️  Total duration: {total_duration:.2f}s", Colors.BLUE)
        
        if successful_steps == 4:
            print_colored(f"   🎉 Complete workflow SUCCESS!", Colors.GREEN)
        elif successful_steps >= 2:
            print_colored(f"   ⚠️  Partial workflow success", Colors.YELLOW)
        else:
            print_colored(f"   ❌ Workflow mostly failed", Colors.RED)
        
        self.results["end_to_end"] = {
            "workflow_results": workflow_results,
            "successful_steps": successful_steps,
            "total_duration": total_duration
        }
        
        return successful_steps >= 3

    def run_all_tests(self):
        """Run all agent tests"""
        print_colored("🚀 Starting Complete Agent Test Suite", Colors.BOLD + Colors.CYAN)
        print_colored(f"Testing against: {self.base_url}", Colors.BLUE)
        
        start_time = time.time()
        
        # Test sequence
        tests = [
            ("System Health", self.test_system_health),
            ("LlamaStack Integration", self.test_llamastack_integration),
            ("Classifier Agent", self.test_classifier_agent),
            ("Context Agent", self.test_context_agent),
            ("Code Generator Agent", self.test_code_generator_agent),
            ("Validation Agent", self.test_validation_agent),
            ("End-to-End Workflow", self.test_end_to_end_workflow),
        ]
        
        test_results = []
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                test_results.append((test_name, result))
            except Exception as e:
                print_colored(f"❌ Test '{test_name}' failed with exception: {e}", Colors.RED)
                test_results.append((test_name, False))
        
        # Final Summary
        total_duration = time.time() - start_time
        passed_tests = sum(1 for _, result in test_results if result)
        
        print_section("FINAL TEST SUMMARY")
        
        for test_name, result in test_results:
            status_icon = "✅" if result else "❌"
            color = Colors.GREEN if result else Colors.RED
            print_colored(f"{status_icon} {test_name}", color)
        
        print_colored(f"\n📊 Overall Results:", Colors.BOLD)
        print_colored(f"   Tests Passed: {passed_tests}/{len(tests)}", Colors.BLUE)
        print_colored(f"   Success Rate: {(passed_tests/len(tests)*100):.1f}%", Colors.BLUE)
        print_colored(f"   Total Duration: {total_duration:.2f}s", Colors.BLUE)
        
        if passed_tests == len(tests):
            print_colored(f"\n🎉 ALL TESTS PASSED! Your x2Ansible system is working perfectly!", Colors.GREEN + Colors.BOLD)
        elif passed_tests >= len(tests) * 0.75:
            print_colored(f"\n✅ Most tests passed! System is largely functional.", Colors.GREEN)
        elif passed_tests >= len(tests) * 0.5:
            print_colored(f"\n⚠️  Some tests failed. System has partial functionality.", Colors.YELLOW)
        else:
            print_colored(f"\n❌ Many tests failed. Please check your configuration.", Colors.RED)
        
        return passed_tests / len(tests)

def main():
    """Main function"""
    import sys
    
    # Allow custom base URL
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    
    tester = AgentTester(base_url)
    success_rate = tester.run_all_tests()
    
    # Exit with appropriate code
    exit_code = 0 if success_rate >= 0.75 else 1
    sys.exit(exit_code)

if __name__ == "__main__":
    main()