export interface AIProviderRequest {
    prompt: string;
    systemInstruction?: string;
    modelId?: string;
    temperature?: number;
    maxTokens?: number;
    stopSequences?: string[];
    parameters?: Record<string, unknown>;
}
export interface AIProviderResponse {
    content: string;
    success: boolean;
    provider: string;
    model: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    error?: {
        message: string;
        type?: string;
        code?: string;
    };
    metadata?: Record<string, unknown>;
}
export interface AIProvider {
    readonly name: string;
    readonly supportedModels: string[];
    generateContent(request: AIProviderRequest): Promise<AIProviderResponse>;
    isAvailable(): Promise<boolean>;
    getConfig?(): Record<string, unknown>;
}
export interface DataQuery {
    filters?: Record<string, unknown>;
    select?: string[];
    orderBy?: {
        field: string;
        direction: "asc" | "desc";
    }[];
    limit?: number;
    offset?: number;
    [key: string]: unknown;
}
export interface DataResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        code?: string;
        details?: unknown;
    };
    metadata?: {
        count?: number;
        hasMore?: boolean;
        [key: string]: unknown;
    };
}
export interface DataClient {
    fetch<T = unknown>(table: string, query?: DataQuery): Promise<DataResult<T[]>>;
    fetchById<T = unknown>(table: string, id: string | number): Promise<DataResult<T>>;
    insert<T = unknown>(table: string, data: Partial<T> | Partial<T>[]): Promise<DataResult<T | T[]>>;
    update<T = unknown>(table: string, id: string | number, data: Partial<T>): Promise<DataResult<T>>;
    delete(table: string, id: string | number): Promise<DataResult<void>>;
    executeQuery?<T = unknown>(query: unknown): Promise<DataResult<T>>;
    isConnected(): Promise<boolean>;
}
export interface AIProviderConfig {
    provider: string;
    apiKey?: string;
    defaultModel?: string;
    region?: string;
    [key: string]: unknown;
}
export interface DataClientConfig {
    type: string;
    connectionString?: string;
    [key: string]: unknown;
}
//# sourceMappingURL=providers.d.ts.map