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

import { derivePlaceholderFromSchema } from '../examples.js';

describe('derivePlaceholderFromSchema', () => {
  it('emits a single scalar placeholder for primitive schemas', () => {
    expect(derivePlaceholderFromSchema({ type: 'string' }, {})).toBe('<string>');
    expect(derivePlaceholderFromSchema({ type: 'number' }, {})).toBe('<number>');
    expect(derivePlaceholderFromSchema({ type: 'boolean' }, {})).toBe('<boolean>');
  });

  it('renders an object as YAML key/value lines', () => {
    expect(
      derivePlaceholderFromSchema(
        { type: 'object', properties: { name: { type: 'string' }, count: { type: 'number' } } },
        {},
      ),
    ).toBe('name: <string>\ncount: <number>');
  });

  it('renders an array as a single-item YAML list using items schema', () => {
    expect(derivePlaceholderFromSchema({ type: 'array', items: { type: 'string' } }, {})).toBe('- <string>');
  });

  it('renders an array of objects with proper indentation', () => {
    expect(
      derivePlaceholderFromSchema(
        {
          type: 'array',
          items: { type: 'object', properties: { id: { type: 'string' }, n: { type: 'number' } } },
        },
        {},
      ),
    ).toBe('- id: <string>\n  n: <number>');
  });

  it('resolves $ref against the supplied definitions map', () => {
    expect(
      derivePlaceholderFromSchema(
        { $ref: '#/definitions/Component' },
        { Component: { type: 'object', properties: { name: { type: 'string' } } } },
      ),
    ).toBe('name: <string>');
  });

  it('renders <unknown> when type is missing and no $ref', () => {
    expect(derivePlaceholderFromSchema({}, {})).toBe('<unknown>');
  });

  it('caps recursion at depth 6 for self-referential schemas', () => {
    const defs = {
      Tree: {
        type: 'object',
        properties: { name: { type: 'string' }, child: { $ref: '#/definitions/Tree' } },
      },
    };
    const out = derivePlaceholderFromSchema({ $ref: '#/definitions/Tree' }, defs);
    expect(out).toContain('name: <string>');
    expect(out.split('\n').length).toBeLessThanOrEqual(50);
  });

  it('renders $ref-to-scalar inline (single-line key:value)', () => {
    const out = derivePlaceholderFromSchema(
      { type: 'object', properties: { story_id: { $ref: '#/definitions/StoryId' } } },
      { StoryId: { type: 'string' } },
    );
    expect(out).toBe('story_id: <string>');
  });

  it('renders empty object property inline as `key: {}`', () => {
    const out = derivePlaceholderFromSchema({ type: 'object', properties: { tokens: { type: 'object' } } }, {});
    expect(out).toBe('tokens: {}');
  });

  it('renders nested object-in-object with two-space indent per level', () => {
    const out = derivePlaceholderFromSchema(
      {
        type: 'object',
        properties: {
          parent: {
            type: 'object',
            properties: {
              child: {
                type: 'object',
                properties: { leaf: { type: 'string' } },
              },
            },
          },
        },
      },
      {},
    );
    expect(out).toBe('parent:\n  child:\n    leaf: <string>');
  });
});
