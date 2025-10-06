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
    };
}
export interface WorkflowRunnerOptions extends OrchestratorOptions {
    maxExecutionTime?: number;
}
export declare class WorkflowRunner<TData extends Record<string, unknown> = Record<string, unknown>> {
    private readonly orchestrator;
    private readonly dataClient?;
    private readonly maxExecutionTime;
    private readonly logger;
    constructor(options: WorkflowRunnerOptions);
    execute(workflow: WorkflowDefinition, initialContext: Partial<WorkflowContext<TData>>, _config?: WorkflowExecutionConfig): Promise<WorkflowExecutionResult<TData>>;
    private generateWorkflowId;
}
//# sourceMappingURL=WorkflowRunner.d.ts.map