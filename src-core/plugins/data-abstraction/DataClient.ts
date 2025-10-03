/**
 * DataClient Interface
 *
 * Base interface for data persistence implementations.
 * Allows the framework to work with any database (Supabase, MongoDB, PostgreSQL, etc.)
 */

import type { DataClient as IDataClient, DataQuery, DataResult } from "../../types/providers";

/**
 * Abstract base class for data clients
 */
export abstract class DataClient implements IDataClient {
  /**
   * Fetch multiple records from a table
   */
  abstract fetch<T = unknown>(table: string, query?: DataQuery): Promise<DataResult<T[]>>;

  /**
   * Fetch a single record by ID
   */
  abstract fetchById<T = unknown>(table: string, id: string | number): Promise<DataResult<T>>;

  /**
   * Insert new record(s)
   */
  abstract insert<T = unknown>(
    table: string,
    data: Partial<T> | Partial<T>[],
  ): Promise<DataResult<T | T[]>>;

  /**
   * Update an existing record
   */
  abstract update<T = unknown>(
    table: string,
    id: string | number,
    data: Partial<T>,
  ): Promise<DataResult<T>>;

  /**
   * Delete a record
   */
  abstract delete(table: string, id: string | number): Promise<DataResult<void>>;

  /**
   * Check if client is connected
   */
  abstract isConnected(): Promise<boolean>;

  /**
   * Execute a custom query (optional)
   */
  executeQuery?<T = unknown>(query: unknown): Promise<DataResult<T>>;

  /**
   * Helper method to create success result
   */
  protected createSuccessResult<T>(data: T, metadata?: Record<string, unknown>): DataResult<T> {
    return {
      success: true,
      data,
      metadata,
    };
  }

  /**
   * Helper method to create error result
   */
  protected createErrorResult<T = unknown>(error: Error | unknown, code?: string): DataResult<T> {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      error: {
        message: errorMessage,
        code,
        details: error,
      },
    };
  }

  /**
   * Validate an identifier (table or column name)
   */
  protected validateIdentifier(identifier: string, type: string): void {
    if (!identifier || identifier.trim().length === 0) {
      throw new Error(`${type} name is required`);
    }

    // Stricter regex for SQL identifiers
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
      throw new Error(
        `Invalid ${type} name. Only alphanumeric characters and underscores are allowed, and it cannot start with a number.`,
      );
    }
  }

  /**
   * Validate table name
   */
  protected validateTableName(table: string): void {
    this.validateIdentifier(table, "Table");
  }

  /**
   * Validate column name
   */
  protected validateColumnName(column: string): void {
    this.validateIdentifier(column, "Column");
  }

  /**
   * Validate ID
   */
  protected validateId(id: string | number): void {
    if (id === null || id === undefined) {
      throw new Error("ID is required");
    }

    if (typeof id === "string" && id.trim().length === 0) {
      throw new Error("ID cannot be empty");
    }
  }

  /**
   * Build query filters
   */
  protected buildFilters(query?: DataQuery): Record<string, unknown> {
    if (!query?.filters) {
      return {};
    }

    return query.filters;
  }

  /**
   * Apply pagination
   */
  protected applyPagination(query?: DataQuery): {
    limit?: number;
    offset?: number;
  } {
    return {
      limit: query?.limit,
      offset: query?.offset,
    };
  }

  /**
   * Apply sorting
   */
  protected applySorting(query?: DataQuery): Array<{
    field: string;
    direction: "asc" | "desc";
  }> {
    return query?.orderBy ?? [];
  }
}

/**
 * Mock DataClient for testing
 */
export class MockDataClient extends DataClient {
  private data = new Map<string, Map<string | number, unknown>>();

