/**
 * DataClient Interface
 * 
 * Base interface for data persistence implementations.
 * Allows the framework to work with any database (Supabase, MongoDB, PostgreSQL, etc.)
 */

import type {
  DataClient as IDataClient,
  DataQuery,
  DataResult,
} from '../../types/providers';

/**
 * Abstract base class for data clients
 */
export abstract class DataClient implements IDataClient {
  /**
   * Fetch multiple records from a table
   */
  abstract fetch<T = unknown>(
    table: string,
    query?: DataQuery
  ): Promise<DataResult<T[]>>;

  /**
   * Fetch a single record by ID
   */
  abstract fetchById<T = unknown>(
    table: string,
    id: string | number
  ): Promise<DataResult<T>>;

  /**
   * Insert new record(s)
   */
  abstract insert<T = unknown>(
    table: string,
    data: Partial<T> | Partial<T>[]
  ): Promise<DataResult<T | T[]>>;

  /**
   * Update an existing record
   */
  abstract update<T = unknown>(
    table: string,
    id: string | number,
    data: Partial<T>
  ): Promise<DataResult<T>>;

  /**
   * Delete a record
   */
  abstract delete(
    table: string,
    id: string | number
  ): Promise<DataResult<void>>;

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
  protected createSuccessResult<T>(
    data: T,
    metadata?: Record<string, unknown>
  ): DataResult<T> {
    return {
      success: true,
      data,
      metadata,
    };
  }

  /**
   * Helper method to create error result
   */
  protected createErrorResult<T = unknown>(
    error: Error | unknown,
    code?: string
  ): DataResult<T> {
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
   * Validate table name
   */
  protected validateTableName(table: string): void {
    if (!table || table.trim().length === 0) {
      throw new Error('Table name is required');
    }

    // Basic SQL injection prevention
    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
      throw new Error('Invalid table name. Only alphanumeric characters and underscores are allowed.');
    }
  }

  /**
   * Validate ID
   */
  protected validateId(id: string | number): void {
    if (id === null || id === undefined) {
      throw new Error('ID is required');
    }

    if (typeof id === 'string' && id.trim().length === 0) {
      throw new Error('ID cannot be empty');
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
    direction: 'asc' | 'desc';
  }> {
    return query?.orderBy ?? [];
  }
}

/**
 * Mock DataClient for testing
 */
export class MockDataClient extends DataClient {
  private data = new Map<string, Map<string | number, any>>();

  async fetch<T = unknown>(
    table: string,
    query?: DataQuery
  ): Promise<DataResult<T[]>> {
    try {
      this.validateTableName(table);

      const tableData = this.data.get(table);
      if (!tableData) {
        return this.createSuccessResult<T[]>([], { count: 0 });
      }

      let results = Array.from(tableData.values()) as T[];

      // Apply filters
      if (query?.filters) {
        results = results.filter(item => {
          return Object.entries(query.filters!).every(([key, value]) => {
            return (item as any)[key] === value;
          });
        });
      }

      // Apply sorting
      if (query?.orderBy && query.orderBy.length > 0) {
        results.sort((a, b) => {
          for (const sort of query.orderBy!) {
            const aVal = (a as any)[sort.field];
            const bVal = (b as any)[sort.field];
            
            if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
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

  async fetchById<T = unknown>(
    table: string,
    id: string | number
  ): Promise<DataResult<T>> {
    try {
      this.validateTableName(table);
      this.validateId(id);

      const tableData = this.data.get(table);
      const record = tableData?.get(id);

      if (!record) {
        return this.createErrorResult(
          new Error(`Record not found: ${id}`),
          'NOT_FOUND'
        );
      }

      return this.createSuccessResult(record as T);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  async insert<T = unknown>(
    table: string,
    data: Partial<T> | Partial<T>[]
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
        const id = (record as any).id ?? this.generateId();
        const fullRecord = { ...record, id } as T;
        tableData.set(id, fullRecord);
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
    data: Partial<T>
  ): Promise<DataResult<T>> {
    try {
      this.validateTableName(table);
      this.validateId(id);

      const tableData = this.data.get(table);
      const existing = tableData?.get(id);

      if (!existing) {
        return this.createErrorResult(
          new Error(`Record not found: ${id}`),
          'NOT_FOUND'
        );
      }

      const updated = { ...existing, ...data, id } as T;
      tableData!.set(id, updated);

      return this.createSuccessResult(updated);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  async delete(
    table: string,
    id: string | number
  ): Promise<DataResult<void>> {
    try {
      this.validateTableName(table);
      this.validateId(id);

      const tableData = this.data.get(table);
      if (!tableData?.has(id)) {
        return this.createErrorResult(
          new Error(`Record not found: ${id}`),
          'NOT_FOUND'
        );
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
  seed(table: string, records: any[]): void {
    if (!this.data.has(table)) {
      this.data.set(table, new Map());
    }

    const tableData = this.data.get(table)!;
    records.forEach(record => {
      const id = record.id ?? this.generateId();
      tableData.set(id, { ...record, id });
    });
  }
}