import type { WorkflowDefinition, WorkflowState, WorkflowContext, WorkflowExecutionConfig } from "../types/workflow";
import { type OrchestratorOptions } from "./Orchestrator";
export interface WorkflowExecutionResult<TData = Record<string, unknown>> {
    success: boolean;
    state: WorkflowState<TData>;
    error?: {
        message: string;
        type?: string;
    };
    metadata: {
        startedAt: string;
        completedAt: string;
        durationMs: number;
        stepsExecuted: number;
        retriesPerformed: number;
    };
}
export interface WorkflowRunnerOptions extends OrchestratorOptions {
    maxExecutionTime?: number;
    pollingIntervalMs?: number;
}
export declare class WorkflowRunner<TData = Record<string, unknown>> {
    private readonly orchestrator;
    private readonly dataClient?;
    private readonly maxExecutionTime;
    private readonly pollingIntervalMs;
    private readonly logger;
    constructor(options: WorkflowRunnerOptions);
    execute(workflow: WorkflowDefinition, initialContext: Partial<WorkflowContext<TData>>, config?: WorkflowExecutionConfig): Promise<WorkflowExecutionResult<TData>>;
    resume(workflowId: string, workflow: WorkflowDefinition, updates?: Partial<WorkflowState<TData>>): Promise<WorkflowExecutionResult<TData>>;
    private executeFromState;
    private persistState;
    private generateWorkflowId;
    private delay;
}
//# sourceMappingURL=WorkflowRunner.d.ts.map