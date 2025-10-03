import type { AIProvider as IAIProvider, AIProviderRequest, AIProviderResponse } from "../../types/providers";
export declare abstract class AIProvider implements IAIProvider {
    abstract readonly name: string;
    abstract readonly supportedModels: string[];
    abstract generateContent(request: AIProviderRequest): Promise<AIProviderResponse>;
    abstract isAvailable(): Promise<boolean>;
    getConfig?(): Record<string, unknown>;
    protected validateRequest(request: AIProviderRequest): void;
    protected createErrorResponse(error: Error | unknown, modelId?: string): AIProviderResponse;
    protected createSuccessResponse(content: string, modelId: string, usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    }, metadata?: Record<string, unknown>): AIProviderResponse;
    protected getDefaultModel(): string;
    protected retryWithBackoff<T>(operation: () => Promise<T>, maxRetries?: number, baseDelayMs?: number): Promise<T>;
}
export declare class AIProviderFactory {
    private providers;
    register(name: string, factory: () => AIProvider): void;
    create(name: string): AIProvider | undefined;
    list(): string[];
    has(name: string): boolean;
}
//# sourceMappingURL=AIProvider.d.ts.map