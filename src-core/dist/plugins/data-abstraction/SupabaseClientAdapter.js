"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseClientAdapter = void 0;
const DataClient_1 = require("./DataClient");
class SupabaseClientAdapter extends DataClient_1.DataClient {
    constructor(config) {
        super();
        this.config = config;
        this.initializeClient();
    }
    initializeClient() {
        this.client = null;
    }
    async fetch(table, query) {
        try {
            this.validateTableName(table);
            if (!this.client) {
                throw new Error("Supabase client not initialized");
            }
            let supabaseQuery = this.client
                .from(table)
                .select(query?.select?.join(",") ?? "*");
            if (query?.filters) {
                Object.entries(query.filters).forEach(([key, value]) => {
                    supabaseQuery = supabaseQuery.eq(key, value);
                });
            }
            if (query?.orderBy && query.orderBy.length > 0) {
                query.orderBy.forEach((sort) => {
                    supabaseQuery = supabaseQuery.order(sort.field, {
                        ascending: sort.direction === "asc",
                    });
                });
            }
            if (query?.limit !== undefined) {
                supabaseQuery = supabaseQuery.limit(query.limit);
            }
            if (query?.offset !== undefined) {
                supabaseQuery = supabaseQuery.range(query.offset, query.offset + (query.limit ?? 1000) - 1);
            }
            const { data, error, count } = await supabaseQuery;
            if (error) {
                return this.createErrorResult(error, error.code);
            }
            return this.createSuccessResult(data, {
                count: count ?? data?.length ?? 0,
                hasMore: query?.limit !== undefined && data?.length === query.limit,
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
                return this.createErrorResult(new Error(`Record not found: ${id}`), "NOT_FOUND");
            }
            return this.createSuccessResult(data);
        }
        catch (error) {
            return this.createErrorResult(error);
        }
    }
    async insert(table, data) {
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
            return this.createSuccessResult(result);
        }
        catch (error) {
            return this.createErrorResult(error);
        }
    }
    async update(table, id, data) {
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
            return this.createSuccessResult(updatedData);
        }
        catch (error) {
            return this.createErrorResult(error);
        }
    }
    async delete(table, id) {
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
        }
        catch (error) {
            return this.createErrorResult(error);
        }
    }
    async executeQuery(query) {
        try {
            if (!this.client) {
                throw new Error("Supabase client not initialized");
            }
            throw new Error("Custom query execution not implemented");
        }
        catch (error) {
            return this.createErrorResult(error);
        }
    }
    async isConnected() {
        try {
            if (!this.client) {
                return false;
            }
            const { error } = await this.client
                .from("_health_check")
                .select("*")
                .limit(1);
            return error?.code !== "PGRST301";
        }
        catch {
            return false;
        }
    }
    static fromEnvironment() {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !anonKey) {
            throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables are required");
        }
        return new SupabaseClientAdapter({
            url,
            anonKey,
            serviceRoleKey,
        });
    }
    getClient() {
        return this.client;
    }
}
exports.SupabaseClientAdapter = SupabaseClientAdapter;
