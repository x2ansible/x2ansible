# X2Ansible 🧪

**A fun experimental project that converts Infrastructure-as-Code to Ansible using LlamaStack agents.**

X2Ansible is an experimental automation tool that uses LlamaStack agents to analyze and convert infrastructure code from various tools (Chef, Puppet, Terraform, etc.) into Ansible playbooks. This is a learning project exploring AI-powered code transformation - use at your own risk! 😄

## ✨ What This Experiment Does

### 🧠 **Code Analysis**
- **Tool Detection**: Tries to figure out if your code is Chef, Puppet, Terraform, etc.
- **Smart Analysis**: Uses LlamaStack agents to understand what the code actually does
- **Convertibility Check**: Attempts to determine if it can be turned into Ansible
- **Pattern Recognition**: Fast detection with confidence scoring (sometimes works great!)

### 🔄 **Playbook Generation**
- **YAML Output**: Generates Ansible playbooks that might actually work
- **Handler Magic**: Automatically tries to create missing handler sections
- **Clean Output**: Strips away markdown artifacts (most of the time)
- **Best Effort**: Follows Ansible conventions when the AI cooperates

### ✅ **Playbook Validation**
- **ansible-lint Integration**: Runs ansible-lint on generated playbooks
- **Quality Scoring**: Reports lint issues and suggestions for improvement
- **Syntax Validation**: Catches common YAML and Ansible syntax errors
- **Best Practices Check**: Validates against Ansible community standards

### 🚀 **Deployment (Work in Progress)**
- **Test Environments**: (🚧 Coming Soon) Spin up test VMs/containers
- **Playbook Execution**: (🚧 WIP) Actually run the generated playbooks
- **Validation Testing**: (🚧 Planned) Verify the playbooks do what they're supposed to
- **Rollback Capability**: (🚧 Future) Safe testing with automatic cleanup

### ⚡ **Experimental Features**
- **Hybrid Approach**: Combines pattern matching with AI analysis
- **Dynamic Config**: Change agent behavior via YAML files
- **Detailed Logging**: See what's happening under the hood
- **Error Recovery**: Multiple fallbacks when things go wrong (which they sometimes do!)

## 🏗️ How It Works

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web UI        │───▶│  Classification  │───▶│ Code Generation │───▶│   Validation    │
│  (FastAPI)      │    │     Agent        │    │     Agent       │    │     Agent       │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └─────────────────┘
                              │                         │                         │
                              ▼                         ▼                         ▼
                       ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
                       │ LlamaStack   │         │ LlamaStack   │         │ ansible-lint │
                       │ Analysis     │         │ YAML Gen     │         │ Validation   │
                       └──────────────┘         └──────────────┘         └──────────────┘
                                                                                 │
                                                                                 ▼
                                                                         ┌──────────────┐
                                                                         │ Deployment   │
                                                                         │ Agent (WIP)  │
                                                                         └──────────────┘
```

### What's Inside

1. **ClassifierAgent**: Tries to figure out what your code is and if it's convertible
2. **CodeGeneratorAgent**: Attempts to turn it into an Ansible playbook
3. **ValidationAgent**: Runs ansible-lint to check the generated playbook quality
4. **DeploymentAgent**: (🚧 Work in Progress) Will eventually deploy/test the playbooks
5. **FastAPI Backend**: Simple web interface to try it out
6. **LlamaStack**: Does the heavy lifting (when it works correctly)

## 🚀 Try It Out

### What You Need

- Python 3.11+ 
- A running LlamaStack server
- ansible-lint installed (`pip install ansible-lint`)
- Some patience (AI can be unpredictable!)

### Setup

```bash
# Get the code
git clone <repository-url>
cd x2ansible

# Install stuff
pip install -r requirements.txt

# Make sure ansible-lint is available
ansible-lint --version

# Configure (copy and edit the example)
cp .env.example .env
```

### Running

```bash
# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 3000

# Open in browser and experiment!
open http://localhost:3000
```

## ⚠️ Disclaimer

This is an **experimental project** for learning and fun! 

- **Not production ready** - Please don't use this in production environments
- **Results may vary** - AI agents can be unpredictable
- **No guarantees** - Generated playbooks might need manual fixes
- **Learning project** - Built to explore LlamaStack capabilities
- **Use at your own risk** - Always review generated code before using

## 📋 API Usage

### Classification Endpoint

```bash
POST /classify
Content-Type: application/json

