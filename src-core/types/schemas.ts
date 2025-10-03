/**
 * Zod Schemas for Workflow Types
 */

import { z } from 'zod';

export const WorkflowStatusSchema = z.enum([
  'pending',
  'in_progress',
  'pending_human_review',
  'success',
  'failed',
  'timed_out',
  'retrying',
  'paused',
  'canceled',
  'validation_failed',
]);

export const WorkflowStepSchema = z.object({
  stepId: z.string().min(1),
  actionName: z.string().min(1),
  displayName: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
  requiresHumanReview: z.boolean().optional(),
  maxRetries: z.number().min(0).optional(),
  timeout: z.number().min(1000).optional(),
});

export const WorkflowDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  steps: z.array(WorkflowStepSchema).min(1),
  errorHandler: z.string().optional(),
  successHandler: z.string().optional(),
  deadLetterHandler: z.string().optional(),
  fallbackMap: z.record(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
});

// Export inferred types for convenience
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
