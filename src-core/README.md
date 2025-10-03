# Generalized LLM Orchestration Framework

A modular, configuration-driven framework for building multi-step LLM workflows with TypeScript, designed to be completely decoupled from specific business logic.

## 🎯 Overview

This framework provides a robust foundation for orchestrating complex AI-powered workflows with features like:

- **Configuration-Driven**: Define workflows in JSON, not code
- **Pluggable Architecture**: Swap AI providers and data sources easily
- **State Management**: Automatic state persistence and recovery
- **Error Handling**: Built-in retry logic, fallbacks, and error handlers
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Testable**: Mock implementations for all interfaces

## 📁 Project Structure

```
src-core/
├── orchestrator/           # Core orchestration engine
│   ├── Orchestrator.ts     # Main orchestration logic
│   ├── WorkflowRunner.ts   # Workflow execution engine
│   └── index.ts
├── plugins/                # Pluggable components
│   ├── ai-provider-abstraction/
│   │   ├── AIProvider.ts           # AI provider interface
│   │   ├── VertexAIAdapter.ts      # Vertex AI implementation
│   │   └── index.ts
│   └── data-abstraction/
│       ├── DataClient.ts           # Data client interface
│       ├── SupabaseClientAdapter.ts # Supabase implementation
│       └── index.ts
├── actions-template/       # Action system
│   ├── ActionRegistry.ts           # Action registration
│   ├── GenericActionTemplate.ts    # Base action class
│   └── index.ts
├── types/                  # TypeScript type definitions
│   ├── workflow.ts         # Workflow types
│   ├── action.ts           # Action types
│   ├── providers.ts        # Provider types
│   └── index.ts
├── config/                 # Configuration files
│   ├── default-workflow.json       # Example workflow
│   └── workflow-schema.json        # JSON schema
├── utils/                  # Utilities
│   ├── WorkflowLoader.ts   # Workflow loading utility
│   └── index.ts
└── index.ts                # Main entry point
```

## 🚀 Quick Start

### 1. Installation

```bash
# Install the framework (when published)
npm install @your-org/llm-orchestration-framework

# Or use locally
npm link
```

### 2. Define a Workflow

Create a workflow configuration file (`my-workflow.json`):

```json
{
  "id": "content-generation",
  "name": "Content Generation Workflow",
  "description": "Generate content using AI",
  "steps": [
    {
      "stepId": "fetch-data",
      "actionName": "data-fetch",
      "displayName": "Fetch Input Data",
      "config": {
        "table": "content_requests"
      }
    },
    {
      "stepId": "generate-content",
      "actionName": "ai-generation",
      "displayName": "Generate Content",
      "dependencies": ["fetch-data"],
      "config": {
        "temperature": 0.7,
        "maxTokens": 1000
      }
    },
    {
      "stepId": "save-result",
      "actionName": "data-save",
      "displayName": "Save Generated Content",
      "dependencies": ["generate-content"]
    }
  ],
  "errorHandler": "error-logger",
  "successHandler": "success-notifier"
}
```

### 3. Create Custom Actions

```typescript
import {
  GenericAction,
  type ActionInput,
  type StepExecutionResult,
} from "@your-org/llm-orchestration-framework";

class ContentGenerationAction extends GenericAction {
  readonly id = "ai-generation";
  readonly name = "AI Content Generation";

  async execute(input: ActionInput): Promise<StepExecutionResult> {
    try {
      // Get data from previous step
      const inputData = this.getPreviousOutput(input, "fetch-data");

      // Generate content using AI
      const content = await this.generateContent(
        `Generate content for: ${JSON.stringify(inputData)}`,
        "You are a helpful content generator",
      );

      return this.createSuccessResult({ content });
    } catch (error) {
      return this.createErrorResult(error as Error);
    }
  }
}
```

### 4. Execute the Workflow

```typescript
import {
  WorkflowRunner,
  ActionRegistry,
  VertexAIAdapter,
  SupabaseClientAdapter,
  loadWorkflow,
} from "@your-org/llm-orchestration-framework";

// Setup
const actionRegistry = new ActionRegistry();
const aiProvider = VertexAIAdapter.fromEnvironment();
const dataClient = SupabaseClientAdapter.fromEnvironment();

// Register actions
actionRegistry.register(
  new ContentGenerationAction({ aiProvider, dataClient }),
);
// ... register other actions

// Load workflow
const workflow = await loadWorkflow("./my-workflow.json");

// Create runner
const runner = new WorkflowRunner({
  actionRegistry,
  dataClient,
  maxExecutionTime: 300000,
});

// Execute
const result = await runner.execute(workflow, {
  userId: "user-123",
  input: {
    topic: "AI and Machine Learning",
    style: "technical",
  },
});

console.log("Workflow completed:", result.success);
console.log("Final outputs:", result.state.context.outputs);
```

## 🏗️ Core Concepts

### Workflows

A workflow is a sequence of steps that execute in order. Each step:

