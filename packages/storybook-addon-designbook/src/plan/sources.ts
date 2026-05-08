export type InputSource =
  | { kind: 'file'; name: string; path: string }
  | { kind: 'iteration'; name: string; expr: string }
  | { kind: 'produced'; name: string; stage: string; task: string }
  | { kind: 'workflow'; name: string };

export interface PriorTaskOutput {
  stage: string;
  task: string;
  properties: Record<string, unknown>;
}

export function classifyInputs(
  paramProperties: Record<string, unknown>,
  eachKeys: Record<string, { expr?: string }>,
  priorOutputs: PriorTaskOutput[],
): InputSource[] {
  const out: InputSource[] = [];

  for (const [name, declRaw] of Object.entries(paramProperties)) {
    const decl = (declRaw && typeof declRaw === 'object' ? declRaw : {}) as Record<string, unknown>;

    if (typeof decl.path === 'string') {
      out.push({ kind: 'file', name, path: decl.path });
      continue;
    }

    // Order matters: iteration before produced. An each-item name (e.g. `issue`)
    // can collide with an upstream result name; iteration semantics win.
    if (name in eachKeys) {
      const expr = typeof eachKeys[name]?.expr === 'string' ? eachKeys[name]!.expr! : name;
      out.push({ kind: 'iteration', name, expr });
      continue;
    }

    const upstream = priorOutputs.find((po) => name in po.properties);
    if (upstream) {
      out.push({ kind: 'produced', name, stage: upstream.stage, task: upstream.task });
      continue;
    }

    out.push({ kind: 'workflow', name });
  }

  return out;
}
