import jsonata from 'jsonata';

export type EachDeclaration = Record<string, string | { expr: string; schema?: unknown }>;

function getExpr(value: string | { expr: string }): string {
  return typeof value === 'string' ? value : value.expr;
}

export async function resolveEach(
  each: EachDeclaration,
  scope: Record<string, unknown>,
): Promise<Array<Record<string, unknown>>> {
  const axes: Array<{ binding: string; items: unknown[] }> = [];

  for (const [binding, raw] of Object.entries(each)) {
    const expr = getExpr(raw);
    const value = await jsonata(expr).evaluate(scope);
    if (value === undefined || value === null) return [];
    const items = Array.isArray(value) ? value : [value];
    if (items.length === 0) return [];
    axes.push({ binding, items });
  }

  let combos: Array<Record<string, unknown>> = [{}];
  for (const { binding, items } of axes) {
    const next: Array<Record<string, unknown>> = [];
    for (const combo of combos) {
      for (const item of items) {
        next.push({ ...combo, [binding]: item });
      }
    }
    combos = next;
  }

  const total = combos.length;
  return combos.map((c, i) => ({ ...c, $i: i, $total: total }));
}
