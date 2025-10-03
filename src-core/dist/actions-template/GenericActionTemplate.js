"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataTransformAction = exports.AIGenerationAction = exports.DataFetchAction = exports.GenericAction = void 0;
class GenericAction {
    constructor(config = {}) {
        this.config = config;
        this.dataClient = config.dataClient;
        this.aiProvider = config.aiProvider;
    }
    async validate(input) {
        const errors = [];
        if (!input.context) {
            errors.push("Context is required");
        }
        const customErrors = await this.customValidation(input);
        if (customErrors.length > 0) {
            errors.push(...customErrors);
        }
        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
        };
    }
    async customValidation(input) {
        return [];
    }
    async cleanup() {
    }
    async fetchData(table, filters) {
        if (!this.dataClient) {
            throw new Error("DataClient not configured for this action");
        }
        const result = await this.dataClient.fetch(table, { filters });
        if (!result.success) {
            throw new Error(result.error?.message ?? "Failed to fetch data");
        }
        return result.data ?? [];
    }
    async saveData(table, data) {
        if (!this.dataClient) {
            throw new Error("DataClient not configured for this action");
        }
        const result = await this.dataClient.insert(table, data);
        if (!result.success) {
            throw new Error(result.error?.message ?? "Failed to save data");
        }
        return Array.isArray(result.data) ? result.data[0] : result.data;
    }
    async updateData(table, id, data) {
        if (!this.dataClient) {
            throw new Error("DataClient not configured for this action");
        }
        const result = await this.dataClient.update(table, id, data);
        if (!result.success) {
            throw new Error(result.error?.message ?? "Failed to update data");
        }
        return result.data;
    }
    async generateContent(prompt, systemInstruction, options) {
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
    getPreviousOutput(input, stepId) {
        return input.context.outputs[stepId];
    }
    getAllPreviousOutputs(input) {
        return input.context.outputs;
    }
    createSuccessResult(output, metadata) {
        return {
            success: true,
            output,
            metadata,
        };
    }
    createErrorResult(error, retryable = true) {
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
exports.GenericAction = GenericAction;
class DataFetchAction extends GenericAction {
    constructor() {
        super(...arguments);
        this.id = "data-fetch";
        this.name = "Data Fetch Action";
        this.description = "Fetches data from a specified table";
    }
    async execute(input) {
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
        }
        catch (error) {
            return this.createErrorResult(error);
        }
    }
}
exports.DataFetchAction = DataFetchAction;
class AIGenerationAction extends GenericAction {
    constructor() {
        super(...arguments);
        this.id = "ai-generation";
        this.name = "AI Content Generation";
        this.description = "Generates content using AI provider";
    }
    async execute(input) {
        try {
            const { prompt, systemInstruction } = input.context.input;
            if (!prompt) {
                return this.createErrorResult("Prompt is required", false);
            }
            const content = await this.generateContent(prompt, systemInstruction);
            return this.createSuccessResult(content, {
                contentLength: content.length,
            });
        }
        catch (error) {
            return this.createErrorResult(error);
        }
    }
}
exports.AIGenerationAction = AIGenerationAction;
class DataTransformAction extends GenericAction {
    constructor() {
        super(...arguments);
        this.id = "data-transform";
        this.name = "Data Transform Action";
        this.description = "Transforms data from a previous step";
    }
    async execute(input) {
        try {
            const { sourceStepId } = input.context.input;
            if (!sourceStepId) {
                return this.createErrorResult("Source step ID is required", false);
            }
            const sourceData = this.getPreviousOutput(input, sourceStepId);
            if (!sourceData) {
                return this.createErrorResult(`No output found from step: ${sourceStepId}`, false);
            }
            const transformed = this.transform(sourceData);
            return this.createSuccessResult(transformed);
        }
        catch (error) {
            return this.createErrorResult(error);
        }
    }
    transform(data) {
        return data;
    }
}
exports.DataTransformAction = DataTransformAction;
