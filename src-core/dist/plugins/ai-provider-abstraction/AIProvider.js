"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockAIProvider = exports.AIProviderFactory = exports.AIProvider = void 0;
class AIProvider {
    validateRequest(request) {
        if (!request.prompt || request.prompt.trim().length === 0) {
            throw new Error("Prompt is required and cannot be empty");
        }
        if (request.modelId && !this.supportedModels.includes(request.modelId)) {
            throw new Error(`Model ${request.modelId} is not supported by ${this.name}. ` +
                `Supported models: ${this.supportedModels.join(", ")}`);
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
    createErrorResponse(error, modelId) {
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
    createSuccessResponse(content, modelId, usage, metadata) {
        return {
            content,
            success: true,
            provider: this.name,
            model: modelId,
            usage,
            metadata,
        };
    }
    getDefaultModel() {
        return this.supportedModels[0] ?? "default";
    }
    async retryWithBackoff(operation, maxRetries = 3, baseDelayMs = 1000) {
        let lastError;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (attempt === maxRetries - 1) {
                    break;
                }
                const delay = baseDelayMs * Math.pow(2, attempt);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        throw lastError;
    }
}
exports.AIProvider = AIProvider;
class AIProviderFactory {
    constructor() {
        this.providers = new Map();
    }
    register(name, factory) {
        this.providers.set(name.toLowerCase(), factory);
    }
    create(name) {
        const factory = this.providers.get(name.toLowerCase());
        return factory ? factory() : undefined;
    }
    list() {
        return Array.from(this.providers.keys());
    }
    has(name) {
        return this.providers.has(name.toLowerCase());
    }
}
exports.AIProviderFactory = AIProviderFactory;
class MockAIProvider extends AIProvider {
    constructor() {
        super(...arguments);
        this.name = "mock-ai-provider";
        this.supportedModels = ["mock-model-1", "mock-model-2"];
        this.seededResponses = new Map();
        this.defaultResponse = "This is a mock AI response.";
    }
    async generateContent(request) {
        try {
            this.validateRequest(request);
            const content = this.seededResponses.get(request.prompt) ?? this.defaultResponse;
            return this.createSuccessResponse(content, request.modelId ?? this.getDefaultModel(), {
                promptTokens: request.prompt.length,
                completionTokens: content.length,
                totalTokens: request.prompt.length + content.length,
            });
        }
        catch (error) {
            return this.createErrorResponse(error, request.modelId);
        }
    }
    async isAvailable() {
        return true;
    }
    seedResponse(prompt, response) {
        this.seededResponses.set(prompt, response);
    }
    setDefaultResponse(response) {
        this.defaultResponse = response;
    }
    clear() {
        this.seededResponses.clear();
        this.defaultResponse = "This is a mock AI response.";
    }
}
exports.MockAIProvider = MockAIProvider;