- Has a unique ID
- Executes a specific action
- Can depend on previous steps
- Passes output to subsequent steps

### Actions

Actions are the building blocks of workflows. They:

- Implement the `Action` interface
- Receive context from previous steps
- Return results for subsequent steps
- Can use AI providers and data clients

### Context Passing

Data flows between steps through the workflow context:

```typescript
// Step 1 output
{ userId: '123', data: [...] }

// Step 2 receives Step 1 output via context
input.context.outputs['step-1'] // Access previous output

// Step 2 produces its own output
{ processedData: [...], metadata: {...} }

// Step 3 can access both Step 1 and Step 2 outputs
```

### State Management

The framework automatically manages workflow state:

- Current step
- Execution history
- Retry attempts
- Error information
- All step outputs

## 🔌 Plugin System

### AI Providers

Implement the `AIProvider` interface to add new AI providers:

```typescript
import { AIProvider } from "@your-org/llm-orchestration-framework";

class OpenAIAdapter extends AIProvider {
  readonly name = "openai";
  readonly supportedModels = ["gpt-4", "gpt-3.5-turbo"];

  async generateContent(
    request: AIProviderRequest,
  ): Promise<AIProviderResponse> {
    // Implementation
  }

  async isAvailable(): Promise<boolean> {
    // Check if configured
  }
}
```

### Data Clients

Implement the `DataClient` interface for custom data sources:

```typescript
import { DataClient } from "@your-org/llm-orchestration-framework";

class MongoDBAdapter extends DataClient {
  async fetch<T>(table: string, query?: DataQuery): Promise<DataResult<T[]>> {
    // Implementation
  }

  async insert<T>(table: string, data: Partial<T>): Promise<DataResult<T>> {
    // Implementation
  }

  // ... other methods
}
```

## 🧪 Testing

The framework includes mock implementations for testing:

```typescript
import {
  MockDataClient,
  ActionRegistry,
} from "@your-org/llm-orchestration-framework";

describe("My Workflow", () => {
  it("should execute successfully", async () => {
    const dataClient = new MockDataClient();
    const actionRegistry = new ActionRegistry();

    // Seed test data
    dataClient.seed("users", [{ id: "1", name: "Test User" }]);

    // Register test actions
    actionRegistry.register(new MyTestAction({ dataClient }));

    // Execute workflow
    const runner = new WorkflowRunner({ actionRegistry, dataClient });
    const result = await runner.execute(workflow, { input: {} });

    expect(result.success).toBe(true);
  });
});
```

## 📊 Error Handling

The framework provides multiple error handling mechanisms:

### Retry Logic

```json
{
  "stepId": "api-call",
  "actionName": "external-api",
  "maxRetries": 3,
  "timeout": 30000
}
```

### Fallback Routes

```json
{
  "fallbackMap": {
    "primary-action": "backup-action",
    "ai-generation": "template-generation"
  }
}
```

### Error Handlers

```json
{
  "errorHandler": "log-error",
  "deadLetterHandler": "notify-admin"
}
```

## 🔧 Configuration

### Environment Variables

```bash
# AI Provider (Vertex AI)
GCP_PROJECT_ID=your-project-id
GCP_LOCATION=us-central1
VERTEX_DEFAULT_MODEL=gemini-1.5-pro

# Data Client (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Workflow Configuration

See `config/workflow-schema.json` for the complete schema.

## 📚 API Reference

### Core Classes

- **`Orchestrator`**: Core orchestration logic
- **`WorkflowRunner`**: Workflow execution engine
- **`ActionRegistry`**: Action management
- **`GenericAction`**: Base action class

### Interfaces

- **`Action`**: Action interface
- **`AIProvider`**: AI provider interface
- **`DataClient`**: Data client interface
- **`WorkflowDefinition`**: Workflow configuration
- **`WorkflowState`**: Workflow execution state

## 🎓 Examples

See the `tests/` directory for complete examples:

- `core-flow.test.ts`: Basic 3-step workflow
- Integration tests with mock providers
- Custom action implementations

## 🤝 Contributing

### Developer Setup

To contribute to the framework's development, navigate to the `src-core` directory and install the dependencies using `pnpm`.

```bash
# Install dependencies from the src-core directory
pnpm install
```

### Running Tests

Once dependencies are installed, you can run the test suite:

```bash
# From the src-core directory
pnpm test
```

### Extending the Framework

To extend the framework:

1. **Add a new AI provider**: Extend `AIProvider` class
2. **Add a new data client**: Extend `DataClient` class
3. **Create custom actions**: Extend `GenericAction` class
4. **Add utilities**: Place in `utils/` directory

## 📄 License

MIT License - See LICENSE file for details

## 🔗 Related Documentation

- [Architecture Overview](./docs/architecture.md)
- [Migration Guide](./docs/migration.md)
- [API Reference](./docs/api-reference.md)
- [Examples](./docs/examples.md)
