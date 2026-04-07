import { describe, it, expect } from 'vitest';
import { builtInComponents } from '../built-in-components';
import { buildCsfModule } from '../csf-prep';
import type { ComponentNode } from '../types';

describe('builtInComponents', () => {
  it('designbook:placeholder renders HTML with message', () => {
    const mod = builtInComponents['designbook:placeholder']!;
    const html = mod.render({ message: 'missing expression' }, {});
    expect(html).toContain('missing expression');
    expect(html).toContain('<div');
    expect(html).toContain('dashed');
  });

  it('designbook:placeholder uses default message when none provided', () => {
    const mod = builtInComponents['designbook:placeholder']!;
    const html = mod.render({}, {});
    expect(html).toContain('placeholder');
  });
});

describe('designbook:image', () => {
  const mod = builtInComponents['designbook:image']!;

  it('renders picture element with multiple sources', () => {
    const html = mod.render(
      {
        sources: [
          { media: '(min-width: 1200px)', src: 'https://picsum.photos/id/1/1200/514' },
          { media: '(min-width: 768px)', src: 'https://picsum.photos/id/2/768/432' },
        ],
        fallback: { src: 'https://picsum.photos/id/3/480/360', alt: 'Image' },
        style: { aspectRatio: '21/9', objectFit: 'cover' },
      },
      {},
    ) as string;

    expect(html).toContain('<picture>');
    expect(html).toContain('<source media="(min-width: 1200px)"');
    expect(html).toContain('<source media="(min-width: 768px)"');
    expect(html).toContain('srcset="https://picsum.photos/id/1/1200/514"');
    expect(html).toContain('<img src="https://picsum.photos/id/3/480/360"');
    expect(html).toContain('alt="Image"');
    expect(html).toContain('</picture>');
  });

  it('renders single img with CSS aspect-ratio', () => {
    const html = mod.render(
      {
        src: '/img/hero.jpg',
        alt: 'Hero',
        style: { aspectRatio: '21/9', objectFit: 'cover' },
      },
      {},
    ) as string;

    expect(html).toContain('<img');
    expect(html).toContain('src="/img/hero.jpg"');
    expect(html).toContain('alt="Hero"');
    expect(html).toContain('aspect-ratio:21/9');
    expect(html).toContain('object-fit:cover');
    expect(html).toContain('width:100%');
    expect(html).not.toContain('<picture>');
  });

  it('renders responsive CSS style block', () => {
    const html = mod.render(
      {
        src: '/img/hero.jpg',
        alt: 'Hero',
        style: { aspectRatio: '21/9', objectFit: 'cover' },
        responsiveStyles: [
          { media: '(max-width: 768px)', aspectRatio: '16/9' },
          { media: '(max-width: 480px)', aspectRatio: '4/3' },
        ],
      },
      {},
    ) as string;

    expect(html).toContain('<style>');
    expect(html).toContain('@media (max-width: 768px)');
    expect(html).toContain('aspect-ratio:16/9');
    expect(html).toContain('@media (max-width: 480px)');
    expect(html).toContain('aspect-ratio:4/3');
    expect(html).toContain('<img');
  });
});

describe('csf-prep built-in resolution', () => {
  const nodes: ComponentNode[] = [{ component: 'designbook:placeholder', props: { message: 'test' } }];

  it('emits inline render function for designbook: prefix — no import statement', () => {
    const code = buildCsfModule({
      group: 'Test',
      source: 'test.scenes.yml',
      scenes: [{ name: 'Default', exportName: 'Default', nodes }],
      resolveImportPath: () => null,
    });

    // No import statement for designbook:placeholder
    expect(code).not.toMatch(/import.*designbookplaceholder/);
    // Inline render function in __imports
    expect(code).toContain("'designbook:placeholder':");
    expect(code).toContain('render:');
    // No missing-component warning stub
    expect(code).not.toContain('Missing component: designbook:placeholder');
  });

  it('still resolves non-designbook components via resolveImportPath', () => {
    const mixedNodes: ComponentNode[] = [
      { component: 'designbook:placeholder', props: { message: 'test' } },
      { component: 'provider:card' },
    ];

    const code = buildCsfModule({
      group: 'Test',
      source: 'test.scenes.yml',
      scenes: [{ name: 'Default', exportName: 'Default', nodes: mixedNodes }],
      resolveImportPath: (id) => (id === 'provider:card' ? '/components/card/card.component.yml' : null),
    });

    // External component gets an import
    expect(code).toContain("import * as providercard from '/components/card/card.component.yml'");
    // Built-in does not
    expect(code).not.toMatch(/import.*designbookplaceholder/);
  });
});
