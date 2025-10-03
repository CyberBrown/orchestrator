/**
 * Generalized Orchestrator for LLM Workflows
 *
 * This orchestrator manages the execution of multi-step workflows,
 * handling state transitions, retries, error handling, and human review points.
 *
 * Completely decoupled from any specific business logic.
 */

import type {
  WorkflowDefinition,
  WorkflowState,
  WorkflowStatus,
  WorkflowHistoryEntry,
  StepExecutionResult,
  WorkflowStep,
} from "../types/workflow";
import type { ActionRegistry } from "../types/action";
import type { DataClient } from "../types/providers";

/**
 * Result of orchestration decision
 */
export interface OrchestrationResult<TData = Record<string, unknown>> {
  /** Next action to take */
  nextAction: {
    /** Step IDs to execute */
    stepIds?: string[];

    /** Special action (WAIT, TERMINATE, etc.) */
    action?: "WAIT" | "TERMINATE" | "RETRY" | "ERROR";

    /** Delay before next action (ms) */
    delayMs?: number;

    /** Instructions for the next step */
    instructions?: string;

    /** Metadata */
    metadata?: Record<string, unknown>;
  };

  /** Updated workflow state */
  updatedState: WorkflowState<TData>;
}

/**
 * Options for orchestrator
 */
export interface OrchestratorOptions {
  /** Data client for persistence */
  dataClient?: DataClient;

  /** Action registry */
  actionRegistry: ActionRegistry;

  /** Enable automatic state persistence */
  persistState?: boolean;

  /** Custom logger */
  logger?: {
    info: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
  };
}

/**
 * Terminal statuses that end workflow execution
 */
const _TERMINAL_STATUSES = new Set<WorkflowStatus>(["success", "failed", "timed_out", "canceled"]);

/**
 * Core Orchestrator class
 */
export class Orchestrator<TData extends Record<string, unknown> = Record<string, unknown>> {
  private readonly actionRegistry: ActionRegistry;
  private readonly dataClient?: DataClient;
  private readonly persistState: boolean;
  private readonly logger: OrchestratorOptions["logger"];

  constructor(options: OrchestratorOptions) {
    this.actionRegistry = options.actionRegistry;
    this.dataClient = options.dataClient;
    this.persistState = options.persistState ?? false;
    this.logger = options.logger ?? console;
  }

  /**
   * Main orchestration method - determines next action based on current state
   */
  async orchestrate(
    state: Readonly<WorkflowState<TData>>,
    workflow: Readonly<WorkflowDefinition>,
  ): Promise<OrchestrationResult<TData>> {
    // Create mutable copy of state
    const currentState: WorkflowState<TData> = {
      ...state,
      history: [...state.history],
      runningStepIds: [...state.runningStepIds],
      context: {
        ...state.context,
        outputs: { ...state.context.outputs },
        sharedState: { ...state.context.sharedState },
      },
    };

    // Handle different workflow states
    switch (currentState.status) {
      case "paused":
        return this.handlePaused(currentState);
      case "canceled":
        return this.handleCanceled(currentState);
      case "pending_human_review":
        return this.handleHumanReview(currentState);
      case "in_progress":
        return this.handleInProgress(currentState);
      case "failed":
      case "timed_out":
        return this.handleFailure(currentState, workflow);
      case "success":
        return this.handleSuccess(currentState, workflow);
      case "pending":
        return this.handlePending(currentState, workflow);
      default:
        // For retrying, validation_failed, etc. we simplify for now
        return this.handleFailure(currentState, workflow);
    }
  }

  /**
   * Execute a workflow step
   */
  async executeStep(
    state: WorkflowState<TData>,
    workflow: WorkflowDefinition,
    stepId: string,
  ): Promise<StepExecutionResult> {
    const step = workflow.steps.find((s) => s.stepId === stepId);
    if (!step) {
      return {
        success: false,
        error: {
          message: `Step not found: ${stepId}`,
          type: "STEP_NOT_FOUND",
          retryable: false,
        },
      };
    }

    const action = this.actionRegistry.get(step.actionName);
    if (!action) {
      return {
        success: false,
        error: {
          message: `Action not found: ${step.actionName}`,
          type: "ACTION_NOT_FOUND",
          retryable: false,
        },
      };
    }

    try {
      if (action.validate) {
        const validation = await action.validate({
          context: state.context,
          config: step.config,
        });
        if (!validation.valid) {
          return {
            success: false,
            error: {
              message: `Validation failed: ${validation.errors?.join(", ")}`,
              type: "VALIDATION_ERROR",
              retryable: false,
            },
          };
        }
      }
      return await action.execute({
        context: state.context,
        config: step.config,
      });
    } catch (error) {
      this.logger?.error("Step execution failed", {
        stepId,
        actionName: step.actionName,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          type: "EXECUTION_ERROR",
          retryable: true,
        },
      };
    }
  }

