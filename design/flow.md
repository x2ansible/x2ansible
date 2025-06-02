# Agent Architecture & Data Flow

## Overview

The x2Ansible platform uses a **stateless microservices architecture** where specialized agents handle different aspects of infrastructure code conversion. The **React frontend orchestrates the entire workflow** by managing state and coordinating agent interactions through a step-by-step process.

## Agent Responsibilities

| Agent | Purpose | Input | Output | Tools Used |
|-------|---------|-------|--------|------------|
| **ClassifierAgent** | Semantic analysis & convertibility assessment | Raw infrastructure code | Classification metadata | LlamaStack Agent |
| **ContextAgent** | Knowledge retrieval & documentation lookup | Raw infrastructure code | Relevant context & examples | LlamaStack Agent (builtin::rag) |
| **CodeGeneratorAgent** | Ansible playbook generation | Original code + context + classification | Generated Ansible YAML | LlamaStack Agent |
| **ValidationAgent** | Ansible playbook validation & analysis | Generated Ansible playbook | Validation results & recommendations | LlamaStack Agent (custom:lint) |

## Frontend State Management Architecture

### React Hook-Based State Management

The frontend uses a custom `useWorkflowState` hook that maintains all workflow data:

```typescript
interface WorkflowState {
  currentStep: number;                    // Current workflow step (0-4)
  stepResults: Map<number, WorkflowStepResult>; // Results from each agent
  stepLogs: Map<number, string[]>;        // Logs for each step
  lastModified: number;                   // Timestamp for state changes
}
```

### Step-by-Step Data Flow

**Step 0: Code Input & Classification**
```typescript
// useClassification.ts manages ClassifierAgent interaction
const classifyCode = async (input: string) => {
  const response = await fetch("/api/classify", {
    method: "POST", 
    body: JSON.stringify({ code: input })  // Original user code
  });
  setClassificationResult(response.data);  // Frontend stores result
};
```

**Step 1: Context Retrieval**  
```typescript
// useContextRetrieval.ts manages ContextAgent interaction
const retrieveContext = async (code: string, top_k: number = 5) => {
  const response = await fetch("/api/context/query", {
    method: "POST",
    body: JSON.stringify({ query: code, top_k }) // Same original code
  });
  setContextResult(result);  // Frontend stores context
};
```

**Step 2: Code Generation**
```typescript
// Frontend combines all previous results for CodeGeneratorAgent
const generateCode = async () => {
  const response = await fetch("/api/generate", {
    method: "POST",
    body: JSON.stringify({
      code: originalCode,              // Original user code
      context: contextResult,          // From Step 1
      classification: classificationResult // From Step 0
    })
  });
};
```

**Step 3: Validation**
```typescript
// Frontend sends generated code to ValidationAgent
const validateCode = async (generatedPlaybook: string) => {
  const response = await fetch("/api/validate", {
    method: "POST",
    body: JSON.stringify({ code: generatedPlaybook }) // Generated Ansible code
  });
};
```

## Detailed Agent Interactions

### 1. Code Classification

**Frontend Hook:** `useClassification`  
**Endpoint:** `POST /api/classify`

```python
@router.post("/classify")
async def classify_code(request: ClassifyRequest):
    result = classifier_agent.classify_and_summarize(request.code)
    return result
```

**ClassifierAgent Process:**
- Creates isolated LlamaStack session: `"semantic_analysis"`
- Analyzes infrastructure operations semantically 
- Returns structured classification with convertibility assessment
- Session terminates, no state persisted

### 2. Context Retrieval

**Frontend Hook:** `useContextRetrieval`  
**Endpoint:** `POST /api/context/query`

```python
@router.post("/context/query")
async def get_context(request: ContextRequest):
    result = context_agent.query_context(request.query)
    return result
```

**ContextAgent Process:**
- Receives same original code as ClassifierAgent
- Creates session: `f"context_session_{uuid.uuid4()}"`
- Uses RAG tool to search vector database
- Extracts and filters relevant documentation chunks
- Returns context list, session terminates

### 3. Code Generation

**Endpoint:** `POST /api/generate`

**CodeGeneratorAgent Process:**
- Receives original code + context from frontend state
- Creates session: `"code_generation"`
- Combines inputs using structured prompt
- Generates clean Ansible YAML using `_clean_playbook_output()`
- Returns formatted playbook, session terminates

### 4. Validation

**Endpoint:** `POST /api/validate`

**ValidationAgent Process:**
- Receives generated Ansible playbook (not original code)
- Creates session: `f"ansible-validation-{counter}"`
- Uses `ansible_lint_tool` for validation
- Employs `EventLogger` for reliable tool response parsing
- Returns comprehensive validation analysis

## Key Architectural Decisions

### Why Frontend State Orchestration?

1. **Complete Workflow Control**: React components manage the entire conversion pipeline
2. **Progressive Disclosure**: Users see results at each step via `WorkflowStateIndicator`
3. **Flexible Navigation**: Users can navigate between steps using `WorkflowActions`
4. **Configuration Management**: Step-specific settings via `WorkflowSidebar`

### Frontend State Persistence Pattern

```typescript
// Frontend maintains all workflow data
const saveStepResult = useCallback((result) => {
  setWorkflowState(prev => {
    const newResults = new Map(prev.stepResults);
    newResults.set(prev.currentStep, {
      ...result,
      stepIndex: prev.currentStep,
      timestamp: Date.now()
    });
    return { ...prev, stepResults: newResults };
  });
}, []);
```

### Agent Session Isolation

Each agent interaction creates independent sessions:

```python
# ClassifierAgent
session_id = self.agent.create_session("semantic_analysis")

# ContextAgent  
session_id = self.agent.create_session(f"context_session_{uuid.uuid4()}")

# CodeGeneratorAgent
session_id = self.agent.create_session("code_generation")

# ValidationAgent
session_name = f"ansible-validation-{self.session_counter}"
session_id = self.agent.create_session(session_name)
```

### Component Architecture

- **`useWorkflowState`**: Central state management hook
- **`WorkflowSidebar`**: Step-specific configuration panels  
- **`WorkflowActions`**: Step execution and navigation controls
- **`WorkflowStateIndicator`**: Progress tracking and reset functionality
- **`ClassificationPanel`**: Rich display of analysis results

## Data Flow Summary

```
User Input Code → Frontend State
     ↓
Step 0: ClassifierAgent(original_code) → Classification
     ↓  
Step 1: ContextAgent(original_code) → Context  
     ↓
Step 2: CodeGeneratorAgent(original_code + context + classification) → Ansible
     ↓
Step 3: ValidationAgent(generated_ansible) → Validation
     ↓
Frontend State → Complete Workflow Results
```

**Key Points:**
- Frontend is the **primary state holder** throughout the entire workflow
- Agents are **stateless services** that process inputs and return results
- Each API call is **independent** with no cross-agent communication
- Users can **navigate freely** between completed steps
- **Progressive enhancement** allows partial workflow completion
