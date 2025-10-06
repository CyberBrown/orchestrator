/**
 * Action Types for Generalized LLM Orchestration Framework
 *
 * Actions are the building blocks of workflows - they perform specific tasks
 * and can be composed into complex multi-step processes.
 */

import type { WorkflowContext, StepExecutionResult } from "./workflow";

/**
 * Input provided to an action during execution
 */
export interface ActionInput<TData = Record<string, unknown>> {
  /** Current workflow context */
  context: WorkflowContext<TData>;

  /** Configuration for this specific action execution */
  config?: Record<string, unknown>;

  /** Additional instructions (e.g., from retry logic) */
  instructions?: string;

  /** Metadata about the execution */
  metadata?: Record<string, unknown>;
}

/**
 * Base interface that all actions must implement
 */
export interface Action<TInput = Record<string, unknown>, _TOutput = unknown> {
  /** Unique identifier for this action */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Description of what this action does */
  readonly description?: string;

  /**
   * Execute the action
   * @param input - Input data and context
   * @returns Result of execution
   */
  execute(input: ActionInput<TInput>): Promise<StepExecutionResult>;

  /**
   * Validate input before execution (optional)
   * @param input - Input to validate
   * @returns Validation result
   */
  validate?(input: ActionInput<TInput>): Promise<{
    valid: boolean;
    errors?: string[];
  }>;

  /**
   * Clean up resources after execution (optional)
   */
  cleanup?(): Promise<void>;
}

/**
 * Registry for managing actions
 */
export interface ActionRegistry {
  /**
   * Register an action
   * @param action - Action to register
   */
  register(action: Action): void;

  /**
   * Get an action by ID
   * @param actionId - ID of the action
   * @returns The action or undefined
   */
  get(actionId: string): Action | undefined;

  /**
   * Check if an action is registered
   * @param actionId - ID to check
   */
  has(actionId: string): boolean;

  /**
   * Get all registered action IDs
   */
  list(): string[];

  /**
   * Unregister an action
   * @param actionId - ID of action to remove
   */
  unregister(actionId: string): boolean;
}

/**
 * Factory for creating actions
 */
export interface ActionFactory {
  /**
   * Create an action instance
   * @param actionId - ID of the action to create
   * @param config - Configuration for the action
   */
  create(actionId: string, config?: Record<string, unknown>): Action | undefined;
}

/**
 * Metadata about an action's execution
 */
export interface ActionExecutionMetadata {
  /** Action ID */
  actionId: string;

  /** Start timestamp */
  startedAt: string;

  /** End timestamp */
  completedAt?: string;

  /** Duration in milliseconds */
  durationMs?: number;

  /** Number of retry attempts */
  retryAttempts?: number;

  /** Custom metadata */
  [key: string]: unknown;
}
