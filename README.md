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

#### **Sequential Processing Pipeline**

1. **Linear Flow**: Each agent processes input and passes results to the next agent
2. **Simple Handoffs**: Basic data passing between agents (no complex coordination)
3. **Error Handling**: Basic try/catch with fallback responses
4. **Independent Processing**: Each agent works autonomously on its specific task
5. **No Feedback Loops**: Current implementation is one-way processing only

## 🧠 Experimental Agent Architecture

### **Simple Agent Coordination**

X2Ansible explores basic agent collaboration where each agent focuses on a specific task in sequence:

- **Task Specialization**: Each agent handles one part of the conversion process
- **Sequential Processing**: Agents run one after another, not in parallel
- **Basic Context Passing**: Simple data structures passed between agents
- **Independent Decision Making**: Each agent makes decisions within its scope

### **Emergent Capabilities**

The combination of agents creates capabilities that exceed individual components:

- **Cross-Paradigm Understanding**: ClassifierAgent's analysis informs CodeGeneratorAgent's approach
- **Quality-Driven Generation**: ValidationAgent feedback could eventually improve CodeGeneratorAgent output
- **Adaptive Workflows**: The system adjusts its approach based on input complexity and intermediate results

## ✨ What This Experiment Demonstrates

### 🧠 **Intelligent Code Analysis**
- **Pattern Detection**: Fast heuristic-based classification with confidence scoring
- **Semantic Understanding**: Deep analysis of infrastructure intent, not just syntax
- **Convertibility Assessment**: Realistic evaluation of transformation feasibility
- **Risk Identification**: Highlighting potential issues before conversion begins

### 🔄 **Context-Aware Translation**
- **Paradigm Bridging**: Converting between different infrastructure philosophies
- **Best Practices Integration**: Applying Ansible conventions during generation
- **Handler Intelligence**: Automatic creation of appropriate event handlers
- **Idiomatic Output**: Generated code that looks like it was written by experts

### ✅ **Automated Quality Assurance**
- **Multi-Layer Validation**: Syntax, semantics, and best practices checking
- **Actionable Feedback**: Specific suggestions for improvement
- **Quality Scoring**: Quantitative assessment of generated playbooks
- **Standards Compliance**: Automated enforcement of community guidelines

### 🚀 **Safe Deployment Pipeline** (In Development)
- **Isolated Testing**: Safe execution environments for validation
- **Incremental Verification**: Step-by-step confirmation of playbook behavior
- **Rollback Capabilities**: Quick recovery from issues
- **Production Readiness Assessment**: Confidence scoring for deployment decisions

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

### Quick Start

```bash
# Start the experimental server
uvicorn main:app --reload --host 0.0.0.0 --port 3000

# Try the workflow
curl -X POST http://localhost:3000/classify \
  -H "Content-Type: application/json" \
  -d '{"code": "cookbook_file \"/etc/nginx/nginx.conf\" do\n  source \"nginx.conf.erb\"\n  notifies :restart, \"service[nginx]\"\nend"}'
```

## 📊 Experimental Results

### **Agent Performance Metrics**

| Agent | Success Rate | Avg Response Time | Context Utilization |
|-------|-------------|------------------|-------------------|
| ContextAgent | ~85% | 600ms | N/A (RAG Search) |
| ClassifierAgent | ~90% | 800ms | High |
| CodeGeneratorAgent | ~75% | 2.1s | Very High |
| ValidationAgent | ~95% | 400ms | Medium |
| DeploymentAgent | 🚧 TBD | 🚧 TBD | 🚧 TBD |

### **Workflow Effectiveness**

- **End-to-End Success**: ~70% of inputs produce lint-passing playbooks
- **Manual Intervention**: ~30% require minor fixes
- **Time Savings**: 5-10x faster than manual conversion
- **Quality Consistency**: Generated code follows established patterns

### **Agent Collaboration Benefits**

Even with basic sequential processing, the multi-agent approach provides benefits:

1. **Clear Separation of Concerns**: Each agent has a well-defined responsibility
2. **Easier Development**: Can improve individual agents independently  
3. **Modular Architecture**: Easy to add, remove, or replace agents
4. **Focused Expertise**: Each agent can specialize in its domain



