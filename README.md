# X2Ansible 🧪

**An experimental Infrastructure-as-Code transformation tool exploring the use of Agentic AI for automated code conversion.**

<img width="1077" alt="Screenshot 2025-06-01 at 10 56 47 PM" src="https://github.com/user-attachments/assets/aa25c3ca-8d9d-4020-b5ca-3ac07ab5cae0" />

## 🎯 Problem Statement

Organizations using multiple infrastructure tools face significant challenges when standardizing on a single automation platform. Consider these common scenarios:

### **The Multi-Tool Reality**
- **Legacy Systems**: Years of Chef cookbooks managing production infrastructure
- **Team Preferences**: Different teams adopted Puppet, Terraform, or CloudFormation
- **Vendor Migration**: Moving from proprietary tools to open-source alternatives
- **Platform Consolidation**: Need to standardize on Ansible for operational consistency

### **Manual Conversion Challenges**
- **Time Intensive**: Converting infrastructure code manually takes weeks or months
- **Error Prone**: Subtle logic differences between tools cause deployment failures
- **Knowledge Gaps**: Teams may not understand both source and target paradigms
- **Inconsistent Results**: Different engineers produce varying quality conversions
- **Testing Overhead**: Validating converted code requires extensive manual verification

### **Business Impact**
- **Delayed Migrations**: Projects stall due to conversion complexity
- **Resource Allocation**: Senior engineers spend time on mechanical translation tasks
- **Risk Management**: Fear of introducing bugs during manual conversion
- **Technical Debt**: Maintaining multiple toolchains increases operational overhead

### **What's Missing**
Current solutions are either:
- **Tool-Specific**: Vendor migration tools that only handle specific source/target combinations
- **Syntax-Focused**: Simple find/replace tools that miss semantic differences
- **Manual-Heavy**: Require extensive human intervention and domain expertise
- **Quality-Blind**: No automated validation of conversion results

X2Ansible explores whether AI agents can collaborate to solve these challenges by providing automated, quality-validated infrastructure code transformation across multiple tools and paradigms.

## Approach

### **Agents: Specialized AI Components**

This project implements **agents** - autonomous AI entities designed to perform specific tasks with clear responsibilities and domain expertise. X2Ansible uses five specialized agents:


#### 🔍 **ClassifierAgent** - The Analyzer
- **Role**: Infrastructure code analysis and assessment
- **Capabilities**: Tool detection, convertibility analysis, complexity evaluation
- **Decision Making**: Determines feasibility and provides conversion roadmaps
- **Context Awareness**: Understands multiple IaC paradigms and their nuances


#### 📚 **ContextAgent** - The Knowledge Retriever
- **Role**: RAG-based context retrieval and pattern matching
- **Capabilities**: Vector database search, relevant documentation lookup, best practices retrieval
- **Knowledge Base**: Searches for similar patterns, conversion examples, and domain knowledge
- **Context Enhancement**: Provides relevant background information to inform other agents

#### 🔄 **CodeGeneratorAgent** - The Transformer  
- **Role**: Semantic code translation and playbook generation
- **Capabilities**: Cross-paradigm code conversion, Ansible best practices application
- **Creative Problem Solving**: Handles complex transformations requiring domain knowledge
- **Quality Focus**: Generates clean, maintainable Ansible YAML

#### **ValidationAgent** - The Quality Assurance
- **Role**: Generated code validation and improvement suggestions
- **Capabilities**: ansible-lint integration, syntax validation, best practices checking
- **Feedback Loop**: Provides quality scores and actionable improvement recommendations
- **Standards Enforcement**: Ensures compliance with Ansible community standards

#### 🚀 **DeploymentAgent** - The Executor (In Development)
- **Role**: Safe playbook testing and deployment validation
- **Capabilities**: Test environment provisioning, execution monitoring, rollback management
- **Risk Management**: Ensures generated playbooks work as intended before production use

### **Workflows: Sequential Agent Processing**

The **workflow** concept emphasizes structured collaboration between agents. X2Ansible implements a basic version of this through a simple sequential pipeline:

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Input Code    │───▶│  Classification  │───▶│    Context       │───▶│ Code Generation │───▶│   Validation    │
│   (Any IaC)     │    │     Agent        │    │   Retrieval      │    │     Agent       │    │     Agent       │
└─────────────────┘    └──────────────────┘    └──────────────────┘    └─────────────────┘    └─────────────────┘
                              │                         │                         │                         │
                              ▼                         ▼                         ▼                         ▼
                       ┌──────────────┐         ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
                       │ Tool         │         │ RAG Search   │         │ YAML         │         │ ansible-lint │
                       │ Detection    │         │ Pattern      │         │ Generation   │         │ Validation   │
                       │ Assessment   │         │ Matching     │         │ Cleanup      │         │ Scoring      │
                       └──────────────┘         └──────────────┘         └──────────────┘         └──────────────┘
                                                                                                           │
                                                                                                           ▼
                                                                                                   ┌──────────────┐
                                                                                                   │ Deployment   │
                                                                                                   │ Agent        │
                                                                                                   │ (Planned)    │
                                                                                                   └──────────────┘
```

## 🏗️ Agent Implementation Details

### LlamaStack


<img width="739" alt="Screenshot 2025-06-01 at 11 05 46 PM" src="https://github.com/user-attachments/assets/47a050dd-7dab-4d1d-8031-85ef416ea40d" />


## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- LlamaStack server running
- ansible-lint installed (`pip install ansible-lint`)

### Installation

```bash
git clone <repository-url>
cd x2ansible
pip install -r requirements.txt
cp .env.example .env  # Configure your LlamaStack endpoint
```

### **Current Limitations**

This implementation is intentionally simple:

- **No Complex State Management**: Basic data passing between agents
- **Sequential Only**: No parallel processing or dynamic routing
- **Limited Error Recovery**: Basic try/catch, no sophisticated fallback strategies
- **No Feedback Loops**: One-way processing from input to output
- **Simple Context**: Minimal data sharing between agents

\

## ⚠️ Few things to know

This project is a **research exploration** of agent-based workflows applied to infrastructure automation:

- **Not Production Ready**: This is evolving
- **Agent Reliability**: AI agents can be unpredictable and may produce inconsistent results
- **Workflow Stability**: Multi-agent coordination is complex and may fail in unexpected ways
- **Learning Focus**: Built to understand agent collaboration, not as a commercial tool
- **Active Development**: Architecture and capabilities are rapidly evolving

## 🤝 Contribution
Interested in agent-based workflows and infrastructure automation? Contributions welcome!

### **Research Areas**
- Agent personality optimization and specialization
- Workflow orchestration patterns and best practices  
- Multi-agent coordination and communication protocols
- Human-agent collaboration interfaces
- Quality assurance and validation strategies

### **Development Focus**
- DeploymentAgent implementation and testing
- Workflow error handling and recovery mechanisms
- Agent performance monitoring and optimization
- Integration with existing DevOps toolchains
- Real-world validation and case studies

## 📚 References and Inspiration

- **LlamaStack**: Agent implementation platform
- **Infrastructure as Code**: Terraform, Chef, Puppet, Ansible documentation
- **DevOps Patterns**: Best practices for infrastructure automation
- **Multi-Agent Systems**: Academic research on agent collaboration
- **AI Workflow Research**: Papers on structured AI processing pipelines

## 📄 License

MIT License - Feel free to try, learn, and build upon this work!

## 🙏 Acknowledgments

- **DevOps Community**: For the infrastructure patterns we're trying to automate
- **Open Source Contributors**: For the tools and libraries that make this possible
- **Infrastructure Engineering Teams**: For real-world use cases and feedback




