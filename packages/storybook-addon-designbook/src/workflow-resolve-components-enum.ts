/**
 * Clone a compiled schema map and inject an `enum:` into ComponentNode.component
 * when a non-empty inventory is provided. Returns a new object — does not mutate
 * the input.
 */
export function injectComponentsEnum(schemas: Record<string, unknown>, inventory: string[]): Record<string, unknown> {
  if (inventory.length === 0) return schemas;
  const clone = JSON.parse(JSON.stringify(schemas)) as Record<
    string,
    Record<string, Record<string, Record<string, unknown>>>
  >;
  const node = clone.ComponentNode as Record<string, Record<string, Record<string, unknown>>> | undefined;
  const compProp = node?.properties?.component as Record<string, unknown> | undefined;
  if (compProp) {
    compProp.enum = [...inventory];
  }
  return clone as unknown as Record<string, unknown>;
}

/** Minimal task shape needed to locate the component inventory. */
interface TaskWithInventory {
  stage?: string;
  params?: Record<string, unknown>;
}

/** True when a task's `components` param holds a non-empty inventory of `{id}` entries. */
function hasComponentInventory(task: TaskWithInventory): boolean {
  const raw = task.params?.['components'];
  if (!Array.isArray(raw)) return false;
  return raw.some((c) => c && typeof c === 'object' && typeof (c as Record<string, unknown>)['id'] === 'string');
}

/**
 * The stage that owns the component inventory — the first task carrying a
 * `components` param. This is the stage from which the injected
 * `ComponentNode.component` enum (the indexed/created components) becomes
 * authoritative. Returns `undefined` when no task declares an inventory.
 */
export function componentInventoryStage(tasks: TaskWithInventory[]): string | undefined {
  return tasks.find(hasComponentInventory)?.stage;
}

/** Return a clone of `schemas` with the `ComponentNode.component` enum removed. */
export function stripComponentsEnum(schemas: Record<string, unknown>): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(schemas)) as Record<
    string,
    Record<string, Record<string, Record<string, unknown>>>
  >;
  const compProp = clone.ComponentNode?.properties?.component as Record<string, unknown> | undefined;
  if (compProp && 'enum' in compProp) {
    delete compProp.enum;
  }
  return clone as unknown as Record<string, unknown>;
}

/**
 * Choose the schema map to validate a result against at `currentStage`.
 *
 * The `ComponentNode.component` enum is injected from the live Storybook index
 * (or the planned inventory) and constrains component references to already
 * indexed components. Stages that run **before** the component stage plan
 * brand-new components that are not yet indexed — applying the enum there
 * rejects a legitimate plan (the M3 blocker). At those pre-component stages the
 * enum is stripped for result validation; at the component stage and later it is
 * kept unchanged. When the component stage or current stage cannot be located,
 * the schemas are returned untouched (fail open — never loosen more than needed).
 */
export function schemasForResultValidation(
  schemas: Record<string, unknown>,
  stageNames: string[],
  tasks: TaskWithInventory[],
  currentStage?: string,
): Record<string, unknown> {
  const componentStage = componentInventoryStage(tasks);
  if (!componentStage || !currentStage) return schemas;
  const currentIdx = stageNames.indexOf(currentStage);
  const componentIdx = stageNames.indexOf(componentStage);
  if (currentIdx === -1 || componentIdx === -1) return schemas;
  if (currentIdx >= componentIdx) return schemas;
  return stripComponentsEnum(schemas);
}
