/**
 * Supabase Client Adapter
 *
 * Implementation of DataClient interface for Supabase.
 * Adapts the existing Supabase client code to work with the generalized framework.
 */

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
  private client: any; // Supabase client instance
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
    // In a real implementation, this would initialize the actual Supabase client
    // Example:
    // import { createClient } from '@supabase/supabase-js';
    // this.client = createClient(this.config.url, this.config.anonKey);

    this.client = null; // Placeholder
  }

  /**
   * Fetch multiple records
   */
  async fetch<T = unknown>(
    table: string,
    query?: DataQuery,
  ): Promise<DataResult<T[]>> {
    try {
      this.validateTableName(table);

      if (!this.client) {
        throw new Error("Supabase client not initialized");
      }

      // Build Supabase query
      let supabaseQuery = this.client
        .from(table)
        .select(query?.select?.join(",") ?? "*");

      // Apply filters
      if (query?.filters) {
        Object.entries(query.filters).forEach(([key, value]) => {
          supabaseQuery = supabaseQuery.eq(key, value);
        });
      }

      // Apply sorting
      if (query?.orderBy && query.orderBy.length > 0) {
        query.orderBy.forEach((sort) => {
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
        supabaseQuery = supabaseQuery.range(
          query.offset,
          query.offset + (query.limit ?? 1000) - 1,
        );
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
  async fetchById<T = unknown>(
    table: string,
    id: string | number,
  ): Promise<DataResult<T>> {
    try {
      this.validateTableName(table);
      this.validateId(id);

      if (!this.client) {
        throw new Error("Supabase client not initialized");
      }

      const { data, error } = await this.client
        .from(table)
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        return this.createErrorResult(error, error.code);
      }

      if (!data) {
        return this.createErrorResult(
          new Error(`Record not found: ${id}`),
          "NOT_FOUND",
        );
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

      if (!this.client) {
        throw new Error("Supabase client not initialized");
      }

      const { data: insertedData, error } = await this.client
        .from(table)
        .insert(data)
        .select();

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

      if (!this.client) {
        throw new Error("Supabase client not initialized");
      }

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

      if (!this.client) {
        throw new Error("Supabase client not initialized");
      }

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
  async executeQuery<T = unknown>(query: unknown): Promise<DataResult<T>> {
    try {
      if (!this.client) {
        throw new Error("Supabase client not initialized");
      }

      // Execute raw SQL or RPC call
      // This would depend on the query format
      // Example for RPC:
      // const { data, error } = await this.client.rpc('function_name', params);

      throw new Error("Custom query execution not implemented");
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  /**
   * Check if client is connected
   */
  async isConnected(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }

      // Try a simple query to check connection
      const { error } = await this.client
        .from("_health_check")
        .select("*")
        .limit(1);

      // If table doesn't exist, that's okay - we're just checking connection
      return error?.code !== "PGRST301"; // Not a connection error
    } catch {
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
  getClient(): any {
    return this.client;
  }
}
