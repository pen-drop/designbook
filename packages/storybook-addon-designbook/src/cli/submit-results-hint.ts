interface ResultProperty {
  path?: string;
  $ref?: string;
  type?: string;
  submission?: 'data' | 'direct';
  flush?: 'deferred' | 'immediate';
  [key: string]: unknown;
}

/** Schema shape: a flat map of result key to its resolved SchemaEntry, as produced by buildSchemaBlock. */
type ResultMap = Record<string, ResultProperty>;

function typeLabel(prop: ResultProperty): string {
  if (prop.$ref) {
    const seg = prop.$ref.split('/').pop();
    return `<${seg ?? 'unknown'}>`;
  }
  return `<${prop.type ?? 'any'}>`;
}

/**
 * Render a markdown "Submit results" hint for a task stage.
 *
 * @param taskId   The resolved task identifier to embed in the `workflow done --task <id>` example.
 * @param results  The flat `result` map from a SchemaBlock, mapping each result key to its SchemaEntry.
 * @returns        A markdown string, or `null` when no `submission: data` entries with a path exist.
 */
export function renderSubmitResultsHint(taskId: string, results: ResultMap): string | null {
  const data: Array<[string, ResultProperty]> = [];
  const direct: Array<[string, ResultProperty]> = [];

  for (const [key, prop] of Object.entries(results)) {
    if (!prop.path) continue;
    const sub = prop.submission ?? 'data';
    if (sub === 'direct') {
      direct.push([key, prop]);
    } else {
      data.push([key, prop]);
    }
  }

  if (data.length === 0) return null;

  const lines: string[] = [];
  lines.push('## Submit results');
  lines.push('');
  lines.push('Return every `submission: data` result in a single call:');
  lines.push('');
  lines.push(`    workflow done --task ${taskId} --data '<json>'`);
  lines.push('');
  lines.push('The JSON must match:');
  lines.push('');
  lines.push('    {');
  for (let i = 0; i < data.length; i++) {
    const [key, prop] = data[i]!;
    const comma = i < data.length - 1 ? ',' : '';
    const flushNote = prop.flush === 'immediate' ? ' (flush: immediate)' : '';
    lines.push(`      "${key}": ${typeLabel(prop)}${comma}    // → ${prop.path}${flushNote}`);
  }
  lines.push('    }');

  if (direct.length > 0) {
    lines.push('');
    lines.push('Direct-submission results (written by task code, not submitted via --data):');
    lines.push('');
    for (const [key, prop] of direct) {
      lines.push(`    ${key}    → ${prop.path}`);
    }
  }

  return lines.join('\n');
}
