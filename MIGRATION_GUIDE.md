# Migration Guide: From Brand Kit to Generalized Framework

This guide helps you migrate from the existing Brand Kit orchestration system to the new generalized LLM orchestration framework.

## Overview of Changes

### Before (Brand Kit Specific)

```typescript
// lib/orchestrator.ts
export interface BrandWorkflowState {
  task_id: string;
  status: OrchestratorStatus;
  current_agent: string | null;
  data_payload: {
    brandName?: string;
    research?: { content: string; approved: boolean };
    // ... brand-specific fields
  };
}
```

### After (Generalized)

```typescript
// src-core/types/workflow.ts
export interface WorkflowState<TData = Record<string, unknown>> {
  workflowId: string;
  status: WorkflowStatus;
  currentStepId: string | null;
  context: WorkflowContext<TData>;
  // ... generic fields
}
```

## Key Mapping

| Old Concept             | New Concept        | Notes                     |
| ----------------------- | ------------------ | ------------------------- |
| `task_id`               | `workflowId`       | Renamed for clarity       |
| `current_agent`         | `currentStepId`    | More generic terminology  |
| `data_payload`          | `context`          | Structured context object |
| Agent                   | Action             | Actions are more generic  |
| `brand_summaries` table | Generic table name | Configurable per workflow |

## Step-by-Step Migration

### 1. Update Workflow Configuration

**Before:**

```json
{
  "sequence": ["Agent1_Analyst", "Agent2_BrandStrategist", "Agent3_BrandConsultant"],
  "error_handler": "Agent_Error_Logger",
  "success_handler": "Agent_Completion_Notifier"
}
```

**After:**

```json
{
  "id": "brand-identity-workflow",
  "name": "Brand Identity Workflow",
  "steps": [
    {
      "stepId": "analyst",
      "actionName": "research-action",
      "displayName": "Research & Analysis"
    },
    {
      "stepId": "strategist",
      "actionName": "synthesis-action",
      "displayName": "Brand Strategy",
      "dependencies": ["analyst"]
    },
    {
      "stepId": "consultant",
      "actionName": "interview-action",
      "displayName": "Brand Consultation",
      "dependencies": ["strategist"]
    }
  ],
  "errorHandler": "error-logger",
  "successHandler": "completion-notifier"
}
```

### 2. Convert Agents to Actions

**Before (Agent):**

```typescript
// lib/agents/registry.ts
Agent1_Analyst: {
  promptType: "brand_identity_research",
  outputKey: "research",
  buildPayload: (state) => ({
    brandName: state.data_payload?.brandName,
    brandUrl: state.data_payload?.brandUrl,
  }),
}
```

**After (Action):**

```typescript
// your-project/actions/ResearchAction.ts
import { GenericAction } from "@llm-orchestration/core";

export class ResearchAction extends GenericAction {
  readonly id = "research-action";
  readonly name = "Research & Analysis";

  async execute(input: ActionInput): Promise<StepExecutionResult> {
    try {
      const { brandName, brandUrl } = input.context.input;

      // Fetch data
      const data = await this.fetchData("brands", {
        name: brandName,
      });

      // Generate research using AI
      const research = await this.generateContent(
        `Research brand: ${brandName} at ${brandUrl}`,
        "You are a brand research analyst",
      );

      return this.createSuccessResult({ research, data });
    } catch (error) {
      return this.createErrorResult(error as Error);
    }
  }
}
```

### 3. Update Database Interactions

**Before:**

```typescript
// app/actions/brand-kit/generate-attribute-summary.ts
import { createClient } from "@/lib/supabase/server";

const supabase = createClient();
const { data } = await supabase.from("brand_attributes").select("*").eq("user_id", userId);
```

**After:**

```typescript
// Use DataClient abstraction
const attributes = await this.fetchData("brand_attributes", {
  user_id: userId,
});
```

### 4. Update AI Provider Calls

**Before:**

```typescript
// Direct Vertex AI call
import { VertexAIProvider } from "@/lib/ai-providers/vertex-ai";

const provider = new VertexAIProvider();
const response = await provider.generateContent({
  prompt: myPrompt,
  modelId: "gemini-1.5-pro",
});
```

**After:**

```typescript
// Use AIProvider abstraction
const content = await this.generateContent(myPrompt, systemInstruction, {
  modelId: "gemini-1.5-pro",
  temperature: 0.7,
});
```

### 5. Update State Management

**Before:**

```typescript
const state: BrandWorkflowState = {
  task_id: "task-123",
  status: "in_progress",
  current_agent: "Agent1_Analyst",
  data_payload: {
    brandName: "Acme Corp",
    research: { content: "...", approved: false },
  },
};
```

**After:**

```typescript
const state: WorkflowState = {
  workflowId: "wf-123",
  status: "in_progress",
  currentStepId: "analyst",
  context: {
    workflowId: "wf-123",
    userId: "user-123",
    input: {
      brandName: "Acme Corp",
    },
    outputs: {
      analyst: { research: "...", approved: false },
    },
    sharedState: {},
  },
};
```

## Migration Checklist

- [ ] Create new workflow configuration JSON file
- [ ] Convert all agents to actions
- [ ] Update database table references
- [ ] Replace direct Supabase calls with DataClient
- [ ] Replace direct AI provider calls with AIProvider
- [ ] Update state management code
- [ ] Update error handling
- [ ] Update retry logic configuration
- [ ] Test with mock providers
- [ ] Update integration tests
- [ ] Update documentation

## Compatibility Layer (Optional)

If you need to maintain backward compatibility, create adapter actions:

```typescript
// adapters/BrandKitAdapter.ts
export class BrandKitAgentAdapter extends GenericAction {
  constructor(
    private agentDefinition: AgentDefinition,
    config: GenericActionConfig,
  ) {
    super(config);
  }

  async execute(input: ActionInput): Promise<StepExecutionResult> {
    // Convert new format to old format
    const oldPayload = this.agentDefinition.buildPayload?.(this.convertToOldState(input));

    // Execute using old logic
    // ...

    // Convert result back to new format
    return this.createSuccessResult(result);
  }

  private convertToOldState(input: ActionInput): any {
    // Conversion logic
  }
}
```

## Benefits of Migration

1. **Decoupling**: No longer tied to brand-specific logic
2. **Reusability**: Actions can be used in any workflow
3. **Testability**: Mock providers make testing easier
4. **Flexibility**: Easy to swap AI providers or databases
5. **Maintainability**: Clear separation of concerns
6. **Scalability**: Framework can handle any workflow type

## Common Issues

### Issue: "Action not found"

**Solution**: Ensure all actions are registered before executing workflow:

```typescript
actionRegistry.register(new ResearchAction({ dataClient, aiProvider }));
```

### Issue: "Previous step output not found"

**Solution**: Check step dependencies in workflow configuration:

```json
{
  "stepId": "step-2",
  "dependencies": ["step-1"]
}
```

### Issue: "DataClient not configured"

**Solution**: Pass dataClient when creating actions:

```typescript
new MyAction({ dataClient, aiProvider });
```

## Support

For questions or issues during migration:

- Check the [README](./src-core/README.md)
- Review [examples](./tests/core-flow.test.ts)
- Open an issue on GitHub

## Timeline

Recommended migration approach:

1. **Week 1**: Set up new framework alongside existing code
2. **Week 2**: Migrate one workflow as proof of concept
3. **Week 3**: Migrate remaining workflows
4. **Week 4**: Remove old orchestration code
5. **Week 5**: Final testing and documentation