{
  "code": "cookbook_file '/etc/nginx/nginx.conf' do\n  source 'nginx.conf.erb'\n  notifies :restart, 'service[nginx]'\nend"
}
```

**Response:**

```json
{
  "classification": "chef",
  "summary": "Chef cookbook for nginx configuration management",
  "convertible": true,
  "convertibility_confidence": 0.95,
  "ansible_approach": "Use ansible.builtin.copy for config, ansible.builtin.service for management",
  "required_modules": ["ansible.builtin.copy", "ansible.builtin.service"],
  "conversion_steps": [
    "Convert cookbook_file to ansible.builtin.copy with content",
    "Map service notifications to handlers with proper syntax"
  ],
  "complexity_level": "Medium",
  "duration_ms": 1250.5,
  "speedup": 336.0,
  "validation_results": {
    "ansible_lint_score": 8.5,
    "issues_found": 2,
    "warnings": ["Could use FQCN for copy module"],
    "errors": [],
    "passed_validation": true
  },
  "deployment_status": "pending"  // WIP - not implemented yet
}
```

### Code Generation

The system automatically uses classification results to generate Ansible playbooks:

```yaml
---
- name: Configure nginx
  hosts: all
  become: yes
  tasks:
    - name: Copy nginx configuration
      copy:
        content: |
          # nginx configuration content
        dest: /etc/nginx/nginx.conf
      notify: restart nginx
      
    - name: Start and enable nginx
      service:
        name: nginx
        state: started
        enabled: yes

  handlers:
    - name: restart nginx
      service:
        name: nginx
        state: restarted
```

## 🎯 Supported Input Formats

### Chef
```ruby
cookbook_file '/etc/app/config.conf' do
  source 'config.conf.erb'
  mode '0644'
  notifies :restart, 'service[app]'
end

service 'app' do
  action [:enable, :start]
end
```

### Puppet
```puppet
package { 'nginx':
  ensure => installed,
}

service { 'nginx':
  ensure => running,
  enable => true,
  require => Package['nginx'],
}
```

### Terraform
```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1d0"
  instance_type = "t2.micro"
  
  tags = {
    Name = "WebServer"
  }
}
```

### CloudFormation
```yaml
Resources:
  WebServer:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-0c55b159cbfafe1d0
      InstanceType: t2.micro
```

## 🔧 Advanced Configuration

### Agent Instructions

Customize agent behavior via `config/agents.yaml`:

```yaml
agents:
  classifier:
    instructions: |
      You are an expert Infrastructure-as-Code analyst...
      
      CONVERTIBILITY ASSESSMENT FRAMEWORK:
      - Focus on semantic understanding of operations
      - Consider Ansible's extensive module ecosystem
      - Provide detailed conversion reasoning
      
  code_generator:
    instructions: |
      You are an expert Ansible automation engineer...
      
      CRITICAL REQUIREMENTS:
      - Generate pure YAML (no markdown)
      - Auto-generate handlers for notify statements
      - Follow Ansible best practices
```

### Environment Variables

```bash
# LlamaStack Configuration
REMOTE_BASE_URL=http://localhost:5000
MODEL_ID=llama-3.1-70b

# Generation Parameters
TEMPERATURE=0.0
MAX_TOKENS=4096
STREAM=False

