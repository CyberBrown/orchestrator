"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowRunner = void 0;
const Orchestrator_1 = require("./Orchestrator");
class WorkflowRunner {
    constructor(options) {
        this.orchestrator = new Orchestrator_1.Orchestrator(options);
        this.dataClient = options.dataClient;
        this.maxExecutionTime = options.maxExecutionTime ?? 300000;
        this.pollingIntervalMs = options.pollingIntervalMs ?? 1000;
        this.logger = options.logger ?? console;
    }
    async execute(workflow, initialContext, config) {
        const startTime = Date.now();
        const workflowId = initialContext.workflowId ?? this.generateWorkflowId();
        let state = {
            workflowId,
            status: "pending",
            currentStepId: null,
            history: [],
            context: {
                workflowId,
                userId: initialContext.userId,
                input: (initialContext.input ?? {}),
                outputs: initialContext.outputs ?? {},
                sharedState: initialContext.sharedState ?? {},
                metadata: initialContext.metadata,
            },
            startedAt: new Date().toISOString(),
        };
        if (config?.persistState && this.dataClient) {
            await this.persistState(state);
        }
        let stepsExecuted = 0;
        let retriesPerformed = 0;
        let lastError;
        try {
            while (true) {
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
                const result = await this.orchestrator.orchestrate(state, workflow);
                state = result.updatedState;
                if (result.nextAction.action === "TERMINATE") {
                    break;
                }
                if (result.nextAction.action === "WAIT") {
                    this.logger?.info("Workflow waiting", {
                        workflowId,
                        status: state.status,
                        currentStepId: state.currentStepId,
                    });
                    break;
                }
                if (result.nextAction.stepId) {
                    const stepId = result.nextAction.stepId;
                    this.logger?.info("Executing step", {
                        workflowId,
                        stepId,
                        attempt: (state.retryState?.attempt ?? 0) + 1,
                    });
                    if (result.nextAction.delayMs) {
                        await this.delay(result.nextAction.delayMs);
                    }
                    const stepResult = await this.orchestrator.executeStep(state, workflow, stepId);
                    stepsExecuted++;
                    if (stepResult.success) {
                        state.context.outputs[stepId] = stepResult.output;
                        state.status = "success";
                        state.retryState = undefined;
                        state.lastError = undefined;
                    }
                    else {
                        state.status = "failed";
                        state.lastError = stepResult.error;
                        lastError = stepResult.error;
                        if (state.retryState) {
                            retriesPerformed++;
                        }
                    }
                    if (config?.persistState && this.dataClient) {
                        await this.persistState(state);
                    }
                }
                await this.delay(this.pollingIntervalMs);
            }
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
                    startedAt: state.startedAt,
                    completedAt: state.completedAt,
                    durationMs: endTime - startTime,
                    stepsExecuted,
                    retriesPerformed,
                },
            };
        }
        catch (error) {
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
                    startedAt: state.startedAt,
                    completedAt: new Date().toISOString(),
                    durationMs: endTime - startTime,
                    stepsExecuted,
                    retriesPerformed,
                },
            };
        }
    }
    async resume(workflowId, workflow, updates) {
        if (!this.dataClient) {
            throw new Error("DataClient required to resume workflows");
        }
        const stateResult = await this.dataClient.fetchById("workflow_states", workflowId);
        if (!stateResult.success || !stateResult.data) {
            throw new Error(`Workflow state not found: ${workflowId}`);
        }
        let state = stateResult.data;
        if (updates) {
            state = { ...state, ...updates };
        }
        if (state.status === "pending_human_review" || state.status === "paused") {
            state.status = "success";
        }
        return this.executeFromState(workflow, state);
    }
    async executeFromState(workflow, initialState) {
        return this.execute(workflow, initialState.context);
    }
    async persistState(state) {
        if (!this.dataClient)
            return;
        try {
            const existing = await this.dataClient.fetchById("workflow_states", state.workflowId);
            if (existing.success && existing.data) {
                await this.dataClient.update("workflow_states", state.workflowId, state);
            }
            else {
                await this.dataClient.insert("workflow_states", state);
            }
        }
        catch (error) {
            this.logger?.error("Failed to persist state", {
                workflowId: state.workflowId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    generateWorkflowId() {
        return `wf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.WorkflowRunner = WorkflowRunner;
