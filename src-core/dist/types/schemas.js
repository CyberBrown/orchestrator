"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowDefinitionSchema = exports.WorkflowStepSchema = exports.WorkflowStatusSchema = void 0;
const zod_1 = require("zod");
exports.WorkflowStatusSchema = zod_1.z.enum([
    "pending",
    "in_progress",
    "pending_human_review",
    "success",
    "failed",
    "timed_out",
    "retrying",
    "paused",
    "canceled",
    "validation_failed",
]);
exports.WorkflowStepSchema = zod_1.z.object({
    stepId: zod_1.z.string().min(1),
    actionName: zod_1.z.string().min(1),
    displayName: zod_1.z.string().optional(),
    dependencies: zod_1.z.array(zod_1.z.string()).optional(),
    config: zod_1.z.record(zod_1.z.unknown()).optional(),
    requiresHumanReview: zod_1.z.boolean().optional(),
    maxRetries: zod_1.z.number().min(0).optional(),
    timeout: zod_1.z.number().min(1000).optional(),
});
exports.WorkflowDefinitionSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    steps: zod_1.z.array(exports.WorkflowStepSchema).min(1),
    errorHandler: zod_1.z.string().optional(),
    successHandler: zod_1.z.string().optional(),
    deadLetterHandler: zod_1.z.string().optional(),
    fallbackMap: zod_1.z.record(zod_1.z.string()).optional(),
    config: zod_1.z.record(zod_1.z.unknown()).optional(),
});
