"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowRunner = void 0;
const Orchestrator_1 = require("./Orchestrator");
class WorkflowRunner {
    constructor(options) {
        this.orchestrator = new Orchestrator_1.Orchestrator(options);
        this.dataClient = options.dataClient;
        this.maxExecutionTime = options.maxExecutionTime ?? 300000;
        this.logger = options.logger ?? console;
    }
    async execute(workflow, initialContext, _config) {
        const startTime = Date.now();
        const workflowId = initialContext.workflowId ?? this.generateWorkflowId();
        let state = {
            workflowId,
            status: "pending",
            runningStepIds: [],
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
        let stepsExecuted = 0;
        try {
            while (true) {
                const elapsed = Date.now() - startTime;
                if (elapsed > this.maxExecutionTime) {
                    state.status = "timed_out";
                    state.lastError = {
                        message: "Workflow execution timed out",
                        type: "TIMEOUT",
                    };
                    break;
                }
                const orchestrationResult = await this.orchestrator.orchestrate(state, workflow);
                state = orchestrationResult.updatedState;
                const { nextAction } = orchestrationResult;
                if (nextAction.action === "TERMINATE" || nextAction.action === "WAIT") {
                    break;
                }
                if (nextAction.stepIds && nextAction.stepIds.length > 0) {
                    const stepPromises = nextAction.stepIds.map((stepId) => this.orchestrator
                        .executeStep(state, workflow, stepId)
                        .then((result) => ({ stepId, result })));
                    const results = await Promise.all(stepPromises);
                    let batchFailed = false;
                    for (const { stepId, result } of results) {
                        stepsExecuted++;
                        if (result.success) {
                            state.context.outputs[stepId] = result.output;
                            this.orchestrator.appendHistory(state, stepId, "success");
                        }
                        else {
                            batchFailed = true;
                            state.lastError = result.error;
                            this.orchestrator.appendHistory(state, stepId, "failed", {
                                error: result.error,
                            });
                            break;
                        }
                    }
                    state.runningStepIds = [];
                    state.status = batchFailed ? "failed" : "success";
                    if (batchFailed) {
                        const failureResult = await this.orchestrator.orchestrate(state, workflow);
                        state = failureResult.updatedState;
                        if (failureResult.nextAction.action === "TERMINATE")
                            break;
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
                    startedAt: state.startedAt,
                    completedAt: state.completedAt,
                    durationMs: endTime - startTime,
                    stepsExecuted,
                },
            };
        }
        catch (error) {
            this.logger?.error("Workflow execution failed unexpectedly", {
                workflowId,
                error,
            });
            throw error;
        }
    }
    generateWorkflowId() {
        return `wf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}
exports.WorkflowRunner = WorkflowRunner;
