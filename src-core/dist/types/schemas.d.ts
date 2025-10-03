import { z } from "zod";
export declare const WorkflowStatusSchema: z.ZodEnum<["pending", "in_progress", "pending_human_review", "success", "failed", "timed_out", "retrying", "paused", "canceled", "validation_failed"]>;
export declare const WorkflowStepSchema: z.ZodObject<{
    stepId: z.ZodString;
    actionName: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
    dependencies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    requiresHumanReview: z.ZodOptional<z.ZodBoolean>;
    maxRetries: z.ZodOptional<z.ZodNumber>;
    timeout: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    stepId: string;
    actionName: string;
    config?: Record<string, unknown> | undefined;
    displayName?: string | undefined;
    dependencies?: string[] | undefined;
    requiresHumanReview?: boolean | undefined;
    maxRetries?: number | undefined;
    timeout?: number | undefined;
}, {
    stepId: string;
    actionName: string;
    config?: Record<string, unknown> | undefined;
    displayName?: string | undefined;
    dependencies?: string[] | undefined;
    requiresHumanReview?: boolean | undefined;
    maxRetries?: number | undefined;
    timeout?: number | undefined;
}>;
export declare const WorkflowDefinitionSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    steps: z.ZodArray<z.ZodObject<{
        stepId: z.ZodString;
        actionName: z.ZodString;
        displayName: z.ZodOptional<z.ZodString>;
        dependencies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        requiresHumanReview: z.ZodOptional<z.ZodBoolean>;
        maxRetries: z.ZodOptional<z.ZodNumber>;
        timeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        stepId: string;
        actionName: string;
        config?: Record<string, unknown> | undefined;
        displayName?: string | undefined;
        dependencies?: string[] | undefined;
        requiresHumanReview?: boolean | undefined;
        maxRetries?: number | undefined;
        timeout?: number | undefined;
    }, {
        stepId: string;
        actionName: string;
        config?: Record<string, unknown> | undefined;
        displayName?: string | undefined;
        dependencies?: string[] | undefined;
        requiresHumanReview?: boolean | undefined;
        maxRetries?: number | undefined;
        timeout?: number | undefined;
    }>, "many">;
    errorHandler: z.ZodOptional<z.ZodString>;
    successHandler: z.ZodOptional<z.ZodString>;
    deadLetterHandler: z.ZodOptional<z.ZodString>;
    fallbackMap: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    steps: {
        stepId: string;
        actionName: string;
        config?: Record<string, unknown> | undefined;
        displayName?: string | undefined;
        dependencies?: string[] | undefined;
        requiresHumanReview?: boolean | undefined;
        maxRetries?: number | undefined;
        timeout?: number | undefined;
    }[];
    description?: string | undefined;
    errorHandler?: string | undefined;
    successHandler?: string | undefined;
    deadLetterHandler?: string | undefined;
    fallbackMap?: Record<string, string> | undefined;
    config?: Record<string, unknown> | undefined;
}, {
    id: string;
    name: string;
    steps: {
        stepId: string;
        actionName: string;
        config?: Record<string, unknown> | undefined;
        displayName?: string | undefined;
        dependencies?: string[] | undefined;
        requiresHumanReview?: boolean | undefined;
        maxRetries?: number | undefined;
        timeout?: number | undefined;
    }[];
    description?: string | undefined;
    errorHandler?: string | undefined;
    successHandler?: string | undefined;
    deadLetterHandler?: string | undefined;
    fallbackMap?: Record<string, string> | undefined;
    config?: Record<string, unknown> | undefined;
}>;
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
//# sourceMappingURL=schemas.d.ts.map