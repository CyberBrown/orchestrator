/**
 * Generic Action Template
 *
 * Base template for creating workflow actions.
 * Provides common patterns and structure for action implementation.
 */

import type { Action, ActionInput, StepExecutionResult } from "../types/action";
import type { DataClient, AIProvider } from "../types/providers";

/**
 * Configuration for generic action
 */
export interface GenericActionConfig {
  /** Data client for database operations */
  dataClient?: DataClient;

  /** AI provider for content generation */
  aiProvider?: AIProvider;

  /** Custom configuration */
  [key: string]: unknown;
}

/**
 * Abstract base class for actions
 * Provides common functionality and structure
 */
export abstract class GenericAction<
  TInput = Record<string, unknown>,
  TOutput = unknown,
> implements Action<TInput, TOutput>
{
  abstract readonly id: string;
  abstract readonly name: string;
  readonly description?: string;

  protected dataClient?: DataClient;
  protected aiProvider?: AIProvider;
  protected config: GenericActionConfig;

  constructor(config: GenericActionConfig = {}) {
    this.config = config;
    this.dataClient = config.dataClient;
    this.aiProvider = config.aiProvider;
  }

  /**
   * Main execution method - must be implemented by subclasses
   */
  abstract execute(input: ActionInput<TInput>): Promise<StepExecutionResult>;

  /**
   * Validate input before execution
   */
  async validate(input: ActionInput<TInput>): Promise<{
    valid: boolean;
    errors?: string[];
  }> {
    const errors: string[] = [];

    // Basic validation
    if (!input.context) {
      errors.push("Context is required");
    }

    // Allow subclasses to add custom validation
    const customErrors = await this.customValidation(input);
    if (customErrors.length > 0) {
      errors.push(...customErrors);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Custom validation logic - override in subclasses
   */
  protected async customValidation(
    input: ActionInput<TInput>,
  ): Promise<string[]> {
    return [];
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Override in subclasses if needed
  }

  /**
   * Helper: Fetch data from database
   */
  protected async fetchData<T = unknown>(
    table: string,
    filters?: Record<string, unknown>,
  ): Promise<T[]> {
    if (!this.dataClient) {
      throw new Error("DataClient not configured for this action");
    }

    const result = await this.dataClient.fetch<T>(table, { filters });

    if (!result.success) {
      throw new Error(result.error?.message ?? "Failed to fetch data");
    }

    return result.data ?? [];
  }

  /**
   * Helper: Save data to database
   */
  protected async saveData<T = unknown>(
    table: string,
    data: Partial<T>,
  ): Promise<T> {
    if (!this.dataClient) {
      throw new Error("DataClient not configured for this action");
    }

    const result = await this.dataClient.insert<T>(table, data);

    if (!result.success) {
      throw new Error(result.error?.message ?? "Failed to save data");
    }

    return Array.isArray(result.data) ? result.data[0] : result.data!;
  }

  /**
   * Helper: Update data in database
   */
  protected async updateData<T = unknown>(
    table: string,
    id: string | number,
    data: Partial<T>,
  ): Promise<T> {
    if (!this.dataClient) {
      throw new Error("DataClient not configured for this action");
    }

    const result = await this.dataClient.update<T>(table, id, data);

    if (!result.success) {
      throw new Error(result.error?.message ?? "Failed to update data");
    }

    return result.data!;
  }

  /**
   * Helper: Generate content using AI
   */
  protected async generateContent(
    prompt: string,
    systemInstruction?: string,
    options?: {
      modelId?: string;
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<string> {
    if (!this.aiProvider) {
      throw new Error("AIProvider not configured for this action");
    }

    const response = await this.aiProvider.generateContent({
      prompt,
      systemInstruction,
      modelId: options?.modelId,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    });

    if (!response.success) {
      throw new Error(response.error?.message ?? "Failed to generate content");
    }

    return response.content;
  }

  /**
   * Helper: Get output from previous step
   */
  protected getPreviousOutput<T = unknown>(
    input: ActionInput<TInput>,
    stepId: string,
  ): T | undefined {
    return input.context.outputs[stepId] as T | undefined;
  }

  /**
   * Helper: Get all previous outputs
   */
  protected getAllPreviousOutputs(
    input: ActionInput<TInput>,
  ): Record<string, unknown> {
    return input.context.outputs;
  }

  /**
   * Helper: Create success result
   */
  protected createSuccessResult(
    output: TOutput,
    metadata?: Record<string, unknown>,
  ): StepExecutionResult {
    return {
      success: true,
      output,
      metadata,
    };
  }

  /**
   * Helper: Create error result
   */
  protected createErrorResult(
    error: Error | string,
    retryable: boolean = true,
  ): StepExecutionResult {
    const message = typeof error === "string" ? error : error.message;

    return {
      success: false,
      error: {
        message,
        type: typeof error === "string" ? "ERROR" : error.constructor.name,
        retryable,
      },
    };
  }
}

/**
 * Example: Simple Data Fetch Action
 */
export class DataFetchAction extends GenericAction<
  { table: string; filters?: Record<string, unknown> },
  unknown[]
> {
  readonly id = "data-fetch";
  readonly name = "Data Fetch Action";
  readonly description = "Fetches data from a specified table";

  async execute(
    input: ActionInput<{
      table: string;
      filters?: Record<string, unknown>;
    }>,
  ): Promise<StepExecutionResult> {
    try {
      const { table, filters } = input.context.input;

      if (!table) {
        return this.createErrorResult("Table name is required", false);
      }

      const data = await this.fetchData(table, filters);

      return this.createSuccessResult(data, {
        recordCount: data.length,
        table,
      });
    } catch (error) {
      return this.createErrorResult(error as Error);
    }
  }
}

/**
 * Example: AI Content Generation Action
 */
export class AIGenerationAction extends GenericAction<
  { prompt: string; systemInstruction?: string },
  string
> {
  readonly id = "ai-generation";
  readonly name = "AI Content Generation";
  readonly description = "Generates content using AI provider";

  async execute(
    input: ActionInput<{
      prompt: string;
      systemInstruction?: string;
    }>,
  ): Promise<StepExecutionResult> {
    try {
      const { prompt, systemInstruction } = input.context.input;

      if (!prompt) {
        return this.createErrorResult("Prompt is required", false);
      }

      const content = await this.generateContent(prompt, systemInstruction);

      return this.createSuccessResult(content, {
        contentLength: content.length,
      });
    } catch (error) {
      return this.createErrorResult(error as Error);
    }
  }
}

/**
 * Example: Data Transform Action
 */
export class DataTransformAction extends GenericAction<
  { sourceStepId: string; transformFn?: string },
  unknown
> {
  readonly id = "data-transform";
  readonly name = "Data Transform Action";
  readonly description = "Transforms data from a previous step";

  async execute(
    input: ActionInput<{
      sourceStepId: string;
      transformFn?: string;
    }>,
  ): Promise<StepExecutionResult> {
    try {
      const { sourceStepId } = input.context.input;

      if (!sourceStepId) {
        return this.createErrorResult("Source step ID is required", false);
      }

      const sourceData = this.getPreviousOutput(input, sourceStepId);

      if (!sourceData) {
        return this.createErrorResult(
          `No output found from step: ${sourceStepId}`,
          false,
        );
      }

      // Apply transformation (simplified example)
      const transformed = this.transform(sourceData);

      return this.createSuccessResult(transformed);
    } catch (error) {
      return this.createErrorResult(error as Error);
    }
  }

  private transform(data: unknown): unknown {
    // Implement transformation logic
    return data;
  }
}
