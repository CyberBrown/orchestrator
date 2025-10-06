"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalActionRegistry = exports.ActionRegistry = void 0;
class ActionRegistry {
    constructor() {
        this.actions = new Map();
    }
    register(action) {
        if (!action.id || action.id.trim().length === 0) {
            throw new Error("Action ID is required");
        }
        if (this.actions.has(action.id)) {
            console.warn(`Action ${action.id} is already registered. Overwriting.`);
        }
        this.actions.set(action.id, action);
    }
    registerMany(actions) {
        actions.forEach((action) => this.register(action));
    }
    get(actionId) {
        return this.actions.get(actionId);
    }
    has(actionId) {
        return this.actions.has(actionId);
    }
    list() {
        return Array.from(this.actions.keys());
    }
    getAll() {
        return Array.from(this.actions.values());
    }
    unregister(actionId) {
        return this.actions.delete(actionId);
    }
    clear() {
        this.actions.clear();
    }
    getStats() {
        return {
            totalActions: this.actions.size,
            actionIds: this.list(),
        };
    }
}
exports.ActionRegistry = ActionRegistry;
exports.globalActionRegistry = new ActionRegistry();
