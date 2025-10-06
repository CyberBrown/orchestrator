import type { Action, ActionRegistry as IActionRegistry } from "../types/action";
export declare class ActionRegistry implements IActionRegistry {
    private actions;
    register(action: Action): void;
    registerMany(actions: Action[]): void;
    get(actionId: string): Action | undefined;
    has(actionId: string): boolean;
    list(): string[];
    getAll(): Action[];
    unregister(actionId: string): boolean;
    clear(): void;
    getStats(): {
        totalActions: number;
        actionIds: string[];
    };
}
export declare const globalActionRegistry: ActionRegistry;
//# sourceMappingURL=ActionRegistry.d.ts.map