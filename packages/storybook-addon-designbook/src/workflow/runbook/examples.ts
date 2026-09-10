const HEADING_RE = /^##\s+example\s+output\s*$/i;
const FENCE_OPEN_RE = /^```[\w-]*\s*$/;
const FENCE_CLOSE_RE = /^```\s*$/;
const ANY_HEADING_RE = /^#{1,2}\s+/;

export function extractExample(bodyMarkdown: string): string | null {
  const lines = bodyMarkdown.split('\n');

  let headingIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (HEADING_RE.test(lines[i]!.trim())) {
      headingIdx = i;
      break;
    }
  }
  if (headingIdx === -1) return null;

  for (let i = headingIdx + 1; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    if (ANY_HEADING_RE.test(trimmed) && !HEADING_RE.test(trimmed)) return null;
    if (FENCE_OPEN_RE.test(trimmed)) {
      const buf: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (FENCE_CLOSE_RE.test(lines[j]!.trim())) return buf.join('\n');
        buf.push(lines[j]!);
      }
      return null; // unterminated fence
    }
  }
  return null;
}

const MAX_DEPTH = 6;

interface SchemaNode {
  type?: string;
  $ref?: string;
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
}

export function derivePlaceholderFromSchema(schema: object, definitions: Record<string, object>): string {
  return renderNode(schema as SchemaNode, definitions, 0);
}

function renderNode(node: SchemaNode, defs: Record<string, object>, depth: number): string {
  if (depth > MAX_DEPTH) return '<...>';

  if (node.$ref) {
    const refName = node.$ref.replace(/^#\/definitions\//, '');
    const target = defs[refName];
    if (target) return renderNode(target as SchemaNode, defs, depth + 1);
    return `<${refName}>`;
  }

  if (node.type === 'object') {
    const props = node.properties ?? {};
    const keys = Object.keys(props);
    if (keys.length === 0) return '{}';
    return keys
      .map((k) => {
        const child = props[k]!;
        const rendered = renderNode(child, defs, depth + 1);
        // Indent if rendered output spans multiple lines OR if child is a non-empty object/array
        const isNonEmptyObject = child.type === 'object' && Object.keys(child.properties ?? {}).length > 0;
        const isArray = child.type === 'array' && child.items;
        const shouldIndent = rendered.includes('\n') || isNonEmptyObject || isArray;
        if (shouldIndent) {
          return `${k}:\n${indentBlock(rendered, '  ')}`;
        }
        return `${k}: ${rendered}`;
      })
      .join('\n');
  }

  if (node.type === 'array') {
    const item = (node.items ?? {}) as SchemaNode;
    const rendered = renderNode(item, defs, depth + 1);
    if (rendered.includes('\n')) {
      const [first, ...rest] = rendered.split('\n');
      return [`- ${first}`, ...rest.map((l) => `  ${l}`)].join('\n');
    }
    return `- ${rendered}`;
  }

  if (node.type === 'string') return '<string>';
  if (node.type === 'number' || node.type === 'integer') return '<number>';
  if (node.type === 'boolean') return '<boolean>';
  return '<unknown>';
}

function indentBlock(text: string, prefix: string): string {
  return text
    .split('\n')
    .map((l) => prefix + l)
    .join('\n');
}
