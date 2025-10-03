/**
 * AIProvider Interface
 *
 * Base interface that all AI provider implementations must follow.
 * This allows the framework to work with any LLM provider (Vertex AI, OpenAI, Anthropic, etc.)
 */

import type {
  AIProvider as IAIProvider,
  AIProviderRequest,
  AIProviderResponse,
} from "../../types/providers";

/**
 * Abstract base class for AI providers
 * Provides common functionality and enforces interface contract
 */
export abstract class AIProvider implements IAIProvider {
  abstract readonly name: string;
  abstract readonly supportedModels: string[];

  /**
   * Generate content using the AI provider
   */
  abstract generateContent(
    request: AIProviderRequest,
  ): Promise<AIProviderResponse>;

  /**
   * Check if the provider is available and properly configured
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Get provider configuration (optional)
   */
  getConfig?(): Record<string, unknown>;

  /**
   * Validate request before sending to provider
   */
  protected validateRequest(request: AIProviderRequest): void {
    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new Error("Prompt is required and cannot be empty");
    }

    if (request.modelId && !this.supportedModels.includes(request.modelId)) {
      throw new Error(
        `Model ${request.modelId} is not supported by ${this.name}. ` +
          `Supported models: ${this.supportedModels.join(", ")}`,
      );
    }

    if (request.temperature !== undefined) {
      if (request.temperature < 0 || request.temperature > 1) {
        throw new Error("Temperature must be between 0 and 1");
      }
    }

    if (request.maxTokens !== undefined && request.maxTokens <= 0) {
      throw new Error("maxTokens must be greater than 0");
    }
  }

  /**
   * Create a standardized error response
   */
  protected createErrorResponse(
    error: Error | unknown,
    modelId?: string,
  ): AIProviderResponse {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      content: "",
      success: false,
      provider: this.name,
      model: modelId ?? "unknown",
      error: {
        message: errorMessage,
        type: error instanceof Error ? error.constructor.name : "UnknownError",
      },
    };
  }

  /**
   * Create a successful response
   */
  protected createSuccessResponse(
    content: string,
    modelId: string,
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    },
    metadata?: Record<string, unknown>,
  ): AIProviderResponse {
    return {
      content,
      success: true,
      provider: this.name,
      model: modelId,
      usage,
      metadata,
    };
  }

  /**
   * Get default model for this provider
   */
  protected getDefaultModel(): string {
    return this.supportedModels[0] ?? "default";
  }

  /**
   * Retry logic with exponential backoff
   */
  protected async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000,
  ): Promise<T> {
    let lastError: Error | unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry on the last attempt
        if (attempt === maxRetries - 1) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

/**
 * Factory for creating AI provider instances
 */
export class AIProviderFactory {
  private providers = new Map<string, () => AIProvider>();

  /**
   * Register a provider factory
   */
  register(name: string, factory: () => AIProvider): void {
    this.providers.set(name.toLowerCase(), factory);
  }

  /**
   * Create a provider instance
   */
  create(name: string): AIProvider | undefined {
    const factory = this.providers.get(name.toLowerCase());
    return factory ? factory() : undefined;
  }

  /**
   * Get list of registered providers
   */
  list(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered
   */
  has(name: string): boolean {
    return this.providers.has(name.toLowerCase());
  }
}
