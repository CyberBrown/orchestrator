import { z } from "zod";
import type { Action, ActionInput } from "../types/action";
import type { StepExecutionResult } from "../types/workflow";
import type { DataClient, AIProvider } from "../types/providers";
export interface GenericActionConfig {
    dataClient?: DataClient;
    aiProvider?: AIProvider;
    [key: string]: unknown;
}
export declare abstract class GenericAction<TInput = Record<string, unknown>, TOutput = unknown> implements Action<TInput, TOutput> {
    abstract readonly id: string;
    abstract readonly name: string;
    readonly description?: string;
    readonly inputSchema?: z.ZodType<TInput>;
    protected dataClient?: DataClient;
    protected aiProvider?: AIProvider;
    protected config: GenericActionConfig;
    constructor(config?: GenericActionConfig);
    abstract execute(input: ActionInput<TInput>): Promise<StepExecutionResult>;
    validate(input: ActionInput<TInput>): Promise<{
        valid: boolean;
        errors?: string[];
    }>;
    protected customValidation(_input: ActionInput<TInput>): Promise<string[]>;
    cleanup(): Promise<void>;
    protected fetchData<T = unknown>(table: string, filters?: Record<string, unknown>): Promise<T[]>;
    protected saveData<T = unknown>(table: string, data: Partial<T>): Promise<T>;
    protected updateData<T = unknown>(table: string, id: string | number, data: Partial<T>): Promise<T>;
    protected generateContent(prompt: string, systemInstruction?: string, options?: {
        modelId?: string;
        temperature?: number;
        maxTokens?: number;
    }): Promise<string>;
    protected getPreviousOutput<T = unknown>(input: ActionInput<TInput>, stepId: string): T | undefined;
    protected getAllPreviousOutputs(input: ActionInput<TInput>): Record<string, unknown>;
    protected createSuccessResult(output: TOutput, metadata?: Record<string, unknown>): StepExecutionResult;
    protected createErrorResult(error: Error | string, retryable?: boolean): StepExecutionResult;
}
export declare class DataFetchAction extends GenericAction<{
    table: string;
    filters?: Record<string, unknown>;
}, unknown[]> {
    readonly id = "data-fetch";
    readonly name = "Data Fetch Action";
    readonly description = "Fetches data from a specified table";
    readonly inputSchema: z.ZodObject<{
        table: z.ZodString;
        filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        table: string;
        filters?: Record<string, unknown> | undefined;
    }, {
        table: string;
        filters?: Record<string, unknown> | undefined;
    }>;
    execute(input: ActionInput<{
        table: string;
        filters?: Record<string, unknown>;
    }>): Promise<StepExecutionResult>;
}
export declare class AIGenerationAction extends GenericAction<{
    prompt: string;
    systemInstruction?: string;
}, string> {
    readonly id = "ai-generation";
    readonly name = "AI Content Generation";
    readonly description = "Generates content using AI provider";
    execute(input: ActionInput<{
        prompt: string;
        systemInstruction?: string;
    }>): Promise<StepExecutionResult>;
}
export declare class DataTransformAction extends GenericAction<{
    sourceStepId: string;
    transformFn?: string;
}, unknown> {
    readonly id = "data-transform";
    readonly name = "Data Transform Action";
    readonly description = "Transforms data from a previous step";
    execute(input: ActionInput<{
        sourceStepId: string;
        transformFn?: string;
    }>): Promise<StepExecutionResult>;
    private transform;
}
//# sourceMappingURL=GenericActionTemplate.d.ts.map