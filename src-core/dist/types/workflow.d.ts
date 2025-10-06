export type WorkflowStatus = "pending" | "in_progress" | "pending_human_review" | "success" | "failed" | "timed_out" | "retrying" | "paused" | "canceled" | "validation_failed";
export interface WorkflowStep {
    stepId: string;
    actionName: string;
    displayName?: string;
    dependencies?: string[];
    config?: Record<string, unknown>;
    requiresHumanReview?: boolean;
    maxRetries?: number;
    timeout?: number;
}
export interface WorkflowHistoryEntry {
    stepId: string;
    status: WorkflowStatus;
    timestamp: string;
    notes?: Record<string, unknown>;
    error?: {
        message: string;
        type?: string;
        retryable?: boolean;
    };
}
export interface RetryState {
    attempt: number;
    maxAttempts: number;
    baseDelayMs: number;
    lastAttemptAt?: string;
    nextRetryAt?: string;
}
export interface WorkflowContext<TData = Record<string, unknown>> {
    workflowId: string;
    userId?: string;
    input: TData;
    outputs: Record<string, unknown>;
    sharedState: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}
export interface WorkflowState<TData = Record<string, unknown>> {
    workflowId: string;
    status: WorkflowStatus;
    runningStepIds: string[];
    history: WorkflowHistoryEntry[];
    retryState?: RetryState;
    lastError?: {
        message: string;
        type?: string;
        retryable?: boolean;
        validationSchema?: unknown;
        validationMessage?: string;
    };
    context: WorkflowContext<TData>;
    startedAt?: string;
    completedAt?: string;
    [key: string]: unknown;
}
export interface WorkflowDefinition {
    id: string;
    name: string;
    description?: string;
    steps: WorkflowStep[];
    errorHandler?: string;
    successHandler?: string;
    deadLetterHandler?: string;
    fallbackMap?: Record<string, string>;
    config?: Record<string, unknown>;
}
export interface StepExecutionResult {
    success: boolean;
    output?: unknown;
    error?: {
        message: string;
        type?: string;
        retryable?: boolean;
    };
    metadata?: Record<string, unknown>;
}
export interface WorkflowExecutionConfig {
    maxExecutionTime?: number;
    defaultRetry?: {
        maxAttempts: number;
        baseDelayMs: number;
    };
    persistState?: boolean;
    [key: string]: unknown;
}
//# sourceMappingURL=workflow.d.ts.map