import { AIProvider } from "./AIProvider";
import type { AIProviderRequest, AIProviderResponse } from "../../types/providers";
export interface VertexAIConfig {
    projectId: string;
    location: string;
    defaultModel?: string;
}
export declare class VertexAIAdapter extends AIProvider {
    readonly name = "vertex-ai";
    readonly supportedModels: string[];
    private config;
    private client;
    constructor(config: VertexAIConfig);
    private initializeClient;
    generateContent(request: AIProviderRequest): Promise<AIProviderResponse>;
    isAvailable(): Promise<boolean>;
    getConfig(): Record<string, unknown>;
    private prepareVertexRequest;
    private callVertexAPI;
    private parseVertexResponse;
    static fromEnvironment(): VertexAIAdapter;
}
//# sourceMappingURL=VertexAIAdapter.d.ts.map