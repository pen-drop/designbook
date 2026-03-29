/**
 * Workflow lifecycle state machine.
 *
 * Manages stage transitions for the fixed lifecycle:
 *   created → planned → execute → committed → test → preview → finalizing → done
 *
 * Stages declared in workflow frontmatter (execute, test, preview) are traversed
 * in fixed order. Stages with no steps are auto-skipped.
 */

import type { StageDefinition, StageParam } from './workflow-types.js';

/** Fixed lifecycle order. Only declared stages (execute, test, preview) appear in frontmatter. */
const LIFECYCLE_ORDER = ['created', 'planned', 'execute', 'committed', 'test', 'preview', 'finalizing', 'done'];

/** Stages that can be declared in workflow frontmatter. */
export const DECLARED_STAGES = ['execute', 'test', 'preview'];

/**
 * Get the next stage in the lifecycle, skipping stages with no steps.
 * Implicit stages (committed, finalizing) are always traversed.
 *
 * @returns Next stage name, or null if lifecycle is complete.
 */
export function getNextStage(current: string, stages: Record<string, StageDefinition>): string | null {
  const currentIdx = LIFECYCLE_ORDER.indexOf(current);
  if (currentIdx === -1 || currentIdx >= LIFECYCLE_ORDER.length - 1) return null;

  for (let i = currentIdx + 1; i < LIFECYCLE_ORDER.length; i++) {
    const candidate = LIFECYCLE_ORDER[i]!;

    // Implicit stages (not in DECLARED_STAGES) are always traversed
    if (!DECLARED_STAGES.includes(candidate)) {
      return candidate;
    }

    // Declared stages: skip if not present or has no steps
    const def = stages[candidate];
    if (def && def.steps.length > 0) {
      return candidate;
    }
  }

  return null;
}

/**
 * Get the next pending step within a stage.
 *
 * The completed task has already been marked done before this is called,
 * so we simply find the first remaining pending task in the stage.
 *
 * @returns Next pending step name, or null if all tasks in the stage are done.
 */
export function getNextStep(
  currentStage: string,
  _completedStep: string,
  tasks: Array<{ stage?: string; step?: string; status: string }>,
): string | null {
  const pending = tasks.find((t) => t.stage === currentStage && t.status !== 'done');
  return pending?.step ?? null;
}

/**
 * Check if a stage has unfulfilled params.
 *
 * @returns Record of unfulfilled params with their definitions, or null if all fulfilled.
 */
export function checkStageParams(
  stage: string,
  stages: Record<string, StageDefinition>,
  provided: Record<string, unknown>,
): Record<string, StageParam> | null {
  const def = stages[stage];
  if (!def?.params) return null;

  const unfulfilled: Record<string, StageParam> = {};
  for (const [key, param] of Object.entries(def.params)) {
    if (provided[key] === undefined) {
      unfulfilled[key] = param;
    }
  }

  return Object.keys(unfulfilled).length > 0 ? unfulfilled : null;
}

/**
 * Interpolate variables in a param prompt string.
 * Replaces {key} with values from the workflow state.
 */
export function interpolatePrompt(prompt: string, state: Record<string, unknown>): string {
  return prompt.replace(/\{(\w+)\}/g, (_match, key) => {
    const value = state[key];
    return value !== undefined ? String(value) : `{${key}}`;
  });
}
