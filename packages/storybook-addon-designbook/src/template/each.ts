import jsonata from 'jsonata';

export type EachDeclaration = Record<string, string | { expr: string; schema?: unknown }>;

function getExpr(value: string | { expr: string }): string {
  return typeof value === 'string' ? value : value.expr;
}

export async function resolveEach(
  each: EachDeclaration,
  scope: Record<string, unknown>,
): Promise<Array<Record<string, unknown>>> {
  const entries = Object.entries(each);
  if (entries.length === 0) return [];

  // Lazy cross-product: each axis' expression evaluates against the scope
  // enriched with already-bound axes. This lets the variant axis see the
  // current component binding via {{ component.variants }}.
  let combos: Array<Record<string, unknown>> = [{}];
  for (const [binding, raw] of entries) {
    const expr = getExpr(raw);
    const next: Array<Record<string, unknown>> = [];
    for (const combo of combos) {
      const innerScope = { ...scope, ...combo };
      const value = await jsonata(expr).evaluate(innerScope);
      if (value === undefined || value === null) continue;
      const items = Array.isArray(value) ? value : [value];
      for (const item of items) {
        next.push({ ...combo, [binding]: item });
      }
    }
    combos = next;
    if (combos.length === 0) break;
  }

  const total = combos.length;
  return combos.map((c, i) => ({ ...c, $i: i, $total: total }));
}
