/**
 * WorkflowRunner - Executes complete workflows from start to finish
 *
 * This class manages the full lifecycle of workflow execution,
 * coordinating between the Orchestrator and action execution.
 */

import type {
  WorkflowDefinition,
  WorkflowState,
  WorkflowContext,
  WorkflowExecutionConfig,
  StepExecutionResult,
} from "../types/workflow";
import type { DataClient } from "../types/providers";
import { Orchestrator, type OrchestratorOptions } from "./Orchestrator";

/**
 * Result of workflow execution
 */
export interface WorkflowExecutionResult<TData = Record<string, unknown>> {
  /** Whether the workflow completed successfully */
  success: boolean;

  /** Final workflow state */
  state: WorkflowState<TData>;

  /** Error if workflow failed */
  error?: {
    message: string;
    type?: string;
  };

  /** Execution metadata */
  metadata: {
    startedAt: string;
    completedAt: string;
    durationMs: number;
    stepsExecuted: number;
  };
}

/**
 * Options for workflow runner
 */
export interface WorkflowRunnerOptions extends OrchestratorOptions {
  /** Maximum execution time in milliseconds */
  maxExecutionTime?: number;
}

/**
 * WorkflowRunner class
 */
export class WorkflowRunner<TData = Record<string, unknown>> {
  private readonly orchestrator: Orchestrator<TData>;
  private readonly dataClient?: DataClient;
  private readonly maxExecutionTime: number;
  private readonly logger: OrchestratorOptions["logger"];

  constructor(options: WorkflowRunnerOptions) {
    this.orchestrator = new Orchestrator<TData>(options);
    this.dataClient = options.dataClient;
    this.maxExecutionTime = options.maxExecutionTime ?? 300000; // 5 minutes default
    this.logger = options.logger ?? console;
  }

  /**
   * Execute a workflow from start to finish
   */
  async execute(
    workflow: WorkflowDefinition,
    initialContext: Partial<WorkflowContext<TData>>,
    config?: WorkflowExecutionConfig,
  ): Promise<WorkflowExecutionResult<TData>> {
    const startTime = Date.now();
    const workflowId = initialContext.workflowId ?? this.generateWorkflowId();

    let state: WorkflowState<TData> = {
      workflowId,
      status: "pending",
      runningStepIds: [],
      history: [],
      context: {
        workflowId,
        userId: initialContext.userId,
        input: (initialContext.input ?? {}) as TData,
        outputs: initialContext.outputs ?? {},
        sharedState: initialContext.sharedState ?? {},
        metadata: initialContext.metadata,
      },
      startedAt: new Date().toISOString(),
    };

    let stepsExecuted = 0;

    try {
      while (true) {
        const elapsed = Date.now() - startTime;
        if (elapsed > this.maxExecutionTime) {
          state.status = "timed_out";
          state.lastError = { message: "Workflow execution timed out", type: "TIMEOUT" };
          break;
        }

        const orchestrationResult = await this.orchestrator.orchestrate(state, workflow);
        state = orchestrationResult.updatedState;

        const { nextAction } = orchestrationResult;

        if (nextAction.action === "TERMINATE" || nextAction.action === "WAIT") {
          break;
        }

        if (nextAction.stepIds && nextAction.stepIds.length > 0) {
          const stepPromises = nextAction.stepIds.map(stepId =>
            this.orchestrator.executeStep(state, workflow, stepId).then(result => ({ stepId, result }))
          );

          const results = await Promise.all(stepPromises);

          let batchFailed = false;
          for (const { stepId, result } of results) {
            stepsExecuted++;
            if (result.success) {
              state.context.outputs[stepId] = result.output;
              this.orchestrator.appendHistory(state, stepId, "success");
            } else {
              batchFailed = true;
              state.lastError = result.error;
              this.orchestrator.appendHistory(state, stepId, "failed", { error: result.error });
              // In a parallel execution, we fail the entire workflow if one step fails.
              // More sophisticated strategies could be implemented in the future.
              break; 
            }
          }

          // Update state after batch execution
          state.runningStepIds = [];
          state.status = batchFailed ? "failed" : "success";

          if (batchFailed) {
            // If a batch fails, we go back to the orchestrator to decide what to do next (e.g., error handler)
            const failureResult = await this.orchestrator.orchestrate(state, workflow);
            state = failureResult.updatedState;
            if (failureResult.nextAction.action === "TERMINATE") break;
          }
        }
      }

      const endTime = Date.now();
      state.completedAt = new Date().toISOString();

      return {
        success: state.status === "success",
        state,
        error: state.lastError,
        metadata: {
          startedAt: state.startedAt!,
          completedAt: state.completedAt,
          durationMs: endTime - startTime,
          stepsExecuted,
        },
      };
    } catch (error) {
      this.logger?.error("Workflow execution failed unexpectedly", { workflowId, error });
      // ... error handling ...
      throw error;
    }
  }

  private generateWorkflowId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}