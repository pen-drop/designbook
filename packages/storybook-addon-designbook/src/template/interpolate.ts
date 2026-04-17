import jsonata from 'jsonata';

type Expression = ReturnType<typeof jsonata>;

const cache = new Map<string, Expression>();

function compile(expr: string): Expression {
  const hit = cache.get(expr);
  if (hit) return hit;
  const compiled = jsonata(expr);
  cache.set(expr, compiled);
  return compiled;
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) {
    const first = value[0];
    if (first && typeof first === 'object') {
      if ('scene' in first) return String((first as { scene: unknown }).scene);
      if ('storyId' in first) return String((first as { storyId: unknown }).storyId);
    }
    return JSON.stringify(value);
  }
  return JSON.stringify(value);
}

export interface InterpolateOptions {
  lenient?: boolean;
  envMap?: Record<string, string>;
}

export async function interpolate(
  template: string,
  scope: Record<string, unknown>,
  options: InterpolateOptions = {},
): Promise<string> {
  const { lenient = false, envMap } = options;

  const prepared = template
    .replace(/\$\{([A-Z_][A-Z0-9_]*)\}/g, (match, name: string) => {
      if (envMap && envMap[name] !== undefined) return `{{ $env.${name} }}`;
      if (lenient) return match;
      throw new Error(`Unknown environment variable: \${${name}} in path "${template}"`);
    })
    .replace(/(?<![\w$])\$([A-Z_][A-Z0-9_]*)/g, (match, name: string) => {
      if (envMap && envMap[name] !== undefined) return `{{ $env.${name} }}`;
      if (lenient) return match;
      throw new Error(`Unknown environment variable: $${name} in path "${template}"`);
    });

  const bindings: Record<string, unknown> = {};
  if (envMap) bindings.env = envMap;

  const parts = prepared.split(/(\{\{[^}]*\}\})/);
  const resolved = await Promise.all(
    parts.map(async (part) => {
      const match = part.match(/^\{\{\s*(.+?)\s*\}\}$/);
      if (!match) return part;
      const expr = match[1]!;
      let value: unknown;
      try {
        value = await compile(expr).evaluate(scope, bindings);
      } catch (err) {
        if (lenient) return part;
        throw new Error(`Error evaluating {{ ${expr} }} in "${template}": ${(err as Error).message}`);
      }
      if (value === undefined) {
        if (lenient) return part;
        throw new Error(`Unknown expression: {{ ${expr} }} in "${template}"`);
      }
      return stringify(value);
    }),
  );
  let joined = resolved.join('');

  if (envMap) {
    joined = joined
      .replace(/\$\{([A-Z_][A-Z0-9_]*)\}/g, (match, name: string) =>
        envMap[name] !== undefined ? envMap[name]! : match,
      )
      .replace(/(?<![\w$])\$([A-Z_][A-Z0-9_]*)/g, (match, name: string) =>
        envMap[name] !== undefined ? envMap[name]! : match,
      );
  }
  return joined;
}