# Vector DB (if using RAG)
VDB_EMBEDDING=sentence-transformers/all-MiniLM-L6-v2
VDB_EMBEDDING_DIMENSION=384
VDB_PROVIDER=milvus
```

## 📊 How Well Does It Work?

**Honestly?** It depends! 😅

### Current Pipeline Success Rates

- **Tool Detection**: Usually pretty good (90%+ for obvious cases)
- **Conversion Success**: Varies wildly (60-90% depending on complexity)
- **ansible-lint Validation**: About 70% pass without issues
- **Deployment Testing**: 🚧 Not implemented yet - coming soon!
- **Speed**: Much faster than doing it manually (when it works)

### Rough Performance

| Tool | Detection Rate | Conversion Success | Lint Pass Rate | Manual Fix Needed |
|------|---------------|-------------------|----------------|-------------------|
| Chef | ~95% | ~85% | ~75% | Sometimes |
| Puppet | ~90% | ~80% | ~70% | Often |
| Terraform | ~85% | ~70% | ~65% | Usually |
| CloudFormation | ~80% | ~75% | ~70% | Sometimes |

*Results based on limited testing - your mileage may vary!*

### Validation Pipeline

The system now includes a validation step that:
- ✅ Runs `ansible-lint` on generated playbooks
- ✅ Reports syntax errors and best practice violations
- ✅ Provides quality scores (0-10 scale)
- ✅ Suggests improvements
- 🚧 Will eventually auto-fix common issues (planned)

## 🛠️ What Can Go Wrong

### Common Issues You Might Hit

**"Agent Not Available"**
- Your LlamaStack server probably isn't running
- Check your .env configuration
- The agents might have crashed (it happens!)

**"ansible-lint Failures"**
- Generated playbooks might not follow all best practices
- Common issues: missing FQCN, deprecated syntax, formatting
- Usually easy to fix based on lint suggestions
- The ValidationAgent reports these but doesn't auto-fix (yet)

**"Weird YAML Output"**
- The AI sometimes gets creative with formatting
- The cleaning functions try to fix it, but aren't perfect
- You might need to manually clean up the output

**"Missing Handlers"**
- The system tries to auto-generate them
- But sometimes the AI forgets anyway
- Usually easy to fix manually

**"Deployment Agent Not Working"**
- 🚧 Because it's not implemented yet!
- This is actively being worked on
- For now, you'll need to test playbooks manually

**"Completely Wrong Output"**
- AI agents can hallucinate or misunderstand
- Try again with different input
- Or manually guide it with better context

### Debug Tips

```python
# Enable verbose logging to see what's happening
logging.getLogger("ClassifierAgent").setLevel(logging.DEBUG)
logging.getLogger("CodeGeneratorAgent").setLevel(logging.DEBUG)
```

## 🤝 Want to Contribute?

This is a fun learning project, so contributions are welcome! 

### Getting Started

```bash
# Fork it, clone it, hack on it!
pip install -r requirements-dev.txt
pytest tests/  # Run what tests exist
```

### Ideas for Improvements

- Better error handling (there's never enough!)
- Support for more tools (Helm, Vagrant, etc.)
- Improved AI prompting (always room for improvement)
- Better YAML cleaning (the current approach is... creative)
- **ValidationAgent improvements** (auto-fix lint issues)
- **DeploymentAgent completion** (the big missing piece!)
- **Test environment provisioning** (Docker/Vagrant integration)
- **Playbook execution and verification** (end-to-end testing)
- More test cases (we definitely need more)
- UI improvements (it's pretty basic right now)

### Code Style

- Try to follow PEP 8 (but don't stress too much)
- Add comments for weird/complex stuff
- Test your changes if possible
- Have fun with it!

## 🎯 What's Next?

This is just an experiment, but some ideas for the future:

### 🚧 **Currently in Progress**
- **DeploymentAgent**: The missing piece for end-to-end testing
- **Test Environment Integration**: Docker/Vagrant support for safe playbook testing
- **Execution Validation**: Actually run the playbooks and verify they work

### 💡 **Future Ideas**
- **Better Tool Support**: More comprehensive pattern detection
- **Smarter AI**: Better prompting and error recovery
- **Auto-fix Validation**: Let the ValidationAgent fix ansible-lint issues automatically
- **Testing Framework**: Automated validation of generated playbooks
- **Web UI Polish**: Make it look less like a prototype
- **Documentation**: More examples and use cases
- **CI/CD Integration**: Maybe turn it into a proper tool someday?



But for now, it's just a fun project to explore what's possible with LlamaStack! 🧪

## 📄 License

MIT License - do whatever you want with it!

## 🙏 Acknowledgments

- **LlamaStack**: For making AI agents accessible
- **FastAPI**: For the easy web framework
- **The Internet**: For Stack Overflow answers when things broke

---

**Built for fun and learning with LlamaStack** 🦙

*This is an experimental project - use it, break it, fix it, improve it!*