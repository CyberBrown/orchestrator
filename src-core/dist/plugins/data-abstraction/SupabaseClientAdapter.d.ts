import { SupabaseClient as SupabaseClientType } from "@supabase/supabase-js";
import { DataClient } from "./DataClient";
import type { DataQuery, DataResult } from "../../types/providers";
export interface SupabaseConfig {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
}
export declare class SupabaseClientAdapter extends DataClient {
    private client;
    private config;
    constructor(config: SupabaseConfig);
    private initializeClient;
    fetch<T = unknown>(table: string, query?: DataQuery): Promise<DataResult<T[]>>;
    fetchById<T = unknown>(table: string, id: string | number): Promise<DataResult<T>>;
    insert<T = unknown>(table: string, data: Partial<T> | Partial<T>[]): Promise<DataResult<T | T[]>>;
    update<T = unknown>(table: string, id: string | number, data: Partial<T>): Promise<DataResult<T>>;
    delete(table: string, id: string | number): Promise<DataResult<void>>;
    executeQuery<T = unknown>(_query: unknown): Promise<DataResult<T>>;
    isConnected(): Promise<boolean>;
    static fromEnvironment(): SupabaseClientAdapter;
    getClient(): SupabaseClientType;
}
//# sourceMappingURL=SupabaseClientAdapter.d.ts.map