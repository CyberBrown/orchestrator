import { describe, it, expect, vi } from 'vitest';
import { Orchestrator } from './Orchestrator';
import type { ActionRegistry } from '../types/action';
import type { WorkflowDefinition, WorkflowState } from '../types/workflow';

describe('Orchestrator', () => {
  it('should be created with an action registry', () => {
    const actionRegistry: ActionRegistry = {
      register: vi.fn(),
      get: vi.fn(),
      has: vi.fn(),
      list: vi.fn(),
      unregister: vi.fn(),
    };

    const orchestrator = new Orchestrator({ actionRegistry });
    expect(orchestrator).toBeDefined();
  });

  it('should handle a simple pending workflow', async () => {
    const actionRegistry: ActionRegistry = {
      register: vi.fn(),
      get: vi.fn().mockReturnValue({
        id: 'test-action',
        name: 'Test Action',
        execute: async () => ({ success: true, output: 'done' }),
      }),
      has: vi.fn().mockReturnValue(true),
      list: vi.fn(),
      unregister: vi.fn(),
    };

    const orchestrator = new Orchestrator({ actionRegistry });

    const workflow: WorkflowDefinition = {
      workflowId: 'test-workflow',
      name: 'Test Workflow',
      steps: [{ stepId: 'step1', actionName: 'test-action' }],
    };

    const state: WorkflowState = {
      workflowId: 'test-workflow',
      status: 'pending',
      runningStepIds: [],
      history: [],
      context: {
        workflowId: 'test-workflow',
        input: {},
        outputs: {},
        sharedState: {},
      },
    };

    const result = await orchestrator.orchestrate(state, workflow);

    expect(result.nextAction.action).toBeUndefined();
    expect(result.nextAction.stepIds).toEqual(['step1']);
    expect(result.updatedState.status).toBe('in_progress');
  });
});