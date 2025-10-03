/**
 * Action Registry
 *
 * Central registry for managing workflow actions.
 * Allows dynamic registration and retrieval of actions.
 */

import type {
  Action,
  ActionRegistry as IActionRegistry,
} from "../types/action";

/**
 * Implementation of ActionRegistry
 */
export class ActionRegistry implements IActionRegistry {
  private actions = new Map<string, Action>();

  /**
   * Register an action
   */
  register(action: Action): void {
    if (!action.id || action.id.trim().length === 0) {
      throw new Error("Action ID is required");
    }

    if (this.actions.has(action.id)) {
      console.warn(`Action ${action.id} is already registered. Overwriting.`);
    }

    this.actions.set(action.id, action);
  }

  /**
   * Register multiple actions at once
   */
  registerMany(actions: Action[]): void {
    actions.forEach((action) => this.register(action));
  }

  /**
   * Get an action by ID
   */
  get(actionId: string): Action | undefined {
    return this.actions.get(actionId);
  }

  /**
   * Check if an action is registered
   */
  has(actionId: string): boolean {
    return this.actions.has(actionId);
  }

  /**
   * Get all registered action IDs
   */
  list(): string[] {
    return Array.from(this.actions.keys());
  }

  /**
   * Get all registered actions
   */
  getAll(): Action[] {
    return Array.from(this.actions.values());
  }

  /**
   * Unregister an action
   */
  unregister(actionId: string): boolean {
    return this.actions.delete(actionId);
  }

  /**
   * Clear all registered actions
   */
  clear(): void {
    this.actions.clear();
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalActions: number;
    actionIds: string[];
  } {
    return {
      totalActions: this.actions.size,
      actionIds: this.list(),
    };
  }
}

/**
 * Global action registry instance
 */
export const globalActionRegistry = new ActionRegistry();