  async fetch<T = unknown>(table: string, query?: DataQuery): Promise<DataResult<T[]>> {
    try {
      this.validateTableName(table);

      const tableData = this.data.get(table);
      if (!tableData) {
        return this.createSuccessResult<T[]>([], { count: 0 });
      }

      let results = Array.from(tableData.values()) as T[];

      // Apply filters
      if (query?.filters) {
        results = results.filter((item) => {
          return Object.entries(query.filters!).every(([key, value]) => {
            const rec = item as Record<string, unknown>;
            return rec[key] === value;
          });
        });
      }

      // Apply sorting
      if (query?.orderBy && query.orderBy.length > 0) {
        results.sort((a, b) => {
          for (const sort of query.orderBy!) {
            const aVal = (a as Record<string, unknown>)[sort.field] as unknown as number | string;
            const bVal = (b as Record<string, unknown>)[sort.field] as unknown as number | string;

            if (aVal < bVal) return sort.direction === "asc" ? -1 : 1;
            if (aVal > bVal) return sort.direction === "asc" ? 1 : -1;
          }
          return 0;
        });
      }

      // Apply pagination
      const { limit, offset } = this.applyPagination(query);
      if (offset !== undefined) {
        results = results.slice(offset);
      }
      if (limit !== undefined) {
        results = results.slice(0, limit);
      }

      return this.createSuccessResult(results, {
        count: results.length,
        hasMore: limit !== undefined && results.length === limit,
      });
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  async fetchById<T = unknown>(table: string, id: string | number): Promise<DataResult<T>> {
    try {
      this.validateTableName(table);
      this.validateId(id);

      const tableData = this.data.get(table);
      const record = tableData?.get(id);

      if (!record) {
        return this.createErrorResult(new Error(`Record not found: ${id}`), "NOT_FOUND");
      }

      return this.createSuccessResult(record as T);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  async insert<T = unknown>(
    table: string,
    data: Partial<T> | Partial<T>[],
  ): Promise<DataResult<T | T[]>> {
    try {
      this.validateTableName(table);

      if (!this.data.has(table)) {
        this.data.set(table, new Map());
      }

      const tableData = this.data.get(table)!;
      const isArray = Array.isArray(data);
      const records = isArray ? data : [data];
      const results: T[] = [];

      for (const record of records) {
        const rec = record as Record<string, unknown>;
        const id = (rec.id as string | number | undefined) ?? this.generateId();
        const fullRecord = { ...rec, id } as T;
        tableData.set(id as string | number, fullRecord as unknown);
        results.push(fullRecord);
      }

      return this.createSuccessResult(isArray ? results : results[0]);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  async update<T = unknown>(
    table: string,
    id: string | number,
    data: Partial<T>,
  ): Promise<DataResult<T>> {
    try {
      this.validateTableName(table);
      this.validateId(id);

      const tableData = this.data.get(table);
      const existing = tableData?.get(id);

      if (!existing) {
        return this.createErrorResult(new Error(`Record not found: ${id}`), "NOT_FOUND");
      }

      const updated = { ...existing, ...data, id } as T;
      tableData!.set(id, updated);

      return this.createSuccessResult(updated);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  async delete(table: string, id: string | number): Promise<DataResult<void>> {
    try {
      this.validateTableName(table);
      this.validateId(id);

      const tableData = this.data.get(table);
      if (!tableData?.has(id)) {
        return this.createErrorResult(new Error(`Record not found: ${id}`), "NOT_FOUND");
      }

      tableData.delete(id);
      return this.createSuccessResult(undefined);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  async isConnected(): Promise<boolean> {
    return true;
  }

  private generateId(): string {
    return `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Clear all data (useful for testing)
   */
  clear(): void {
    this.data.clear();
  }

  /**
   * Seed data for testing
   */
  seed(table: string, records: Array<Record<string, unknown>>): void {
    if (!this.data.has(table)) {
      this.data.set(table, new Map());
    }

    const tableData = this.data.get(table)!;
    records.forEach((record) => {
      const id = (record as Record<string, unknown>).id ?? this.generateId();
      tableData.set(id as string | number, { ...record, id });
    });
  }
}
