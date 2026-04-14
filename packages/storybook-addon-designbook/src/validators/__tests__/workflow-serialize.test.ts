import { describe, it, expect } from 'vitest';
import { flattenToMarkdown, renderTemplate, serializeForPath, keyToTitleCase } from '../../workflow-serialize.js';

// ── flattenToMarkdown ────────────────────────────────────────────────────────

describe('flattenToMarkdown', () => {
  it('uses first required string as h1', () => {
    const schema = {
      type: 'object' as const,
      required: ['product_name', 'description'],
      properties: {
        product_name: { type: 'string' as const, title: 'Product Name' },
        description: { type: 'string' as const, title: 'Description' },
      },
    };
    const data = { product_name: 'My App', description: 'A great app' };
    const md = flattenToMarkdown(schema, data);
    expect(md).toBe('# My App\n\n## Description\n\nA great app\n');
  });

  it('renders array of strings as bullet list', () => {
    const schema = {
      type: 'object' as const,
      required: ['title'],
      properties: {
        title: { type: 'string' as const },
        features: {
          type: 'array' as const,
          title: 'Key Features',
          items: { type: 'string' as const },
        },
      },
    };
    const data = { title: 'Product', features: ['Fast', 'Secure', 'Simple'] };
    const md = flattenToMarkdown(schema, data);
    expect(md).toContain('## Key Features');
    expect(md).toContain('- Fast');
    expect(md).toContain('- Secure');
    expect(md).toContain('- Simple');
  });

  it('renders array of objects with h3 sub-sections', () => {
    const schema = {
      type: 'object' as const,
      required: ['name'],
      properties: {
        name: { type: 'string' as const },
        problems: {
          type: 'array' as const,
          title: 'Problems & Solutions',
          items: {
            type: 'object' as const,
            properties: {
              title: { type: 'string' as const },
              solution: { type: 'string' as const },
            },
          },
        },
      },
    };
    const data = {
      name: 'My Product',
      problems: [
        { title: 'Slow loading', solution: 'Use lazy loading' },
        { title: 'No search', solution: 'Add full-text search' },
      ],
    };
    const md = flattenToMarkdown(schema, data);
    expect(md).toContain('# My Product');
    expect(md).toContain('## Problems & Solutions');
    expect(md).toContain('### Slow loading');
    expect(md).toContain('Use lazy loading');
    expect(md).toContain('### No search');
    expect(md).toContain('Add full-text search');
  });

  it('omits null and undefined values', () => {
    const schema = {
      type: 'object' as const,
      required: ['name'],
      properties: {
        name: { type: 'string' as const },
        optional_field: { type: 'string' as const, title: 'Optional' },
        another_null: { type: 'string' as const, title: 'Another' },
      },
    };
    const data = { name: 'Test', optional_field: null, another_null: undefined };
    const md = flattenToMarkdown(schema, data);
    expect(md).toBe('# Test\n');
    expect(md).not.toContain('Optional');
    expect(md).not.toContain('Another');
  });

  it('skips empty arrays', () => {
    const schema = {
      type: 'object' as const,
      required: ['name'],
      properties: {
        name: { type: 'string' as const },
        items: { type: 'array' as const, title: 'Items', items: { type: 'string' as const } },
      },
    };
    const data = { name: 'Test', items: [] };
    const md = flattenToMarkdown(schema, data);
    expect(md).not.toContain('Items');
  });

  it('falls back to key-as-title-case when title is missing', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        some_field: { type: 'string' as const },
      },
    };
    const data = { some_field: 'value' };
    const md = flattenToMarkdown(schema, data);
    expect(md).toContain('## Some Field');
  });

  it('renders nested objects at deeper heading levels', () => {
    const schema = {
      type: 'object' as const,
      required: ['name'],
      properties: {
        name: { type: 'string' as const },
        design_reference: {
          type: 'object' as const,
          title: 'Design Reference',
          properties: {
            type: { type: 'string' as const, title: 'Type' },
            url: { type: 'string' as const, title: 'URL' },
          },
        },
      },
    };
    const data = { name: 'Product', design_reference: { type: 'figma', url: 'https://figma.com/abc' } };
    const md = flattenToMarkdown(schema, data);
    expect(md).toContain('## Design Reference');
    expect(md).toContain('### Type');
    expect(md).toContain('figma');
    expect(md).toContain('### URL');
    expect(md).toContain('https://figma.com/abc');
  });

  it('handles full vision schema', () => {
    const schema = {
      type: 'object' as const,
      required: ['product_name', 'description'],
      properties: {
        product_name: { type: 'string' as const, title: 'Product Name' },
        description: { type: 'string' as const, title: 'Description' },
        problems: {
          type: 'array' as const,
          title: 'Problems & Solutions',
          items: {
            type: 'object' as const,
            properties: {
              title: { type: 'string' as const },
              solution: { type: 'string' as const },
            },
          },
        },
        features: {
          type: 'array' as const,
          title: 'Key Features',
          items: { type: 'string' as const },
        },
        references: {
          type: 'array' as const,
          title: 'References',
          items: {
            type: 'object' as const,
            properties: {
              type: { type: 'string' as const },
              url: { type: 'string' as const },
              label: { type: 'string' as const },
            },
          },
        },
      },
    };
    const data = {
      product_name: 'Pet Shop',
      description: 'An online store for pet supplies',
      problems: [{ title: 'Hard to find products', solution: 'Smart search with filters' }],
      features: ['Product catalog', 'Shopping cart', 'User reviews'],
      references: [{ type: 'website', url: 'https://example.com', label: 'Competitor' }],
    };
    const md = flattenToMarkdown(schema, data);
    expect(md).toMatch(/^# Pet Shop\n/);
    expect(md).toContain('## Description');
    expect(md).toContain('## Problems & Solutions');
    expect(md).toContain('### Hard to find products');
    expect(md).toContain('## Key Features');
    expect(md).toContain('- Product catalog');
    expect(md).toContain('## References');
    expect(md).toContain('### website');
  });
});

