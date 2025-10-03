# Quick Reference Guide

A concise reference for the Generalized LLM Orchestration Framework.

## 📦 Installation

```bash
npm install @llm-orchestration/core
```

## 🚀 Basic Setup

```typescript
import {
  WorkflowRunner,
  ActionRegistry,
  VertexAIAdapter,
  SupabaseClientAdapter,
  loadWorkflow,
} from "@llm-orchestration/core";

// Setup
const aiProvider = VertexAIAdapter.fromEnvironment();
const dataClient = SupabaseClientAdapter.fromEnvironment();
const actionRegistry = new ActionRegistry();

// Register actions
actionRegistry.register(new MyAction({ aiProvider, dataClient }));

// Load and execute
const workflow = await loadWorkflow("./workflow.json");
const runner = new WorkflowRunner({ actionRegistry, dataClient });
const result = await runner.execute(workflow, { input: {} });
```

## 🎯 Core Concepts

### Workflow Definition

```json
{
  "id": "my-workflow",
  "name": "My Workflow",
  "steps": [
    {
      "stepId": "step-1",
      "actionName": "my-action",
      "dependencies": [],
      "config": {}
    }
  ]
}
```

### Action Implementation

```typescript
class MyAction extends GenericAction {
  readonly id = "my-action";
  readonly name = "My Action";

  async execute(input: ActionInput): Promise<StepExecutionResult> {
    // Your logic
    return this.createSuccessResult(result);
  }
}
```

## 🔧 Common Patterns

### Fetch Data

```typescript
const data = await this.fetchData("table_name", {
  filters: { user_id: userId },
});
```

### Generate AI Content

```typescript
const content = await this.generateContent("Your prompt here", "System instruction", {
  temperature: 0.7,
  maxTokens: 1000,
});
```

### Save Data

```typescript
const saved = await this.saveData("table_name", {
  field1: "value1",
  field2: "value2",
});
```

### Get Previous Output

```typescript
const previousData = this.getPreviousOutput(input, "previous-step-id");
```

### Create Success Result

```typescript
return this.createSuccessResult({ result: "data" }, { metadata: "value" });
```

### Create Error Result

```typescript
return this.createErrorResult(
  "Error message",
  true, // retryable
);
```

## 📊 Workflow Configuration

### Basic Step

```json
{
  "stepId": "my-step",
  "actionName": "my-action",
  "displayName": "My Step"
}
```

### Step with Dependencies

```json
{
  "stepId": "step-2",
  "actionName": "action-2",
  "dependencies": ["step-1"]
}
```

### Step with Config

```json
{
  "stepId": "ai-step",
  "actionName": "ai-action",
  "config": {
    "temperature": 0.7,
    "maxTokens": 1000
  }
}
```

### Step with Retry

```json
{
  "stepId": "api-step",
  "actionName": "api-action",
  "maxRetries": 3,
  "timeout": 30000
}
```

### Human Review Step

```json
{
  "stepId": "review",
  "actionName": "review-action",
  "requiresHumanReview": true
}
```

## 🔌 Provider Setup

### Vertex AI

```typescript
const aiProvider = new VertexAIAdapter({
  projectId: "your-project",
  location: "us-central1",
  defaultModel: "gemini-1.5-pro",
});

// Or from environment
const aiProvider = VertexAIAdapter.fromEnvironment();
```

### Supabase

```typescript
const dataClient = new SupabaseClientAdapter({
  url: "https://your-project.supabase.co",
  anonKey: "your-key",
});

// Or from environment
const dataClient = SupabaseClientAdapter.fromEnvironment();
```

### Mock (Testing)

```typescript
const dataClient = new MockDataClient();
dataClient.seed("users", [{ id: "1", name: "Test" }]);
```

## 🧪 Testing

### Basic Test

```typescript
import { describe, it, expect } from "vitest";

describe("My Workflow", () => {
  it("should execute successfully", async () => {
    const result = await runner.execute(workflow, { input: {} });
    expect(result.success).toBe(true);
  });
});
```

### Test with Mocks

```typescript
const dataClient = new MockDataClient();
const actionRegistry = new ActionRegistry();

dataClient.seed("test_data", [{ id: "1" }]);
actionRegistry.register(new TestAction({ dataClient }));

const runner = new WorkflowRunner({ actionRegistry, dataClient });
const result = await runner.execute(workflow, { input: {} });
```

## 🎨 Action Templates

### Data Fetch Action

```typescript
class FetchAction extends GenericAction {
  readonly id = "fetch-action";

  async execute(input: ActionInput): Promise<StepExecutionResult> {
    const data = await this.fetchData("table", {
      filters: input.context.input,
    });
    return this.createSuccessResult(data);
  }
}
```

### AI Generation Action

```typescript
class GenerateAction extends GenericAction {
  readonly id = "generate-action";

  async execute(input: ActionInput): Promise<StepExecutionResult> {
    const prompt = this.buildPrompt(input.context.input);
    const content = await this.generateContent(prompt);
    return this.createSuccessResult({ content });
  }
}
```

### Transform Action

```typescript
class TransformAction extends GenericAction {
  readonly id = "transform-action";

  async execute(input: ActionInput): Promise<StepExecutionResult> {
    const data = this.getPreviousOutput(input, "previous-step");
    const transformed = this.transform(data);
    return this.createSuccessResult(transformed);
  }
}
```

