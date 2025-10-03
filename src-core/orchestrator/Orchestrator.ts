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
  RetryState,
  StepExecutionResult,
} from '../types/workflow';
import type { ActionRegistry } from '../types/action';
import type { DataClient } from '../types/providers';

/**
 * Result of orchestration decision
 */
export interface OrchestrationResult<TData = Record<string, unknown>> {
  /** Next action to take */
  nextAction: {
    /** Step ID to execute */
    stepId?: string;
    
    /** Special action (WAIT, TERMINATE, etc.) */
    action?: 'WAIT' | 'TERMINATE' | 'RETRY' | 'ERROR';
    
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
const TERMINAL_STATUSES = new Set<WorkflowStatus>([
  'success',
  'failed',
  'timed_out',
  'canceled',
]);

/**
 * Statuses that should be logged to history
 */
const LOGGABLE_STATUSES = new Set<WorkflowStatus>([
  'success',
  'failed',
  'timed_out',
  'retrying',
  'paused',
  'canceled',
  'validation_failed',
]);

/**
 * Core Orchestrator class
 */
export class Orchestrator<TData = Record<string, unknown>> {
  private readonly actionRegistry: ActionRegistry;
  private readonly dataClient?: DataClient;
  private readonly persistState: boolean;
  private readonly logger: OrchestratorOptions['logger'];

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
    workflow: Readonly<WorkflowDefinition>
  ): Promise<OrchestrationResult<TData>> {
    // Create mutable copy of state
    const currentState: WorkflowState<TData> = {
      ...state,
      history: [...state.history],
      context: {
        ...state.context,
        outputs: { ...state.context.outputs },
        sharedState: { ...state.context.sharedState },
      },
    };

    // Log status changes to history
    if (LOGGABLE_STATUSES.has(currentState.status)) {
      this.appendHistory(currentState, currentState.status);
    }

    // Handle different workflow states
    switch (currentState.status) {
      case 'paused':
        return this.handlePaused(currentState);
      
      case 'canceled':
        return this.handleCanceled(currentState);
      
      case 'retrying':
        return this.handleRetrying(currentState, workflow);
      
      case 'validation_failed':
        return this.handleValidationFailed(currentState, workflow);
      
      case 'pending_human_review':
        return this.handleHumanReview(currentState);
      
      case 'in_progress':
        return this.handleInProgress(currentState);
      
      case 'failed':
      case 'timed_out':
        return this.handleFailure(currentState, workflow);
      
      case 'success':
        return this.handleSuccess(currentState, workflow);
      
      case 'pending':
        return this.handlePending(currentState, workflow);
      
      default:
        return this.handleUnknownStatus(currentState, workflow);
    }
  }

  /**
   * Execute a workflow step
   */
  async executeStep(
    state: WorkflowState<TData>,
    workflow: WorkflowDefinition,
    stepId: string
  ): Promise<StepExecutionResult> {
    const step = workflow.steps.find(s => s.stepId === stepId);
    if (!step) {
      return {
        success: false,
        error: {
          message: `Step not found: ${stepId}`,
          type: 'STEP_NOT_FOUND',
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
          type: 'ACTION_NOT_FOUND',
          retryable: false,
        },
      };
    }

    try {
      // Validate input if action supports it
      if (action.validate) {
        const validation = await action.validate({
          context: state.context,
          config: step.config,
        });
        
        if (!validation.valid) {
          return {
            success: false,
            error: {
              message: `Validation failed: ${validation.errors?.join(', ')}`,
              type: 'VALIDATION_ERROR',
              retryable: false,
            },
          };
        }
      }

      // Execute the action
      const result = await action.execute({
        context: state.context,
        config: step.config,
      });

      return result;
    } catch (error) {
      this.logger?.error('Step execution failed', {
        stepId,
        actionName: step.actionName,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          type: 'EXECUTION_ERROR',
          retryable: true,
        },
      };
    }
  }

  /**
   * Persist workflow state if enabled
   */
  private async persistStateIfEnabled(state: WorkflowState<TData>): Promise<void> {
    if (!this.persistState || !this.dataClient) {
      return;
    }

    try {
      await this.dataClient.update('workflow_states', state.workflowId, state);
    } catch (error) {
      this.logger?.error('Failed to persist state', {
        workflowId: state.workflowId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // State handlers

  private handlePaused(state: WorkflowState<TData>): OrchestrationResult<TData> {
    return {
      nextAction: { action: 'WAIT' },
      updatedState: state,
    };
  }

  private handleCanceled(state: WorkflowState<TData>): OrchestrationResult<TData> {
    return {
      nextAction: { action: 'TERMINATE' },
      updatedState: state,
    };
  }

  private handleRetrying(
    state: WorkflowState<TData>,
    workflow: WorkflowDefinition
  ): OrchestrationResult<TData> {
    const nextStepId = state.currentStepId ?? this.getFirstStep(workflow)?.stepId;
    
    return {
      nextAction: {
        stepId: nextStepId,
        metadata: { reason: 'retry' },
      },
      updatedState: {
        ...state,
        status: 'in_progress',
      },
    };
  }

  private handleValidationFailed(
    state: WorkflowState<TData>,
    workflow: WorkflowDefinition
  ): OrchestrationResult<TData> {
    const instructions = state.lastError?.validationMessage ?? 
      'Previous output was invalid. Please regenerate following the required schema.';
    
    return {
      nextAction: {
        stepId: state.currentStepId ?? this.getFirstStep(workflow)?.stepId,
        instructions,
        metadata: { reason: 'validation_failed' },
      },
      updatedState: {
        ...state,
        status: 'in_progress',
      },
    };
  }

  private handleHumanReview(state: WorkflowState<TData>): OrchestrationResult<TData> {
    return {
      nextAction: { action: 'WAIT' },
      updatedState: state,
    };
  }

  private handleInProgress(state: WorkflowState<TData>): OrchestrationResult<TData> {
    return {
      nextAction: { action: 'WAIT' },
      updatedState: state,
    };
  }

  private handleFailure(
    state: WorkflowState<TData>,
    workflow: WorkflowDefinition
  ): OrchestrationResult<TData> {
    // Check if we should retry
    if (this.shouldRetry(state, workflow)) {
      const { delayMs, retryState } = this.calculateBackoff(state);
      
      return {
        nextAction: {
          stepId: state.currentStepId ?? this.getFirstStep(workflow)?.stepId,
          delayMs,
          metadata: { reason: 'automatic_retry', attempt: retryState.attempt },
        },
        updatedState: {
          ...state,
          status: 'in_progress',
          retryState,
        },
      };
    }

    // Check for fallback
    const fallbackStepId = this.resolveFallback(state, workflow);
    if (fallbackStepId) {
      return {
        nextAction: {
          stepId: fallbackStepId,
          metadata: { reason: 'fallback_route' },
        },
        updatedState: {
          ...state,
          currentStepId: fallbackStepId,
          status: 'in_progress',
          retryState: undefined,
        },
      };
    }

    // Use error handler
    const errorHandlerStepId = workflow.deadLetterHandler ?? workflow.errorHandler;
    if (errorHandlerStepId) {
      return {
        nextAction: {
          stepId: errorHandlerStepId,
          metadata: { reason: state.status },
        },
        updatedState: {
          ...state,
          currentStepId: errorHandlerStepId,
        },
      };
    }

    // No recovery possible
    return {
      nextAction: { action: 'TERMINATE' },
      updatedState: state,
    };
  }

  private handleSuccess(
    state: WorkflowState<TData>,
    workflow: WorkflowDefinition
  ): OrchestrationResult<TData> {
    // If we're at the success handler, terminate
    if (state.currentStepId === workflow.successHandler) {
      return {
        nextAction: { action: 'TERMINATE' },
        updatedState: {
          ...state,
          completedAt: new Date().toISOString(),
        },
      };
    }

    // Find next step
    const nextStep = this.findNextStep(workflow, state.currentStepId);
    
    if (!nextStep) {
      // No more steps, go to success handler
      const successHandlerStepId = workflow.successHandler;
      
      if (!successHandlerStepId) {
        // No success handler, just terminate
        return {
          nextAction: { action: 'TERMINATE' },
          updatedState: {
            ...state,
            completedAt: new Date().toISOString(),
          },
        };
      }

      return {
        nextAction: { stepId: successHandlerStepId },
        updatedState: {
          ...state,
          currentStepId: successHandlerStepId,
        },
      };
    }

    // Check if next step requires human review
    const requiresReview = nextStep.requiresHumanReview ?? false;
    
    return {
      nextAction: requiresReview ? { action: 'WAIT' } : { stepId: nextStep.stepId },
      updatedState: {
        ...state,
        currentStepId: nextStep.stepId,
        status: requiresReview ? 'pending_human_review' : 'in_progress',
      },
    };
  }

  private handlePending(
    state: WorkflowState<TData>,
    workflow: WorkflowDefinition
  ): OrchestrationResult<TData> {
    const firstStep = this.getFirstStep(workflow);
    
    if (!firstStep) {
      return {
        nextAction: { action: 'TERMINATE' },
        updatedState: {
          ...state,
          status: 'failed',
          lastError: {
            message: 'No steps defined in workflow',
            type: 'CONFIGURATION_ERROR',
            retryable: false,
          },
        },
      };
    }

    return {
      nextAction: { stepId: firstStep.stepId },
      updatedState: {
        ...state,
        currentStepId: firstStep.stepId,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
      },
    };
  }

  private handleUnknownStatus(
    state: WorkflowState<TData>,
    workflow: WorkflowDefinition
  ): OrchestrationResult<TData> {
    const errorHandlerStepId = workflow.deadLetterHandler ?? workflow.errorHandler;
    
    if (errorHandlerStepId) {
      return {
        nextAction: {
          stepId: errorHandlerStepId,
          metadata: { reason: 'unknown_status', status: state.status },
        },
        updatedState: {
          ...state,
          currentStepId: errorHandlerStepId,
        },
      };
    }

    return {
      nextAction: { action: 'TERMINATE' },
      updatedState: state,
    };
  }

  // Helper methods

  private appendHistory(
    state: WorkflowState<TData>,
    status: WorkflowStatus,
    notes?: Record<string, unknown>
  ): void {
    if (!state.currentStepId) return;

    const entry: WorkflowHistoryEntry = {
      stepId: state.currentStepId,
      status,
      timestamp: new Date().toISOString(),
      ...(notes ? { notes } : {}),
    };

    // Avoid duplicate entries
    const lastEntry = state.history[state.history.length - 1];
    if (
      lastEntry &&
      lastEntry.stepId === entry.stepId &&
      lastEntry.status === entry.status
    ) {
      return;
    }

    state.history.push(entry);
  }

  private getFirstStep(workflow: WorkflowDefinition) {
    return workflow.steps[0] ?? null;
  }

  private findNextStep(workflow: WorkflowDefinition, currentStepId: string | null) {
    if (!currentStepId) return this.getFirstStep(workflow);
    
    const currentIndex = workflow.steps.findIndex(s => s.stepId === currentStepId);
    if (currentIndex === -1) return null;
    
    return workflow.steps[currentIndex + 1] ?? null;
  }

  private shouldRetry(state: WorkflowState<TData>, workflow: WorkflowDefinition): boolean {
    if (!state.currentStepId) return false;
    
    const step = workflow.steps.find(s => s.stepId === state.currentStepId);
    if (!step) return false;

    const retryable = state.lastError?.retryable ?? true;
    if (!retryable) return false;

    const maxAttempts = step.maxRetries ?? 3;
    const attempts = state.retryState?.attempt ?? 0;
    
    return attempts < maxAttempts;
  }

  private calculateBackoff(state: WorkflowState<TData>): {
    delayMs: number;
    retryState: RetryState;
  } {
    const retryState = state.retryState ?? {
      attempt: 0,
      maxAttempts: 3,
      baseDelayMs: 2000,
    };

    const attempt = retryState.attempt + 1;
    const delayMs = retryState.baseDelayMs * Math.pow(2, attempt - 1);
    const now = new Date().toISOString();
    const nextRetryAt = new Date(Date.now() + delayMs).toISOString();

    return {
      delayMs,
      retryState: {
        ...retryState,
        attempt,
        lastAttemptAt: now,
        nextRetryAt,
      },
    };
  }

  private resolveFallback(
    state: WorkflowState<TData>,
    workflow: WorkflowDefinition
  ): string | null {
    if (!state.currentStepId) return null;
    return workflow.fallbackMap?.[state.currentStepId] ?? null;
  }
}