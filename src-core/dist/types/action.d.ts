import type { WorkflowContext, StepExecutionResult } from "./workflow";
export interface ActionInput<TData = Record<string, unknown>> {
    context: WorkflowContext<TData>;
    config?: Record<string, unknown>;
    instructions?: string;
    metadata?: Record<string, unknown>;
}
export interface Action<TInput = Record<string, unknown>, TOutput = unknown> {
    readonly id: string;
    readonly name: string;
    readonly description?: string;
    execute(input: ActionInput<TInput>): Promise<StepExecutionResult>;
    validate?(input: ActionInput<TInput>): Promise<{
        valid: boolean;
        errors?: string[];
    }>;
    cleanup?(): Promise<void>;
}
export interface ActionRegistry {
    register(action: Action): void;
    get(actionId: string): Action | undefined;
    has(actionId: string): boolean;
    list(): string[];
    unregister(actionId: string): boolean;
}
export interface ActionFactory {
    create(actionId: string, config?: Record<string, unknown>): Action | undefined;
}
export interface ActionExecutionMetadata {
    actionId: string;
    startedAt: string;
    completedAt?: string;
    durationMs?: number;
    retryAttempts?: number;
    [key: string]: unknown;
}
//# sourceMappingURL=action.d.ts.map