### Save Action

```typescript
class SaveAction extends GenericAction {
  readonly id = "save-action";

  async execute(input: ActionInput): Promise<StepExecutionResult> {
    const data = this.getPreviousOutput(input, "generate-step");
    const saved = await this.saveData("results", data);
    return this.createSuccessResult(saved);
  }
}
```

## 🔄 Error Handling

### Retry Configuration

```json
{
  "stepId": "api-call",
  "maxRetries": 3,
  "timeout": 30000
}
```

### Fallback Routes

```json
{
  "fallbackMap": {
    "primary-step": "backup-step"
  }
}
```

### Error Handler

```json
{
  "errorHandler": "error-logger",
  "deadLetterHandler": "notify-admin"
}
```

### In Action

```typescript
try {
  const result = await riskyOperation();
  return this.createSuccessResult(result);
} catch (error) {
  return this.createErrorResult(
    error as Error,
    true, // retryable
  );
}
```

## 📈 State Management

### Access Workflow State

```typescript
const workflowId = input.context.workflowId;
const userId = input.context.userId;
const inputData = input.context.input;
const outputs = input.context.outputs;
const sharedState = input.context.sharedState;
```

### Update Shared State

```typescript
input.context.sharedState.myKey = "myValue";
```

### Access History

```typescript
const history = state.history;
const lastEntry = history[history.length - 1];
```

## 🔍 Debugging

### Enable Logging

```typescript
const runner = new WorkflowRunner({
  actionRegistry,
  dataClient,
  logger: {
    info: (msg, meta) => console.log("[INFO]", msg, meta),
    warn: (msg, meta) => console.warn("[WARN]", msg, meta),
    error: (msg, meta) => console.error("[ERROR]", msg, meta),
  },
});
```

### Check Execution Results

```typescript
const result = await runner.execute(workflow, { input: {} });

console.log("Success:", result.success);
console.log("Status:", result.state.status);
console.log("Steps executed:", result.metadata.stepsExecuted);
console.log("Duration:", result.metadata.durationMs);
console.log("Retries:", result.metadata.retriesPerformed);
console.log("Outputs:", result.state.context.outputs);
console.log("History:", result.state.history);
```

## 🌐 Environment Variables

```bash
# Vertex AI
GCP_PROJECT_ID=your-project-id
GCP_LOCATION=us-central1
VERTEX_DEFAULT_MODEL=gemini-1.5-pro

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 📚 Type Definitions

### WorkflowDefinition

```typescript
interface WorkflowDefinition {
  id: string;
  name: string;
  steps: WorkflowStep[];
  errorHandler?: string;
  successHandler?: string;
  deadLetterHandler?: string;
  fallbackMap?: Record<string, string>;
  config?: Record<string, unknown>;
}
```

### WorkflowStep

```typescript
interface WorkflowStep {
  stepId: string;
  actionName: string;
  displayName?: string;
  dependencies?: string[];
  config?: Record<string, unknown>;
  requiresHumanReview?: boolean;
  maxRetries?: number;
  timeout?: number;
}
```

### ActionInput

```typescript
interface ActionInput<TData = Record<string, unknown>> {
  context: WorkflowContext<TData>;
  config?: Record<string, unknown>;
  instructions?: string;
  metadata?: Record<string, unknown>;
}
```

### StepExecutionResult

```typescript
interface StepExecutionResult {
  success: boolean;
  output?: unknown;
  error?: {
    message: string;
    type?: string;
    retryable?: boolean;
  };
  metadata?: Record<string, unknown>;
}
```

## 🎯 Best Practices

1. **Always validate inputs** in actions
2. **Use descriptive step IDs** for clarity
3. **Set appropriate timeouts** for each step
4. **Configure retries** for flaky operations
5. **Use shared state** for cross-step data
6. **Log important events** for debugging
7. **Test with mocks** before production
8. **Handle errors gracefully** with fallbacks
9. **Document your actions** with clear descriptions
10. **Version your workflows** for tracking changes

## 🔗 Resources

- **Full Documentation**: `src-core/README.md`
- **Migration Guide**: `MIGRATION_GUIDE.md`
- **Complete Example**: `EXAMPLE_USAGE.md`
- **Framework Summary**: `FRAMEWORK_SUMMARY.md`
- **Tests**: `tests/core-flow.test.ts`

## 💡 Common Issues

### "Action not found"

```typescript
// Solution: Register the action
actionRegistry.register(new MyAction({ dataClient, aiProvider }));
```

### "Previous step output not found"

```typescript
// Solution: Check dependencies
{
  "stepId": "step-2",
  "dependencies": ["step-1"] // Add this
}
```

### "DataClient not configured"

```typescript
// Solution: Pass dataClient to action
new MyAction({ dataClient, aiProvider });
```

### "Workflow timeout"

```typescript
// Solution: Increase timeout
const runner = new WorkflowRunner({
  actionRegistry,
  dataClient,
  maxExecutionTime: 600000, // 10 minutes
});
```

---

**Quick Reference Version**: 1.0.0  
**Last Updated**: 2025-01-03
