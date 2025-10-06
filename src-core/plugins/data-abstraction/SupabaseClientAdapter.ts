/**
 * Supabase Client Adapter
 *
 * Implementation of DataClient interface for Supabase.
 * Adapts the existing Supabase client code to work with the generalized framework.
 */

import { createClient, SupabaseClient as SupabaseClientType } from "@supabase/supabase-js";
import { DataClient } from "./DataClient";
import type { DataQuery, DataResult } from "../../types/providers";

/**
 * Configuration for Supabase client
 */
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

/**
 * Supabase Client Adapter
 */
export class SupabaseClientAdapter extends DataClient {
  private client!: SupabaseClientType;
  private config: SupabaseConfig;

  constructor(config: SupabaseConfig) {
    super();
    this.config = config;
    this.initializeClient();
  }

  /**
   * Initialize Supabase client
   */
  private initializeClient(): void {
    this.client = createClient(this.config.url, this.config.serviceRoleKey || this.config.anonKey);
  }

  /**
   * Fetch multiple records
   */
  async fetch<T = unknown>(table: string, query?: DataQuery): Promise<DataResult<T[]>> {
    try {
      this.validateTableName(table);

      // The select string is complex and allows for features like resource embedding.
      // It's sanitized by PostgREST, but should be constructed carefully by the calling action.
      const selectQuery = query?.select?.join(",") ?? "*";

      let supabaseQuery = this.client.from(table).select(selectQuery);

      // Apply filters
      if (query?.filters) {
        Object.entries(query.filters).forEach(([key, value]) => {
          this.validateColumnName(key);
          supabaseQuery = supabaseQuery.eq(key, value);
        });
      }

      // Apply sorting
      if (query?.orderBy && query.orderBy.length > 0) {
        query.orderBy.forEach((sort) => {
          this.validateColumnName(sort.field);
          supabaseQuery = supabaseQuery.order(sort.field, {
            ascending: sort.direction === "asc",
          });
        });
      }

      // Apply pagination
      if (query?.limit !== undefined) {
        supabaseQuery = supabaseQuery.limit(query.limit);
      }
      if (query?.offset !== undefined) {
        supabaseQuery = supabaseQuery.range(query.offset, query.offset + (query.limit ?? 1000) - 1);
      }

      // Execute query
      const { data, error, count } = await supabaseQuery;

      if (error) {
        return this.createErrorResult(error, error.code);
      }

      return this.createSuccessResult(data as T[], {
        count: count ?? data?.length ?? 0,
        hasMore: query?.limit !== undefined && data?.length === query.limit,
      });
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  /**
   * Fetch single record by ID
   */
  async fetchById<T = unknown>(table: string, id: string | number): Promise<DataResult<T>> {
    try {
      this.validateTableName(table);
      this.validateId(id);

      const { data, error } = await this.client.from(table).select("*").eq("id", id).single();

      if (error) {
        return this.createErrorResult(error, error.code);
      }

      if (!data) {
        return this.createErrorResult(new Error(`Record not found: ${id}`), "NOT_FOUND");
      }

      return this.createSuccessResult(data as T);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  /**
   * Insert new record(s)
   */
  async insert<T = unknown>(
    table: string,
    data: Partial<T> | Partial<T>[],
  ): Promise<DataResult<T | T[]>> {
    try {
      this.validateTableName(table);

      const { data: insertedData, error } = await this.client.from(table).insert(data).select();

      if (error) {
        return this.createErrorResult(error, error.code);
      }

      const result = Array.isArray(data) ? insertedData : insertedData[0];
      return this.createSuccessResult(result as T | T[]);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  /**
   * Update existing record
   */
  async update<T = unknown>(
    table: string,
    id: string | number,
    data: Partial<T>,
  ): Promise<DataResult<T>> {
    try {
      this.validateTableName(table);
      this.validateId(id);

      const { data: updatedData, error } = await this.client
        .from(table)
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return this.createErrorResult(error, error.code);
      }

      return this.createSuccessResult(updatedData as T);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  /**
   * Delete record
   */
  async delete(table: string, id: string | number): Promise<DataResult<void>> {
    try {
      this.validateTableName(table);
      this.validateId(id);

      const { error } = await this.client.from(table).delete().eq("id", id);

      if (error) {
        return this.createErrorResult(error, error.code);
      }

      return this.createSuccessResult(undefined);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  /**
   * Execute custom query
   */
  async executeQuery<T = unknown>(_query: unknown): Promise<DataResult<T>> {
    try {
      // For security, raw query execution is disabled by default.
      // To enable it, this method must be implemented carefully.
      // Example for RPC:
      // if (typeof query === 'object' && query !== null && 'functionName' in query) {
      //   const { functionName, params } = query as { functionName: string, params: any };
      //   this.validateIdentifier(functionName, 'RPC function');
      //   const { data, error } = await this.client.rpc(functionName, params);
      //   if (error) return this.createErrorResult(error, error.code);
      //   return this.createSuccessResult(data as T);
      // }

      throw new Error("Custom query execution not implemented for security reasons.");
    } catch (_e) {
      return this.createErrorResult(_e);
    }
  }

  /**
   * Check if client is connected
   */
  async isConnected(): Promise<boolean> {
    try {
      // The Supabase client doesn't have a direct connection check.
      // We can infer connectivity by making a lightweight request.
      const { error } = await this.client
        .from("__health_check_table_that_does_not_exist__") // A non-existent table
        .select("id")
        .limit(1);

      // If we get a 'relation does not exist' error, the connection is fine.
      if (error && error.code === "42P01") {
        return true;
      }

      // If there's no error, it's also fine (though unlikely).
      if (!error) {
        return true;
      }

      // Any other error suggests a connection problem.
      return false;
    } catch (_e) {
      return false;
    }
  }

  /**
   * Create Supabase adapter from environment variables
   */
  static fromEnvironment(): SupabaseClientAdapter {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables are required",
      );
    }

    return new SupabaseClientAdapter({
      url,
      anonKey,
      serviceRoleKey,
    });
  }

  /**
   * Get Supabase client instance (for advanced usage)
   */
  getClient(): SupabaseClientType {
    return this.client;
  }
}
