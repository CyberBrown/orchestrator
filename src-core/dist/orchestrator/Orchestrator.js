"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Orchestrator = void 0;
const _TERMINAL_STATUSES = new Set(["success", "failed", "timed_out", "canceled"]);
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
            runningStepIds: [...state.runningStepIds],
            context: {
                ...state.context,
                outputs: { ...state.context.outputs },
                sharedState: { ...state.context.sharedState },
            },
        };
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
                return this.handleFailure(currentState, workflow);
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
            return await action.execute({
                context: state.context,
                config: step.config,
            });
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
    appendHistory(state, stepId, status, notes) {
        const entry = {
            stepId,
            status,
            timestamp: new Date().toISOString(),
            ...(notes ? { notes } : {}),
        };
        state.history.push(entry);
    }
    handlePaused(state) {
        return { nextAction: { action: "WAIT" }, updatedState: state };
    }
    handleCanceled(state) {
        return { nextAction: { action: "TERMINATE" }, updatedState: state };
    }
    handleHumanReview(state) {
        return { nextAction: { action: "WAIT" }, updatedState: state };
    }
    handleInProgress(state) {
        return { nextAction: { action: "WAIT" }, updatedState: state };
    }
    handleFailure(state, workflow) {
        const errorHandlerStepId = workflow.deadLetterHandler ?? workflow.errorHandler;
        if (errorHandlerStepId) {
            return {
                nextAction: { stepIds: [errorHandlerStepId] },
                updatedState: { ...state, runningStepIds: [errorHandlerStepId] },
            };
        }
        return { nextAction: { action: "TERMINATE" }, updatedState: state };
    }
    handleSuccess(state, workflow) {
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
        const allStepsFinished = workflow.steps.every((step) => state.history.some((h) => h.stepId === step.stepId && h.status === "success"));
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
        return { nextAction: { action: "WAIT" }, updatedState: state };
    }
    handlePending(state, workflow) {
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
    findRunnableSteps(workflow, state) {
        const completedStepIds = new Set(state.history.filter((h) => h.status === "success").map((h) => h.stepId));
        const runningStepIds = new Set(state.runningStepIds);
        const runnableSteps = [];
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
exports.Orchestrator = Orchestrator;
