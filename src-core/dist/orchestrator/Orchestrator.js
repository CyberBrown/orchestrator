"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Orchestrator = void 0;
const TERMINAL_STATUSES = new Set([
    "success",
    "failed",
    "timed_out",
    "canceled",
]);
const LOGGABLE_STATUSES = new Set([
    "success",
    "failed",
    "timed_out",
    "retrying",
    "paused",
    "canceled",
    "validation_failed",
]);
class Orchestrator {
    constructor(options) {
        this.actionRegistry = options.actionRegistry;
        this.dataClient = options.dataClient;
        this.persistState = options.persistState ?? false;
        this.logger = options.logger ?? console;
    }
    async orchestrate(state, workflow) {
        const currentState = {
            ...state,
            history: [...state.history],
            context: {
                ...state.context,
                outputs: { ...state.context.outputs },
                sharedState: { ...state.context.sharedState },
            },
        };
        if (LOGGABLE_STATUSES.has(currentState.status)) {
            this.appendHistory(currentState, currentState.status);
        }
        switch (currentState.status) {
            case "paused":
                return this.handlePaused(currentState);
            case "canceled":
                return this.handleCanceled(currentState);
            case "retrying":
                return this.handleRetrying(currentState, workflow);
            case "validation_failed":
                return this.handleValidationFailed(currentState, workflow);
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
                return this.handleUnknownStatus(currentState, workflow);
        }
    }
    async executeStep(state, workflow, stepId) {
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
            const result = await action.execute({
                context: state.context,
                config: step.config,
            });
            return result;
        }
        catch (error) {
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
    async persistStateIfEnabled(state) {
        if (!this.persistState || !this.dataClient) {
            return;
        }
        try {
            await this.dataClient.update("workflow_states", state.workflowId, state);
        }
        catch (error) {
            this.logger?.error("Failed to persist state", {
                workflowId: state.workflowId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    handlePaused(state) {
        return {
            nextAction: { action: "WAIT" },
            updatedState: state,
        };
    }
    handleCanceled(state) {
        return {
            nextAction: { action: "TERMINATE" },
            updatedState: state,
        };
    }
    handleRetrying(state, workflow) {
        const nextStepId = state.currentStepId ?? this.getFirstStep(workflow)?.stepId;
        return {
            nextAction: {
                stepId: nextStepId,
                metadata: { reason: "retry" },
            },
            updatedState: {
                ...state,
                status: "in_progress",
            },
        };
    }
    handleValidationFailed(state, workflow) {
        const instructions = state.lastError?.validationMessage ??
            "Previous output was invalid. Please regenerate following the required schema.";
        return {
            nextAction: {
                stepId: state.currentStepId ?? this.getFirstStep(workflow)?.stepId,
                instructions,
                metadata: { reason: "validation_failed" },
            },
            updatedState: {
                ...state,
                status: "in_progress",
            },
        };
    }
    handleHumanReview(state) {
        return {
            nextAction: { action: "WAIT" },
            updatedState: state,
        };
    }
    handleInProgress(state) {
        return {
            nextAction: { action: "WAIT" },
            updatedState: state,
        };
    }
    handleFailure(state, workflow) {
        if (this.shouldRetry(state, workflow)) {
            const { delayMs, retryState } = this.calculateBackoff(state);
            return {
                nextAction: {
                    stepId: state.currentStepId ?? this.getFirstStep(workflow)?.stepId,
                    delayMs,
                    metadata: { reason: "automatic_retry", attempt: retryState.attempt },
                },
                updatedState: {
                    ...state,
                    status: "in_progress",
                    retryState,
                },
            };
        }
        const fallbackStepId = this.resolveFallback(state, workflow);
        if (fallbackStepId) {
            return {
                nextAction: {
                    stepId: fallbackStepId,
                    metadata: { reason: "fallback_route" },
                },
                updatedState: {
                    ...state,
                    currentStepId: fallbackStepId,
                    status: "in_progress",
                    retryState: undefined,
                },
            };
        }
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
        return {
            nextAction: { action: "TERMINATE" },
            updatedState: state,
        };
    }
    handleSuccess(state, workflow) {
        if (state.currentStepId === workflow.successHandler) {
            return {
                nextAction: { action: "TERMINATE" },
                updatedState: {
                    ...state,
                    completedAt: new Date().toISOString(),
                },
            };
        }
        const nextStep = this.findNextStep(workflow, state.currentStepId);
        if (!nextStep) {
            const successHandlerStepId = workflow.successHandler;
            if (!successHandlerStepId) {
                return {
                    nextAction: { action: "TERMINATE" },
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
        const requiresReview = nextStep.requiresHumanReview ?? false;
        return {
            nextAction: requiresReview
                ? { action: "WAIT" }
                : { stepId: nextStep.stepId },
            updatedState: {
                ...state,
                currentStepId: nextStep.stepId,
                status: requiresReview ? "pending_human_review" : "in_progress",
            },
        };
    }
    handlePending(state, workflow) {
        const firstStep = this.getFirstStep(workflow);
        if (!firstStep) {
            return {
                nextAction: { action: "TERMINATE" },
                updatedState: {
                    ...state,
                    status: "failed",
                    lastError: {
                        message: "No steps defined in workflow",
                        type: "CONFIGURATION_ERROR",
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
                status: "in_progress",
                startedAt: new Date().toISOString(),
            },
        };
    }
    handleUnknownStatus(state, workflow) {
        const errorHandlerStepId = workflow.deadLetterHandler ?? workflow.errorHandler;
        if (errorHandlerStepId) {
            return {
                nextAction: {
                    stepId: errorHandlerStepId,
                    metadata: { reason: "unknown_status", status: state.status },
                },
                updatedState: {
                    ...state,
                    currentStepId: errorHandlerStepId,
                },
            };
        }
        return {
            nextAction: { action: "TERMINATE" },
            updatedState: state,
        };
    }
    appendHistory(state, status, notes) {
        if (!state.currentStepId)
            return;
        const entry = {
            stepId: state.currentStepId,
            status,
            timestamp: new Date().toISOString(),
            ...(notes ? { notes } : {}),
        };
        const lastEntry = state.history[state.history.length - 1];
        if (lastEntry &&
            lastEntry.stepId === entry.stepId &&
            lastEntry.status === entry.status) {
            return;
        }
        state.history.push(entry);
    }
    getFirstStep(workflow) {
        return workflow.steps[0] ?? null;
    }
    findNextStep(workflow, currentStepId) {
        if (!currentStepId)
            return this.getFirstStep(workflow);
        const currentIndex = workflow.steps.findIndex((s) => s.stepId === currentStepId);
        if (currentIndex === -1)
            return null;
        return workflow.steps[currentIndex + 1] ?? null;
    }
    shouldRetry(state, workflow) {
        if (!state.currentStepId)
            return false;
        const step = workflow.steps.find((s) => s.stepId === state.currentStepId);
        if (!step)
            return false;
        const retryable = state.lastError?.retryable ?? true;
        if (!retryable)
            return false;
        const maxAttempts = step.maxRetries ?? 3;
        const attempts = state.retryState?.attempt ?? 0;
        return attempts < maxAttempts;
    }
    calculateBackoff(state) {
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
    resolveFallback(state, workflow) {
        if (!state.currentStepId)
            return null;
        return workflow.fallbackMap?.[state.currentStepId] ?? null;
    }
}
exports.Orchestrator = Orchestrator;
