/**
 * Workflow Loader
 * 
 * Utility for loading and validating workflow configurations from JSON files.
 */

import type { WorkflowDefinition } from '../types/workflow';
import * as fs from 'fs';
import * as path from 'path';

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
    this.env = options.env ?? process.env as Record<string, string>;
  }

  /**
   * Load workflow from JSON file
   */
  async loadFromFile(filePath: string): Promise<WorkflowDefinition> {
    try {
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(this.baseDir, filePath);

      // Read file
      const content = await fs.promises.readFile(fullPath, 'utf-8');
      
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
        }`
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
        `Failed to parse workflow JSON: ${
          error instanceof Error ? error.message : String(error)
        }`
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
    if (typeof obj === 'string') {
      // Replace ${VAR_NAME} with environment variable value
      return obj.replace(/\$\{([^}]+)\}/g, (_, varName) => {
        return this.env[varName] ?? '';
      });
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.substituteEnvVars(item));
    }

    if (obj && typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.substituteEnvVars(value);
      }
      return result;
    }

    return obj;
  }

  /**
   * Validate workflow configuration
   */
  private validateWorkflow(workflow: unknown): void {
    if (!workflow || typeof workflow !== 'object') {
      throw new Error('Workflow must be an object');
    }

    const w = workflow as Record<string, unknown>;

    // Required fields
    if (!w.id || typeof w.id !== 'string') {
      throw new Error('Workflow must have an "id" field');
    }

    if (!w.name || typeof w.name !== 'string') {
      throw new Error('Workflow must have a "name" field');
    }

    if (!Array.isArray(w.steps) || w.steps.length === 0) {
      throw new Error('Workflow must have at least one step');
    }

    // Validate steps
    const stepIds = new Set<string>();
    for (const step of w.steps) {
      this.validateStep(step, stepIds);
      stepIds.add((step as any).stepId);
    }

    // Validate dependencies
    for (const step of w.steps) {
      const s = step as any;
      if (s.dependencies) {
        for (const depId of s.dependencies) {
          if (!stepIds.has(depId)) {
            throw new Error(
              `Step ${s.stepId} depends on non-existent step: ${depId}`
            );
          }
        }
      }
    }

    // Validate handlers
    if (w.errorHandler && typeof w.errorHandler !== 'string') {
      throw new Error('errorHandler must be a string');
    }

    if (w.successHandler && typeof w.successHandler !== 'string') {
      throw new Error('successHandler must be a string');
    }

    if (w.deadLetterHandler && typeof w.deadLetterHandler !== 'string') {
      throw new Error('deadLetterHandler must be a string');
    }
  }

  /**
   * Validate a single step
   */
  private validateStep(step: unknown, existingStepIds: Set<string>): void {
    if (!step || typeof step !== 'object') {
      throw new Error('Step must be an object');
    }

    const s = step as Record<string, unknown>;

    if (!s.stepId || typeof s.stepId !== 'string') {
      throw new Error('Step must have a "stepId" field');
    }

    if (existingStepIds.has(s.stepId as string)) {
      throw new Error(`Duplicate step ID: ${s.stepId}`);
    }

    if (!s.actionName || typeof s.actionName !== 'string') {
      throw new Error(`Step ${s.stepId} must have an "actionName" field`);
    }

    if (s.dependencies && !Array.isArray(s.dependencies)) {
      throw new Error(`Step ${s.stepId} dependencies must be an array`);
    }

    if (s.maxRetries !== undefined) {
      if (typeof s.maxRetries !== 'number' || s.maxRetries < 0) {
        throw new Error(`Step ${s.stepId} maxRetries must be a non-negative number`);
      }
    }

    if (s.timeout !== undefined) {
      if (typeof s.timeout !== 'number' || s.timeout < 1000) {
        throw new Error(`Step ${s.stepId} timeout must be at least 1000ms`);
      }
    }
  }

  /**
   * Save workflow to file
   */
  async saveToFile(
    workflow: WorkflowDefinition,
    filePath: string
  ): Promise<void> {
    try {
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(this.baseDir, filePath);

      const json = JSON.stringify(workflow, null, 2);
      await fs.promises.writeFile(fullPath, json, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to save workflow to ${filePath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

/**
 * Convenience function to load workflow
 */
export async function loadWorkflow(
  filePath: string,
  options?: WorkflowLoaderOptions
): Promise<WorkflowDefinition> {
  const loader = new WorkflowLoader(options);
  return loader.loadFromFile(filePath);
}