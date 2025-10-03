/**
 * Core Workflow Types for Generalized LLM Orchestration Framework
 * 
 * These types are completely decoupled from any specific business logic
 * and can be used for any multi-step content generation workflow.
 */

/**
 * Status of a workflow execution
 */
export type WorkflowStatus =
  | "pending"
  | "in_progress"
  | "pending_human_review"
  | "success"
  | "failed"
  | "timed_out"
  | "retrying"
  | "paused"
  | "canceled"
  | "validation_failed";

/**
 * Represents a single step in a workflow
 */
export interface WorkflowStep {
  /** Unique identifier for this step */
  stepId: string;
  
  /** Name of the action to execute */
  actionName: string;
  
  /** Optional display name for UI */
  displayName?: string;
  
  /** Dependencies - step IDs that must complete before this step */
  dependencies?: string[];
  
  /** Configuration specific to this step */
  config?: Record<string, unknown>;
  
  /** Whether this step requires human review */
  requiresHumanReview?: boolean;
  
  /** Maximum retry attempts for this step */
  maxRetries?: number;
  
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Represents the execution history of a workflow
 */
export interface WorkflowHistoryEntry {
  /** Step or action that was executed */
  stepId: string;
  
  /** Status after execution */
  status: WorkflowStatus;
  
  /** Timestamp of execution */
  timestamp: string;
  
  /** Optional notes or metadata */
  notes?: Record<string, unknown>;
  
  /** Error information if failed */
  error?: {
    message: string;
    type?: string;
    retryable?: boolean;
  };
}

/**
 * Retry configuration and state
 */
export interface RetryState {
  /** Current attempt number */
  attempt: number;
  
  /** Maximum attempts allowed */
  maxAttempts: number;
  
  /** Base delay in milliseconds */
  baseDelayMs: number;
  
  /** Timestamp of last attempt */
  lastAttemptAt?: string;
  
  /** Calculated next retry time */
  nextRetryAt?: string;
}

/**
 * Context passed between workflow steps
 * This is the primary mechanism for data flow between actions
 */
export interface WorkflowContext<TData = Record<string, unknown>> {
  /** Unique workflow execution ID */
  workflowId: string;
  
  /** User or tenant identifier */
  userId?: string;
  
  /** Initial input data for the workflow */
  input: TData;
  
  /** Outputs from completed steps, keyed by stepId */
  outputs: Record<string, unknown>;
  
  /** Shared state accessible to all steps */
  sharedState: Record<string, unknown>;
  
  /** Metadata about the workflow execution */
  metadata?: Record<string, unknown>;
}

/**
 * Complete state of a workflow execution
 */
export interface WorkflowState<TData = Record<string, unknown>> {
  /** Unique identifier for this workflow execution */
  workflowId: string;
  
  /** Current execution status */
  status: WorkflowStatus;
  
  /** ID of the currently executing step */
  currentStepId: string | null;
  
  /** Execution history */
  history: WorkflowHistoryEntry[];
  
  /** Retry state if applicable */
  retryState?: RetryState;
  
  /** Last error encountered */
  lastError?: {
    message: string;
    type?: string;
    retryable?: boolean;
    validationSchema?: unknown;
    validationMessage?: string;
  };
  
  /** Workflow context with data */
  context: WorkflowContext<TData>;
  
  /** Timestamp when workflow started */
  startedAt?: string;
  
  /** Timestamp when workflow completed */
  completedAt?: string;
  
  /** Additional custom state */
  [key: string]: unknown;
}

/**
 * Definition of a complete workflow
 */
export interface WorkflowDefinition {
  /** Unique workflow identifier */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Description of what this workflow does */
  description?: string;
  
  /** Ordered list of steps to execute */
  steps: WorkflowStep[];
  
  /** Step to execute on error */
  errorHandler?: string;
  
  /** Step to execute on success */
  successHandler?: string;
  
  /** Step to execute for unrecoverable failures */
  deadLetterHandler?: string;
  
  /** Fallback mappings for specific steps */
  fallbackMap?: Record<string, string>;
  
  /** Global configuration */
  config?: Record<string, unknown>;
}

/**
 * Result of workflow step execution
 */
export interface StepExecutionResult {
  /** Whether the step succeeded */
  success: boolean;
  
  /** Output data from the step */
  output?: unknown;
  
  /** Error if step failed */
  error?: {
    message: string;
    type?: string;
    retryable?: boolean;
  };
  
  /** Metadata about execution */
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for workflow execution
 */
export interface WorkflowExecutionConfig {
  /** Maximum total execution time in milliseconds */
  maxExecutionTime?: number;
  
  /** Default retry configuration */
  defaultRetry?: {
    maxAttempts: number;
    baseDelayMs: number;
  };
  
  /** Whether to persist state after each step */
  persistState?: boolean;
  
  /** Custom configuration */
  [key: string]: unknown;
}