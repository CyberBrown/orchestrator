/**
 * Provider Abstraction Types
 *
 * These interfaces define contracts for pluggable AI providers and data clients,
 * allowing the framework to work with any backend service.
 */

/**
 * Request to an AI provider
 */
export interface AIProviderRequest {
  /** The prompt or input text */
  prompt: string;

  /** System instruction or context */
  systemInstruction?: string;

  /** Model identifier */
  modelId?: string;

  /** Temperature for generation (0-1) */
  temperature?: number;

  /** Maximum tokens to generate */
  maxTokens?: number;

  /** Stop sequences */
  stopSequences?: string[];

  /** Additional provider-specific parameters */
  parameters?: Record<string, unknown>;
}

/**
 * Response from an AI provider
 */
export interface AIProviderResponse {
  /** Generated content */
  content: string;

  /** Whether the request succeeded */
  success: boolean;

  /** Provider name */
  provider: string;

  /** Model used */
  model: string;

  /** Token usage information */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  /** Error information if failed */
  error?: {
    message: string;
    type?: string;
    code?: string;
  };

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Interface for AI provider implementations
 */
export interface AIProvider {
  /** Provider name */
  readonly name: string;

  /** Supported models */
  readonly supportedModels: string[];

  /**
   * Generate content using the AI provider
   * @param request - Request parameters
   * @returns Generated response
   */
  generateContent(request: AIProviderRequest): Promise<AIProviderResponse>;

  /**
   * Check if the provider is available and configured
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get provider-specific configuration
   */
  getConfig?(): Record<string, unknown>;
}

/**
 * Query parameters for data operations
 */
export interface DataQuery {
  /** Filters to apply */
  filters?: Record<string, unknown>;

  /** Fields to select */
  select?: string[];

  /** Sorting */
  orderBy?: {
    field: string;
    direction: "asc" | "desc";
  }[];

  /** Pagination */
  limit?: number;
  offset?: number;

  /** Additional query parameters */
  [key: string]: unknown;
}

/**
 * Result of a data operation
 */
export interface DataResult<T = unknown> {
  /** Whether the operation succeeded */
  success: boolean;

  /** Retrieved or modified data */
  data?: T;

  /** Error information if failed */
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };

  /** Metadata about the operation */
  metadata?: {
    count?: number;
    hasMore?: boolean;
    [key: string]: unknown;
  };
}

/**
 * Interface for data client implementations
 */
export interface DataClient {
  /**
   * Fetch data from a table/collection
   * @param table - Table or collection name
   * @param query - Query parameters
   * @returns Query result
   */
  fetch<T = unknown>(table: string, query?: DataQuery): Promise<DataResult<T[]>>;

  /**
   * Fetch a single record by ID
   * @param table - Table or collection name
   * @param id - Record ID
   * @returns Single record result
   */
  fetchById<T = unknown>(table: string, id: string | number): Promise<DataResult<T>>;

  /**
   * Insert new data
   * @param table - Table or collection name
   * @param data - Data to insert
   * @returns Insert result
   */
  insert<T = unknown>(table: string, data: Partial<T> | Partial<T>[]): Promise<DataResult<T | T[]>>;

  /**
   * Update existing data
   * @param table - Table or collection name
   * @param id - Record ID
   * @param data - Data to update
   * @returns Update result
   */
  update<T = unknown>(table: string, id: string | number, data: Partial<T>): Promise<DataResult<T>>;

  /**
   * Delete data
   * @param table - Table or collection name
   * @param id - Record ID
   * @returns Delete result
   */
  delete(table: string, id: string | number): Promise<DataResult<void>>;

  /**
   * Execute a custom query
   * @param query - Custom query object
   * @returns Query result
   */
  executeQuery?<T = unknown>(query: unknown): Promise<DataResult<T>>;

  /**
   * Check if the client is connected and ready
   */
  isConnected(): Promise<boolean>;
}

/**
 * Configuration for AI provider
 */
export interface AIProviderConfig {
  /** Provider type (e.g., 'vertex', 'openai', 'anthropic') */
  provider: string;

  /** API key or credentials */
  apiKey?: string;

  /** Default model to use */
  defaultModel?: string;

  /** Region or endpoint */
  region?: string;

  /** Additional configuration */
  [key: string]: unknown;
}

/**
 * Configuration for data client
 */
export interface DataClientConfig {
  /** Client type (e.g., 'supabase', 'mongodb', 'postgres') */
  type: string;

  /** Connection string or URL */
  connectionString?: string;

  /** Additional configuration */
  [key: string]: unknown;
}
