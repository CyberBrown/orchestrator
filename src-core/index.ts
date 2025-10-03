/**
 * Generalized LLM Orchestration Framework
 *
 * Main entry point for the framework.
 * Exports all core components, types, and utilities.
 */

// Core Types
export * from "./types";

// Orchestration
export * from "./orchestrator";

// Plugins
export {
  AIProvider,
  AIProviderFactory,
  VertexAIAdapter,
  type VertexAIConfig,
} from "./plugins/ai-provider-abstraction";

export {
  DataClient,
  MockDataClient,
  SupabaseClientAdapter,
  type SupabaseConfig,
} from "./plugins/data-abstraction";

// Actions
export {
  GenericAction,
  GenericActionConfig,
  DataFetchAction,
  AIGenerationAction,
  DataTransformAction,
  ActionRegistry,
} from "./actions-template";

// Utilities
export * from "./utils";

// Version
export const VERSION = "1.0.0";
