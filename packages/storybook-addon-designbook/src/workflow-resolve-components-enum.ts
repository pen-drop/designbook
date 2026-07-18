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

/** Minimal stage-definition shape needed to locate the component stage. */
interface StageWithSteps {
  steps?: string[];
}

/**
 * The canonical step that creates (and thereby indexes) components. Every design
 * workflow (design-shell / -component / -screen / -entity) fans this step out over
 * the planned inventory; it is the boundary from which the injected
 * `ComponentNode.component` enum becomes authoritative.
 */
const COMPONENT_CREATE_STEP = 'create-component';

/**
 * The stage that owns the component inventory — the stage whose definition declares
 * the `create-component` step. This is located from the **stage definitions**, not
 * the task list: on a fresh run the `create-component` tasks are not expanded yet at
 * pre-component stages, and the `intake` task legitimately carries a `components`
 * reuse param (the live-index inventory). Locating by task param therefore mis-picks
 * `intake` as the component stage (review CID 563); the stage definitions carry the
 * `create-component` step from workflow-create time onward. Returns `undefined` when
 * no stage declares the step (fail open — the enum is left untouched).
 */
export function componentInventoryStage(stages: Record<string, StageWithSteps>): string | undefined {
  for (const [stage, def] of Object.entries(stages)) {
    if (def?.steps?.includes(COMPONENT_CREATE_STEP)) return stage;
  }
  return undefined;
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
  stages: Record<string, StageWithSteps>,
  currentStage?: string,
): Record<string, unknown> {
  const componentStage = componentInventoryStage(stages);
  if (!componentStage || !currentStage) return schemas;
  const stageNames = Object.keys(stages);
  const currentIdx = stageNames.indexOf(currentStage);
  const componentIdx = stageNames.indexOf(componentStage);
  if (currentIdx === -1 || componentIdx === -1) return schemas;
  if (currentIdx >= componentIdx) return schemas;
  return stripComponentsEnum(schemas);
}