  /**
   * Appends an entry to the workflow's history.
   * This should be called by the runner after a step completes or fails.
   */
  public appendHistory(
    state: WorkflowState<TData>,
    stepId: string,
    status: WorkflowStatus,
    notes?: Record<string, unknown>,
  ): void {
    const entry: WorkflowHistoryEntry = {
      stepId,
      status,
      timestamp: new Date().toISOString(),
      ...(notes ? { notes } : {}),
    };
    state.history.push(entry);
  }

  // State handlers

  private handlePaused(state: WorkflowState<TData>): OrchestrationResult<TData> {
    return { nextAction: { action: "WAIT" }, updatedState: state };
  }

  private handleCanceled(state: WorkflowState<TData>): OrchestrationResult<TData> {
    return { nextAction: { action: "TERMINATE" }, updatedState: state };
  }

  private handleHumanReview(state: WorkflowState<TData>): OrchestrationResult<TData> {
    return { nextAction: { action: "WAIT" }, updatedState: state };
  }

  private handleInProgress(state: WorkflowState<TData>): OrchestrationResult<TData> {
    // If in progress, it means we are waiting for running steps to complete.
    return { nextAction: { action: "WAIT" }, updatedState: state };
  }

  private handleFailure(
    state: WorkflowState<TData>,
    workflow: WorkflowDefinition,
  ): OrchestrationResult<TData> {
    // Simplified failure handling for now. No complex retry/fallback for parallel execution.
    const errorHandlerStepId = workflow.deadLetterHandler ?? workflow.errorHandler;
    if (errorHandlerStepId) {
      return {
        nextAction: { stepIds: [errorHandlerStepId] },
        updatedState: { ...state, runningStepIds: [errorHandlerStepId] },
      };
    }
    return { nextAction: { action: "TERMINATE" }, updatedState: state };
  }

  private handleSuccess(
    state: WorkflowState<TData>,
    workflow: WorkflowDefinition,
  ): OrchestrationResult<TData> {
    const runnableSteps = this.findRunnableSteps(workflow, state);

    if (runnableSteps.length > 0) {
      return {
        nextAction: { stepIds: runnableSteps },
        updatedState: {
          ...state,
          runningStepIds: runnableSteps,
          status: "in_progress",
        },
      };
    }

    const allStepsFinished = workflow.steps.every((step) =>
      state.history.some((h) => h.stepId === step.stepId && h.status === "success"),
    );

    if (allStepsFinished) {
      if (workflow.successHandler) {
        return {
          nextAction: { stepIds: [workflow.successHandler] },
          updatedState: { ...state, runningStepIds: [workflow.successHandler] },
        };
      }
      return {
        nextAction: { action: "TERMINATE" },
        updatedState: {
          ...state,
          status: "success",
          runningStepIds: [],
          completedAt: new Date().toISOString(),
        },
      };
    }

    // If there are no more runnable steps but the workflow is not complete,
    // it could be a deadlock or waiting for external input.
    return { nextAction: { action: "WAIT" }, updatedState: state };
  }

  private handlePending(
    state: WorkflowState<TData>,
    workflow: WorkflowDefinition,
  ): OrchestrationResult<TData> {
    const runnableSteps = this.findRunnableSteps(workflow, state);
    if (runnableSteps.length === 0) {
      return {
        nextAction: { action: "TERMINATE" },
        updatedState: {
          ...state,
          status: "failed",
          lastError: {
            message: "No initial steps found in workflow",
            type: "CONFIGURATION_ERROR",
          },
        },
      };
    }

    return {
      nextAction: { stepIds: runnableSteps },
      updatedState: {
        ...state,
        runningStepIds: runnableSteps,
        status: "in_progress",
        startedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Finds all steps that are ready to be executed based on their dependencies.
   */
  private findRunnableSteps(workflow: WorkflowDefinition, state: WorkflowState<TData>): string[] {
    const completedStepIds = new Set(
      state.history.filter((h) => h.status === "success").map((h) => h.stepId),
    );
    const runningStepIds = new Set(state.runningStepIds);

    const runnableSteps: string[] = [];

    for (const step of workflow.steps) {
      if (completedStepIds.has(step.stepId) || runningStepIds.has(step.stepId)) {
        continue;
      }

      const dependencies = step.dependencies ?? [];
      const dependenciesMet = dependencies.every((depId) => completedStepIds.has(depId));

      if (dependenciesMet) {
        runnableSteps.push(step.stepId);
      }
    }
    return runnableSteps;
  }
}
