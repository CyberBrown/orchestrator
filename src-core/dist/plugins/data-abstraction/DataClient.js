"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockDataClient = exports.DataClient = void 0;
class DataClient {
    createSuccessResult(data, metadata) {
        return {
            success: true,
            data,
            metadata,
        };
    }
    createErrorResult(error, code) {
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
    validateTableName(table) {
        if (!table || table.trim().length === 0) {
            throw new Error("Table name is required");
        }
        if (!/^[a-zA-Z0-9_]+$/.test(table)) {
            throw new Error("Invalid table name. Only alphanumeric characters and underscores are allowed.");
        }
    }
    validateId(id) {
        if (id === null || id === undefined) {
            throw new Error("ID is required");
        }
        if (typeof id === "string" && id.trim().length === 0) {
            throw new Error("ID cannot be empty");
        }
    }
    buildFilters(query) {
        if (!query?.filters) {
            return {};
        }
        return query.filters;
    }
    applyPagination(query) {
        return {
            limit: query?.limit,
            offset: query?.offset,
        };
    }
    applySorting(query) {
        return query?.orderBy ?? [];
    }
}
exports.DataClient = DataClient;
class MockDataClient extends DataClient {
    constructor() {
        super(...arguments);
        this.data = new Map();
    }
    async fetch(table, query) {
        try {
            this.validateTableName(table);
            const tableData = this.data.get(table);
            if (!tableData) {
                return this.createSuccessResult([], { count: 0 });
            }
            let results = Array.from(tableData.values());
            if (query?.filters) {
                results = results.filter((item) => {
                    return Object.entries(query.filters).every(([key, value]) => {
                        return item[key] === value;
                    });
                });
            }
            if (query?.orderBy && query.orderBy.length > 0) {
                results.sort((a, b) => {
                    for (const sort of query.orderBy) {
                        const aVal = a[sort.field];
                        const bVal = b[sort.field];
                        if (aVal < bVal)
                            return sort.direction === "asc" ? -1 : 1;
                        if (aVal > bVal)
                            return sort.direction === "asc" ? 1 : -1;
                    }
                    return 0;
                });
            }
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
        }
        catch (error) {
            return this.createErrorResult(error);
        }
    }
    async fetchById(table, id) {
        try {
            this.validateTableName(table);
            this.validateId(id);
            const tableData = this.data.get(table);
            const record = tableData?.get(id);
            if (!record) {
                return this.createErrorResult(new Error(`Record not found: ${id}`), "NOT_FOUND");
            }
            return this.createSuccessResult(record);
        }
        catch (error) {
            return this.createErrorResult(error);
        }
    }
    async insert(table, data) {
        try {
            this.validateTableName(table);
            if (!this.data.has(table)) {
                this.data.set(table, new Map());
            }
            const tableData = this.data.get(table);
            const isArray = Array.isArray(data);
            const records = isArray ? data : [data];
            const results = [];
            for (const record of records) {
                const id = record.id ?? this.generateId();
                const fullRecord = { ...record, id };
                tableData.set(id, fullRecord);
                results.push(fullRecord);
            }
            return this.createSuccessResult(isArray ? results : results[0]);
        }
        catch (error) {
            return this.createErrorResult(error);
        }
    }
    async update(table, id, data) {
        try {
            this.validateTableName(table);
            this.validateId(id);
            const tableData = this.data.get(table);
            const existing = tableData?.get(id);
            if (!existing) {
                return this.createErrorResult(new Error(`Record not found: ${id}`), "NOT_FOUND");
            }
            const updated = { ...existing, ...data, id };
            tableData.set(id, updated);
            return this.createSuccessResult(updated);
        }
        catch (error) {
            return this.createErrorResult(error);
        }
    }
    async delete(table, id) {
        try {
            this.validateTableName(table);
            this.validateId(id);
            const tableData = this.data.get(table);
            if (!tableData?.has(id)) {
                return this.createErrorResult(new Error(`Record not found: ${id}`), "NOT_FOUND");
            }
            tableData.delete(id);
            return this.createSuccessResult(undefined);
        }
        catch (error) {
            return this.createErrorResult(error);
        }
    }
    async isConnected() {
        return true;
    }
    generateId() {
        return `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    clear() {
        this.data.clear();
    }
    seed(table, records) {
        if (!this.data.has(table)) {
            this.data.set(table, new Map());
        }
        const tableData = this.data.get(table);
        records.forEach((record) => {
            const id = record.id ?? this.generateId();
            tableData.set(id, { ...record, id });
        });
    }
}
exports.MockDataClient = MockDataClient;
