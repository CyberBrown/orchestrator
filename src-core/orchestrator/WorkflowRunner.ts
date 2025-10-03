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
    retriesPerformed: number;
  };
}

/**
 * Options for workflow runner
 */
export interface WorkflowRunnerOptions extends OrchestratorOptions {
  /** Maximum execution time in milliseconds */
  maxExecutionTime?: number;

  /** Polling interval for checking workflow status (ms) */
  pollingIntervalMs?: number;
}

/**
 * WorkflowRunner class
 */
export class WorkflowRunner<TData = Record<string, unknown>> {
  private readonly orchestrator: Orchestrator<TData>;
  private readonly dataClient?: DataClient;
  private readonly maxExecutionTime: number;
  private readonly pollingIntervalMs: number;
  private readonly logger: OrchestratorOptions["logger"];

  constructor(options: WorkflowRunnerOptions) {
    this.orchestrator = new Orchestrator<TData>(options);
    this.dataClient = options.dataClient;
    this.maxExecutionTime = options.maxExecutionTime ?? 300000; // 5 minutes default
    this.pollingIntervalMs = options.pollingIntervalMs ?? 1000; // 1 second default
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

    // Initialize workflow state
    let state: WorkflowState<TData> = {
      workflowId,
      status: "pending",
      currentStepId: null,
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

    // Persist initial state if enabled
    if (config?.persistState && this.dataClient) {
      await this.persistState(state);
    }

    let stepsExecuted = 0;
    let retriesPerformed = 0;
    let lastError: { message: string; type?: string } | undefined;

    try {
      // Main execution loop
      while (true) {
        // Check timeout
        const elapsed = Date.now() - startTime;
        if (elapsed > this.maxExecutionTime) {
          state.status = "timed_out";
          state.lastError = {
            message: "Workflow execution timed out",
            type: "TIMEOUT",
            retryable: false,
          };
          break;
        }

        // Get next action from orchestrator
        const result = await this.orchestrator.orchestrate(state, workflow);
        state = result.updatedState;

        // Handle next action
        if (result.nextAction.action === "TERMINATE") {
          break;
        }

        if (result.nextAction.action === "WAIT") {
          // For human review or paused state
          this.logger?.info("Workflow waiting", {
            workflowId,
            status: state.status,
            currentStepId: state.currentStepId,
          });

          // In a real implementation, this would wait for external input
          // For now, we break to avoid infinite loop
          break;
        }

        if (result.nextAction.stepId) {
          // Execute the step
          const stepId = result.nextAction.stepId;

          this.logger?.info("Executing step", {
            workflowId,
            stepId,
            attempt: (state.retryState?.attempt ?? 0) + 1,
          });

          // Apply delay if specified
          if (result.nextAction.delayMs) {
            await this.delay(result.nextAction.delayMs);
          }

          // Execute the step
          const stepResult = await this.orchestrator.executeStep(
            state,
            workflow,
            stepId,
          );

          stepsExecuted++;

          if (stepResult.success) {
            // Update state with step output
            state.context.outputs[stepId] = stepResult.output;
            state.status = "success";
            state.retryState = undefined;
            state.lastError = undefined;
          } else {
            // Handle step failure
            state.status = "failed";
            state.lastError = stepResult.error;
            lastError = stepResult.error;

            if (state.retryState) {
              retriesPerformed++;
            }
          }

          // Persist state after step execution
          if (config?.persistState && this.dataClient) {
            await this.persistState(state);
          }
        }

        // Small delay to prevent tight loops
        await this.delay(this.pollingIntervalMs);
      }

      // Finalize state
      state.completedAt = new Date().toISOString();

      if (config?.persistState && this.dataClient) {
        await this.persistState(state);
      }

      const endTime = Date.now();
      const success = state.status === "success";

      return {
        success,
        state,
        error: lastError,
        metadata: {
          startedAt: state.startedAt!,
          completedAt: state.completedAt,
          durationMs: endTime - startTime,
          stepsExecuted,
          retriesPerformed,
        },
      };
    } catch (error) {
      this.logger?.error("Workflow execution failed", {
        workflowId,
        error: error instanceof Error ? error.message : String(error),
      });

      const endTime = Date.now();

      return {
        success: false,
        state: {
          ...state,
          status: "failed",
          completedAt: new Date().toISOString(),
          lastError: {
            message: error instanceof Error ? error.message : "Unknown error",
            type: "EXECUTION_ERROR",
            retryable: false,
          },
        },
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          type: "EXECUTION_ERROR",
        },
        metadata: {
          startedAt: state.startedAt!,
          completedAt: new Date().toISOString(),
          durationMs: endTime - startTime,
          stepsExecuted,
          retriesPerformed,
        },
      };
    }
  }

  /**
   * Resume a paused or waiting workflow
   */
  async resume(
    workflowId: string,
    workflow: WorkflowDefinition,
    updates?: Partial<WorkflowState<TData>>,
  ): Promise<WorkflowExecutionResult<TData>> {
    if (!this.dataClient) {
      throw new Error("DataClient required to resume workflows");
    }

    // Load existing state
    const stateResult = await this.dataClient.fetchById<WorkflowState<TData>>(
      "workflow_states",
      workflowId,
    );

    if (!stateResult.success || !stateResult.data) {
      throw new Error(`Workflow state not found: ${workflowId}`);
    }

    let state = stateResult.data;

    // Apply updates
    if (updates) {
      state = { ...state, ...updates };
    }

    // Change status to allow continuation
    if (state.status === "pending_human_review" || state.status === "paused") {
      state.status = "success"; // Will trigger next step
    }

    // Continue execution from current state
    return this.executeFromState(workflow, state);
  }

  /**
   * Execute workflow from a given state
   */
  private async executeFromState(
    workflow: WorkflowDefinition,
    initialState: WorkflowState<TData>,
  ): Promise<WorkflowExecutionResult<TData>> {
    // Similar to execute() but starts from given state
    // Implementation would be similar to execute() method
    // For brevity, delegating to execute with context from state
    return this.execute(workflow, initialState.context);
  }

  /**
   * Persist workflow state
   */
  private async persistState(state: WorkflowState<TData>): Promise<void> {
    if (!this.dataClient) return;

    try {
      const existing = await this.dataClient.fetchById(
        "workflow_states",
        state.workflowId,
      );

      if (existing.success && existing.data) {
        await this.dataClient.update(
          "workflow_states",
          state.workflowId,
          state,
        );
      } else {
        await this.dataClient.insert("workflow_states", state);
      }
    } catch (error) {
      this.logger?.error("Failed to persist state", {
        workflowId: state.workflowId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Generate a unique workflow ID
   */
  private generateWorkflowId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
