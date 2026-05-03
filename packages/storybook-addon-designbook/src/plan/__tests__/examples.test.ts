import { describe, it, expect } from 'vitest';
import { extractExample } from '../examples.js';

describe('extractExample (author-written)', () => {
  it('returns the body of the first fenced block under `## Example output`', () => {
    const body = `# Task

Some prose.

## Example output

\`\`\`yaml
components:
  - name: page
    slots: [header, content, footer]
\`\`\`

## Other section
`;
    expect(extractExample(body)).toBe('components:\n  - name: page\n    slots: [header, content, footer]');
  });

  it('matches case-insensitively and tolerates trailing whitespace', () => {
    const body = `## EXAMPLE OUTPUT   \n\n\`\`\`json\n{"x":1}\n\`\`\`\n`;
    expect(extractExample(body)).toBe('{"x":1}');
  });

  it('returns null when the heading is absent', () => {
    expect(extractExample('# Task\n\nNo example here.')).toBeNull();
  });

  it('returns null when the heading is present but no fenced block follows', () => {
    expect(extractExample('## Example output\n\nProse only.\n## Other')).toBeNull();
  });

  it('does not pick up a fenced block from a later H2 section', () => {
    const body = '## Example output\n\nProse only.\n\n## Later\n\n```yaml\nnope: true\n```\n';
    expect(extractExample(body)).toBeNull();
  });

  it('preserves leading whitespace inside the fenced block', () => {
    const body = '## Example output\n\n```\n  indented: yes\n  child:\n    deep: 1\n```\n';
    expect(extractExample(body)).toBe('  indented: yes\n  child:\n    deep: 1');
  });
});