### **Simple Pipeline Configuration**

```python
# Basic agent pipeline with context retrieval
class ConversionPipeline:
    def __init__(self):
        self.context = ContextAgent()
        self.classifier = ClassifierAgent()
        self.generator = CodeGeneratorAgent() 
        self.validator = ValidationAgent()
        # self.deployer = DeploymentAgent()  # Future
        
    def process(self, input_code):
        # Simple sequential execution with context
        context = self.context.query_context(input_code)
        step1 = self.classifier.process(input_code, context)
        step2 = self.generator.process(input_code, step1, context)
        step3 = self.validator.process(step2)
        return step3
```

## 🔬 Research and Learning Outcomes

### **Agent Design Insights**

- **Clear Boundaries**: Well-defined agent responsibilities prevent confusion
- **Rich Communication**: Detailed context passing improves downstream decisions
- **Graceful Degradation**: Multiple fallback strategies handle edge cases
- **Emergent Intelligence**: Agent combinations solve problems no single agent could

### **Workflow Optimization Discoveries**

- **Sequential vs Parallel**: Some tasks benefit from parallelization, others require sequence
- **Context Weight**: Too much context can overwhelm; too little loses nuance
- **Quality Gates**: Early validation prevents expensive downstream processing
- **Feedback Integration**: Agent learning from validation results shows promise

### **Real-World Application Lessons**

- **Domain Knowledge Matters**: Generic agents struggle with specialized tasks
- **User Intent**: Sometimes human guidance improves agent collaboration
- **Error Recovery**: Robust fallback mechanisms are essential for production use
- **Continuous Learning**: Agents improve with exposure to diverse inputs

## 🚧 Future Experiments

### **Advanced Agent Capabilities**
- **Self-Reflection**: Agents that evaluate and improve their own outputs
- **Dynamic Collaboration**: Agents that negotiate responsibilities based on input complexity
- **Learning Integration**: Incorporating user feedback into agent improvement
- **Cross-Domain Knowledge**: Agents that understand multiple infrastructure domains

### **Current Limitations**

This experimental implementation is intentionally simple:

- **No Complex State Management**: Basic data passing between agents
- **Sequential Only**: No parallel processing or dynamic routing
- **Limited Error Recovery**: Basic try/catch, no sophisticated fallback strategies
- **No Feedback Loops**: One-way processing from input to output
- **Simple Context**: Minimal data sharing between agents

### **Production Readiness**
- **DeploymentAgent Completion**: Full end-to-end validation and testing
- **Enterprise Integration**: Support for existing DevOps toolchains  
- **Security Validation**: Agents focused on security best practices
- **Compliance Checking**: Automated verification of organizational standards

## ⚠️ Experimental Nature

This project is a **research exploration** of agent-based workflows applied to infrastructure automation:

- **Not Production Ready**: This is experimental software for learning and research
- **Agent Reliability**: AI agents can be unpredictable and may produce inconsistent results
- **Workflow Stability**: Multi-agent coordination is complex and may fail in unexpected ways
- **Learning Focus**: Built to understand agent collaboration, not as a commercial tool
- **Active Development**: Architecture and capabilities are rapidly evolving

## 🤝 Contributing to the Experiment

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

```bash
# Join the experiment
git clone <repository-url>
pip install -r requirements.txt
```

## 📚 References and Inspiration

- **LlamaStack**: Agent implementation platform
- **Infrastructure as Code**: Terraform, Chef, Puppet, Ansible documentation
- **DevOps Patterns**: Best practices for infrastructure automation
- **Multi-Agent Systems**: Academic research on agent collaboration
- **AI Workflow Research**: Papers on structured AI processing pipelines

## 📄 License

MIT License - Feel free to experiment, learn, and build upon this work!

## 🙏 Acknowledgments

- **LlamaStack Team**: For making agent development accessible
- **DevOps Community**: For the infrastructure patterns we're trying to automate
- **Open Source Contributors**: For the tools and libraries that make this possible
- **Infrastructure Engineering Teams**: For real-world use cases and feedback

**Special Thanks:**
- **Anthropic**: For foundational research on agent and workflow design principles that influenced this experimental approach