// ── renderTemplate ───────────────────────────────────────────────────────────

describe('renderTemplate', () => {
  it('interpolates simple properties', () => {
    const result = renderTemplate('Hello {{ name }}, welcome to {{ place }}.', {
      name: 'Alice',
      place: 'Wonderland',
    });
    expect(result).toBe('Hello Alice, welcome to Wonderland.');
  });

  it('handles null/undefined as empty string', () => {
    const result = renderTemplate('Value: {{ missing }}', {});
    expect(result).toBe('Value: ');
  });

  it('renders each blocks with array of strings', () => {
    const result = renderTemplate('{{#each items}}- {{ . }}\n{{/each}}', {
      items: ['Apple', 'Banana', 'Cherry'],
    });
    expect(result).toBe('- Apple\n- Banana\n- Cherry\n');
  });

  it('renders each blocks with array of objects', () => {
    const result = renderTemplate('{{#each users}}Name: {{ name }}, Age: {{ age }}\n{{/each}}', {
      users: [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ],
    });
    expect(result).toBe('Name: Alice, Age: 30\nName: Bob, Age: 25\n');
  });

  it('renders if blocks conditionally', () => {
    const result = renderTemplate('{{#if show}}Visible{{/if}}', { show: true });
    expect(result).toBe('Visible');
  });

  it('omits if block when value is null', () => {
    const result = renderTemplate('Before{{#if hidden}} Hidden{{/if}} After', { hidden: null });
    expect(result).toBe('Before After');
  });

  it('omits if block when value is false', () => {
    const result = renderTemplate('{{#if enabled}}ON{{/if}}', { enabled: false });
    expect(result).toBe('');
  });

  it('omits if block when value is empty array', () => {
    const result = renderTemplate('{{#if items}}Has items{{/if}}', { items: [] });
    expect(result).toBe('');
  });

  it('handles nested each and if', () => {
    const result = renderTemplate(
      '{{#each sections}}## {{ title }}\n{{#if description}}{{ description }}\n{{/if}}{{/each}}',
      {
        sections: [
          { title: 'Intro', description: 'Welcome text' },
          { title: 'Main', description: null },
        ],
      },
    );
    expect(result).toBe('## Intro\nWelcome text\n## Main\n');
  });

  it('renders empty string for each with empty array', () => {
    const result = renderTemplate('Before{{#each items}}{{ . }}{{/each}}After', { items: [] });
    expect(result).toBe('BeforeAfter');
  });
});

// ── serializeForPath ─────────────────────────────────────────────────────────

describe('serializeForPath', () => {
  it('serializes .yml as YAML', () => {
    const result = serializeForPath('/path/to/data.yml', { color: { primary: '#ff0000' } });
    expect(result).toContain('color:');
    expect(result).toContain("primary: '#ff0000'");
  });

  it('serializes .json with 2-space indent', () => {
    const result = serializeForPath('/path/to/data.json', { key: 'value' });
    expect(result).toBe('{\n  "key": "value"\n}\n');
  });

  it('serializes .md with schema via flattenToMarkdown', () => {
    const schema = {
      type: 'object' as const,
      required: ['name'],
      properties: {
        name: { type: 'string' as const },
        desc: { type: 'string' as const, title: 'Description' },
      },
    };
    const result = serializeForPath('/path/to/doc.md', { name: 'Test', desc: 'Hello' }, schema);
    expect(result).toContain('# Test');
    expect(result).toContain('## Description');
  });

  it('serializes .md with template when provided', () => {
    const schema = { type: 'object' as const, properties: { name: { type: 'string' as const } } };
    const template = '# {{ name }}\n\nCustom template output.';
    const result = serializeForPath('/path/to/doc.md', { name: 'Custom' }, schema, template);
    expect(result).toBe('# Custom\n\nCustom template output.');
  });

  it('template takes precedence over flattenToMarkdown', () => {
    const schema = {
      type: 'object' as const,
      required: ['name'],
      properties: { name: { type: 'string' as const } },
    };
    const template = 'TEMPLATE: {{ name }}';
    const result = serializeForPath('/path/to/doc.md', { name: 'Overridden' }, schema, template);
    expect(result).toBe('TEMPLATE: Overridden');
    expect(result).not.toContain('#');
  });

  it('falls back to string for .md without schema or template', () => {
    const result = serializeForPath('/path/to/doc.md', 'raw markdown content');
    expect(result).toBe('raw markdown content');
  });

  it('serializes .yaml same as .yml', () => {
    const result = serializeForPath('/path/to/data.yaml', { key: 'value' });
    expect(result).toContain('key: value');
  });
});

// ── keyToTitleCase ───────────────────────────────────────────────────────────

describe('keyToTitleCase', () => {
  it('converts snake_case', () => {
    expect(keyToTitleCase('product_name')).toBe('Product Name');
  });

  it('converts camelCase', () => {
    expect(keyToTitleCase('productName')).toBe('Product Name');
  });

  it('converts kebab-case', () => {
    expect(keyToTitleCase('design-reference')).toBe('Design Reference');
  });

  it('handles single word', () => {
    expect(keyToTitleCase('name')).toBe('Name');
  });
});
