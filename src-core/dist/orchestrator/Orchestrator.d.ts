import type { WorkflowDefinition, WorkflowState, WorkflowStatus, StepExecutionResult } from "../types/workflow";
import type { ActionRegistry } from "../types/action";
import type { DataClient } from "../types/providers";
export interface OrchestrationResult<TData = Record<string, unknown>> {
    nextAction: {
        stepIds?: string[];
        action?: "WAIT" | "TERMINATE" | "RETRY" | "ERROR";
        delayMs?: number;
        instructions?: string;
        metadata?: Record<string, unknown>;
    };
    updatedState: WorkflowState<TData>;
}
export interface OrchestratorOptions {
    dataClient?: DataClient;
    actionRegistry: ActionRegistry;
    persistState?: boolean;
    logger?: {
        info: (message: string, meta?: Record<string, unknown>) => void;
        warn: (message: string, meta?: Record<string, unknown>) => void;
        error: (message: string, meta?: Record<string, unknown>) => void;
    };
}
export declare class Orchestrator<TData extends Record<string, unknown> = Record<string, unknown>> {
    private readonly actionRegistry;
    private readonly dataClient?;
    private readonly persistState;
    private readonly logger;
    constructor(options: OrchestratorOptions);
    orchestrate(state: Readonly<WorkflowState<TData>>, workflow: Readonly<WorkflowDefinition>): Promise<OrchestrationResult<TData>>;
    executeStep(state: WorkflowState<TData>, workflow: WorkflowDefinition, stepId: string): Promise<StepExecutionResult>;
    appendHistory(state: WorkflowState<TData>, stepId: string, status: WorkflowStatus, notes?: Record<string, unknown>): void;
    private handlePaused;
    private handleCanceled;
    private handleHumanReview;
    private handleInProgress;
    private handleFailure;
    private handleSuccess;
    private handlePending;
    private findRunnableSteps;
}
//# sourceMappingURL=Orchestrator.d.ts.map