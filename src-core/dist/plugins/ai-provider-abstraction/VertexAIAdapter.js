"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VertexAIAdapter = void 0;
const AIProvider_1 = require("./AIProvider");
const zod_1 = require("zod");
class VertexAIAdapter extends AIProvider_1.AIProvider {
    constructor(config) {
        super();
        this.name = "vertex-ai";
        this.supportedModels = [
            "gemini-2.0-flash-exp",
            "gemini-1.5-pro",
            "gemini-1.5-flash",
            "gemini-1.0-pro",
        ];
        this.config = config;
        this.initializeClient();
    }
    initializeClient() {
        this.client = null;
    }
    async generateContent(request) {
        try {
            this.validateRequest(request);
            const modelId = request.modelId ?? this.config.defaultModel ?? this.getDefaultModel();
            if (!this.client) {
                throw new Error("Vertex AI client not initialized. Ensure GCP credentials are configured.");
            }
            const vertexRequest = this.prepareVertexRequest(request, modelId);
            const response = await this.retryWithBackoff(() => this.callVertexAPI(vertexRequest), 3, 1000);
            return this.parseVertexResponse(response, modelId);
        }
        catch (error) {
            return this.createErrorResponse(error, request.modelId);
        }
    }
    async isAvailable() {
        try {
            if (!this.config.projectId || !this.config.location) {
                return false;
            }
            return this.client !== null;
        }
        catch {
            return false;
        }
    }
    getConfig() {
        return {
            projectId: this.config.projectId,
            location: this.config.location,
            defaultModel: this.config.defaultModel,
            supportedModels: this.supportedModels,
        };
    }
    prepareVertexRequest(request, modelId) {
        const generationConfig = {};
        if (request.temperature !== undefined) {
            generationConfig.temperature = request.temperature;
        }
        if (request.maxTokens !== undefined) {
            generationConfig.maxOutputTokens = request.maxTokens;
        }
        if (request.stopSequences && request.stopSequences.length > 0) {
            generationConfig.stopSequences = request.stopSequences;
        }
        const raw = {
            model: modelId,
            contents: [
                {
                    role: "user",
                    parts: [{ text: request.prompt }],
                },
            ],
            systemInstruction: request.systemInstruction
                ? {
                    role: "system",
                    parts: [{ text: request.systemInstruction }],
                }
                : undefined,
            generationConfig,
            ...request.parameters,
        };
        const parsed = VertexAIAdapter.VertexRequestSchema.safeParse(raw);
        if (!parsed.success) {
            throw new Error(`Invalid Vertex request: ${parsed.error.issues
                .map((i) => `${i.path.join(".")}: ${i.message}`)
                .join(", ")}`);
        }
        return parsed.data;
    }
    async callVertexAPI(_request) {
        throw new Error("Vertex AI client not implemented. Please configure the actual SDK.");
    }
    parseVertexResponse(_response, _modelId) {
        throw new Error("Response parsing not implemented");
    }
    static fromEnvironment() {
        const projectId = process.env.GCP_PROJECT_ID;
        const location = process.env.GCP_LOCATION || "us-central1";
        const defaultModel = process.env.VERTEX_DEFAULT_MODEL;
        if (!projectId) {
            throw new Error("GCP_PROJECT_ID environment variable is required");
        }
        return new VertexAIAdapter({
            projectId,
            location,
            defaultModel,
        });
    }
}
exports.VertexAIAdapter = VertexAIAdapter;
VertexAIAdapter.VertexRequestSchema = zod_1.z
    .object({
    model: zod_1.z.string(),
    contents: zod_1.z.array(zod_1.z.object({
        role: zod_1.z.literal("user"),
        parts: zod_1.z.array(zod_1.z.object({ text: zod_1.z.string() })),
    })),
    systemInstruction: zod_1.z
        .object({
        role: zod_1.z.literal("system"),
        parts: zod_1.z.array(zod_1.z.object({ text: zod_1.z.string() })),
    })
        .optional(),
    generationConfig: zod_1.z
        .object({
        temperature: zod_1.z.number().optional(),
        maxOutputTokens: zod_1.z.number().optional(),
        stopSequences: zod_1.z.array(zod_1.z.string()).optional(),
    })
        .partial()
        .optional(),
})
    .passthrough();
