import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { builtInComponents, vueBuiltInComponents } from '../../../scene-model/built-in-components';
import { buildCsfModule } from '../../../scene-model/csf-prep';
import type { ComponentNode } from '../../../scene-model/types';

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

describe('vueBuiltInComponents', () => {
  // The render functions reference a bare `h` — at runtime in the generated
  // CSF module this resolves against that module's own top-level `import { h }
  // from 'vue';` (see built-in-components.ts). Here we stub it as a global so
  // the extracted function can be invoked directly, mirroring that contract.
  let h: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    h = vi.fn((type: string, propsOrChildren?: unknown, children?: unknown) => ({
      __v_isVNode: true,
      type,
      propsOrChildren,
      children,
    }));
    (globalThis as unknown as { h: typeof h }).h = h;
  });

  afterEach(() => {
    delete (globalThis as { h?: unknown }).h;
  });

  it('designbook:placeholder returns a vnode-like object, not a raw HTML string', () => {
    const mod = vueBuiltInComponents['designbook:placeholder']!;
    const result = mod.render({ message: 'missing expression' }, {}) as {
      __v_isVNode: boolean;
      type: string;
      propsOrChildren: unknown;
      children: unknown;
    };

    expect(result.__v_isVNode).toBe(true);
    expect(result.type).toBe('div');
    expect((result.propsOrChildren as { style: string }).style).toContain('dashed');
    expect(result.children).toBe('missing expression');
  });

  it('designbook:placeholder uses default message when none provided', () => {
    const mod = vueBuiltInComponents['designbook:placeholder']!;
    const result = mod.render({}, {}) as { children: unknown };
    expect(result.children).toBe('placeholder');
  });

  it('designbook:image provider mode returns a vnode-like object, not a string', () => {
    const mod = vueBuiltInComponents['designbook:image']!;
    const result = mod.render(
      {
        sources: [{ media: '(min-width: 768px)', src: 'https://picsum.photos/id/2/768/432' }],
        fallback: { src: 'https://picsum.photos/id/3/480/360', alt: 'Image' },
        style: { aspectRatio: '21/9', objectFit: 'cover' },
      },
      {},
    );

    expect(typeof result).not.toBe('string');
    expect(h).toHaveBeenCalled();
    const [pictureType, pictureChildren] = h.mock.calls[h.mock.calls.length - 1]!;
    expect(pictureType).toBe('picture');
    expect(Array.isArray(pictureChildren)).toBe(true);

    const sourceCall = h.mock.calls.find((c) => c[0] === 'source');
    expect(sourceCall?.[1]).toEqual({ media: '(min-width: 768px)', srcset: 'https://picsum.photos/id/2/768/432' });

    const imgCall = h.mock.calls.find((c) => c[0] === 'img');
    expect(imgCall?.[1]).toMatchObject({
      src: 'https://picsum.photos/id/3/480/360',
      alt: 'Image',
    });
  });

  it('designbook:image CSS mode returns a plain img vnode', () => {
    const mod = vueBuiltInComponents['designbook:image']!;
    mod.render({ src: '/img/hero.jpg', alt: 'Hero', style: { aspectRatio: '21/9', objectFit: 'cover' } }, {});

    const imgCall = h.mock.calls.find((c) => c[0] === 'img');
    expect(imgCall?.[1]).toMatchObject({
      src: '/img/hero.jpg',
      alt: 'Hero',
      style: 'aspect-ratio:21/9;object-fit:cover;width:100%',
    });
  });

  it('designbook:image with responsiveStyles wraps a style + img vnode in a span', () => {
    const mod = vueBuiltInComponents['designbook:image']!;
    mod.render(
      {
        src: '/img/hero.jpg',
        alt: 'Hero',
        style: { aspectRatio: '21/9', objectFit: 'cover' },
        responsiveStyles: [{ media: '(max-width: 768px)', aspectRatio: '16/9' }],
      },
      {},
    );

    const [spanType] = h.mock.calls[h.mock.calls.length - 1]!;
    expect(spanType).toBe('span');
    const styleCall = h.mock.calls.find((c) => c[0] === 'style');
    expect(styleCall?.[1]).toContain('@media (max-width: 768px)');
  });
});
