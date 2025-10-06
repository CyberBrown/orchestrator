import type { DataClient as IDataClient, DataQuery, DataResult } from "../../types/providers";
export declare abstract class DataClient implements IDataClient {
    abstract fetch<T = unknown>(table: string, query?: DataQuery): Promise<DataResult<T[]>>;
    abstract fetchById<T = unknown>(table: string, id: string | number): Promise<DataResult<T>>;
    abstract insert<T = unknown>(table: string, data: Partial<T> | Partial<T>[]): Promise<DataResult<T | T[]>>;
    abstract update<T = unknown>(table: string, id: string | number, data: Partial<T>): Promise<DataResult<T>>;
    abstract delete(table: string, id: string | number): Promise<DataResult<void>>;
    abstract isConnected(): Promise<boolean>;
    executeQuery?<T = unknown>(query: unknown): Promise<DataResult<T>>;
    protected createSuccessResult<T>(data: T, metadata?: Record<string, unknown>): DataResult<T>;
    protected createErrorResult<T = unknown>(error: Error | unknown, code?: string): DataResult<T>;
    protected validateIdentifier(identifier: string, type: string): void;
    protected validateTableName(table: string): void;
    protected validateColumnName(column: string): void;
    protected validateId(id: string | number): void;
    protected buildFilters(query?: DataQuery): Record<string, unknown>;
    protected applyPagination(query?: DataQuery): {
        limit?: number;
        offset?: number;
    };
    protected applySorting(query?: DataQuery): Array<{
        field: string;
        direction: "asc" | "desc";
    }>;
}
export declare class MockDataClient extends DataClient {
    private data;
    fetch<T = unknown>(table: string, query?: DataQuery): Promise<DataResult<T[]>>;
    fetchById<T = unknown>(table: string, id: string | number): Promise<DataResult<T>>;
    insert<T = unknown>(table: string, data: Partial<T> | Partial<T>[]): Promise<DataResult<T | T[]>>;
    update<T = unknown>(table: string, id: string | number, data: Partial<T>): Promise<DataResult<T>>;
    delete(table: string, id: string | number): Promise<DataResult<void>>;
    isConnected(): Promise<boolean>;
    private generateId;
    clear(): void;
    seed(table: string, records: Array<Record<string, unknown>>): void;
}
//# sourceMappingURL=DataClient.d.ts.map