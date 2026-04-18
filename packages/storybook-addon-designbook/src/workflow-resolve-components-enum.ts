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
