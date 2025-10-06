/**
 * Workflow Loader
 *
 * Utility for loading and validating workflow configurations from JSON files.
 */

import { z } from "zod";
import { WorkflowDefinitionSchema, WorkflowDefinition } from "../types/schemas";
import * as fs from "fs";
import * as path from "path";

/**
 * Options for workflow loader
 */
export interface WorkflowLoaderOptions {
  /** Base directory for workflow files */
  baseDir?: string;

  /** Whether to validate against schema */
  validate?: boolean;

  /** Environment variables to substitute */
  env?: Record<string, string>;
}

/**
 * Workflow Loader class
 */
export class WorkflowLoader {
  private baseDir: string;
  private validate: boolean;
  private env: Record<string, string>;

  constructor(options: WorkflowLoaderOptions = {}) {
    this.baseDir = options.baseDir ?? process.cwd();
    this.validate = options.validate ?? true;
    this.env = options.env ?? (process.env as Record<string, string>);
  }

  /**
   * Load workflow from JSON file
   */
  async loadFromFile(filePath: string): Promise<WorkflowDefinition> {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.baseDir, filePath);

      // Read file
      const content = await fs.promises.readFile(fullPath, "utf-8");

      // Parse JSON
      const json = JSON.parse(content);

      // Substitute environment variables
      const substituted = this.substituteEnvVars(json);

      // Validate if enabled
      if (this.validate) {
        this.validateWorkflow(substituted);
      }

      return substituted as WorkflowDefinition;
    } catch (error) {
      throw new Error(
        `Failed to load workflow from ${filePath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Load workflow from JSON string
   */
  loadFromString(json: string): WorkflowDefinition {
    try {
      const parsed = JSON.parse(json);
      const substituted = this.substituteEnvVars(parsed);

      if (this.validate) {
        this.validateWorkflow(substituted);
      }

      return substituted as WorkflowDefinition;
    } catch (error) {
      throw new Error(
        `Failed to parse workflow JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Load workflow from object
   */
  loadFromObject(obj: unknown): WorkflowDefinition {
    const substituted = this.substituteEnvVars(obj);

    if (this.validate) {
      this.validateWorkflow(substituted);
    }

    return substituted as WorkflowDefinition;
  }

  /**
   * Substitute environment variables in workflow config
   */
  private substituteEnvVars(obj: unknown): unknown {
    if (typeof obj === "string") {
      // Replace ${VAR_NAME} with environment variable value
      return obj.replace(/\$\{([^}]+)\}/g, (_, varName) => {
        return this.env[varName] ?? "";
      });
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.substituteEnvVars(item));
    }

    if (obj && typeof obj === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.substituteEnvVars(value);
      }
      return result;
    }

    return obj;
  }

  /**
   * Validate workflow configuration using Zod schema.
   */
  private validateWorkflow(workflow: unknown): void {
    try {
      WorkflowDefinitionSchema.parse(workflow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors
          .map((e) => `(${e.path.join(".")}) ${e.message}`)
          .join("; ");
        throw new Error(`Workflow validation failed: ${errorMessages}`);
      }
      throw error;
    }
  }

  /**
   * Save workflow to file
   */
  async saveToFile(workflow: WorkflowDefinition, filePath: string): Promise<void> {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.baseDir, filePath);

      const json = JSON.stringify(workflow, null, 2);
      await fs.promises.writeFile(fullPath, json, "utf-8");
    } catch (error) {
      throw new Error(
        `Failed to save workflow to ${filePath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

/**
 * Convenience function to load workflow
 */
export async function loadWorkflow(
  filePath: string,
  options?: WorkflowLoaderOptions,
): Promise<WorkflowDefinition> {
  const loader = new WorkflowLoader(options);
  return loader.loadFromFile(filePath);
}
