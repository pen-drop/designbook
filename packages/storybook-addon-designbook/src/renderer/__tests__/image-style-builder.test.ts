import { describe, it, expect } from 'vitest';
import { imageStyleBuilder } from '../builders/image-style-builder';
import type { BuildContext, ComponentNode, DataModel, SceneNode } from '../types';

function makeCtx(imageStyles?: DataModel['image_styles']): BuildContext {
  return {
    dataModel: { content: {}, image_styles: imageStyles },
    sampleData: {},
    designbookDir: '/tmp/test/designbook',
    config: { image_provider: { type: 'picsum' } },
    buildNode: async () => [],
  };
}

describe('imageStyleBuilder', () => {
  describe('appliesTo', () => {
    it('matches type: "image"', () => {
      expect(imageStyleBuilder.appliesTo({ type: 'image' })).toBe(true);
    });

    it('rejects type: "entity"', () => {
      expect(imageStyleBuilder.appliesTo({ type: 'entity' })).toBe(false);
    });

    it('rejects type: "component"', () => {
      expect(imageStyleBuilder.appliesTo({ type: 'component' })).toBe(false);
    });

    it('rejects nodes without type', () => {
      expect(imageStyleBuilder.appliesTo({ component: 'test:card' })).toBe(false);
    });
  });

  describe('provider mode (no src)', () => {
    it('outputs designbook:image with sources and fallback', async () => {
      const ctx = makeCtx({
        hero: {
          aspect_ratio: '21:9',
          breakpoints: {
            xl: { width: 1200 },
            md: { width: 768, aspect_ratio: '16:9' },
          },
        },
      });

      const node: SceneNode = { type: 'image', image_style: 'hero', alt: 'Building' };
      const result = await imageStyleBuilder.build(node, ctx);

      expect(result).toHaveLength(1);
      const cn = result[0] as ComponentNode;
      expect(cn.component).toBe('designbook:image');

      const props = cn.props!;
      const sources = props.sources as Array<{ media: string; src: string }>;
      expect(sources).toHaveLength(2);
      // Sorted largest first
      expect(sources[0]!.media).toBe('(min-width: 1200px)');
      expect(sources[0]!.src).toMatch(/picsum\.photos\/id\/\d+\/1200\/514/);
      expect(sources[1]!.media).toBe('(min-width: 768px)');
      expect(sources[1]!.src).toMatch(/picsum\.photos\/id\/\d+\/768\/432/);

      const fallback = props.fallback as { src: string; alt: string };
      expect(fallback.alt).toBe('Building');
      expect(fallback.src).toMatch(/picsum\.photos/);
    });

    it('outputs single fallback when no breakpoints', async () => {
      const ctx = makeCtx({
        avatar: { aspect_ratio: '1:1' },
      });

      const node: SceneNode = { type: 'image', image_style: 'avatar', alt: 'Profile' };
      const result = await imageStyleBuilder.build(node, ctx);

      const cn = result[0] as ComponentNode;
      const sources = cn.props!.sources as unknown[];
      expect(sources).toHaveLength(0);

      const fallback = cn.props!.fallback as { src: string; alt: string };
      expect(fallback.src).toMatch(/picsum\.photos\/id\/\d+\/800\/800/);
      expect(fallback.alt).toBe('Profile');
    });
  });

  describe('CSS mode (with src)', () => {
    it('outputs designbook:image with CSS style props', async () => {
      const ctx = makeCtx({
        hero: { aspect_ratio: '21:9' },
      });

      const node: SceneNode = { type: 'image', image_style: 'hero', src: '/images/hero.jpg', alt: 'Hero' };
      const result = await imageStyleBuilder.build(node, ctx);

      const cn = result[0] as ComponentNode;
      expect(cn.component).toBe('designbook:image');
      expect(cn.props!.src).toBe('/images/hero.jpg');
      expect(cn.props!.alt).toBe('Hero');

      const style = cn.props!.style as Record<string, string>;
      expect(style.aspectRatio).toBe('21/9');
      expect(style.objectFit).toBe('cover');
    });

    it('includes responsive styles when breakpoints override aspect ratio', async () => {
      const ctx = makeCtx({
        hero: {
          aspect_ratio: '21:9',
          breakpoints: {
            md: { width: 768, aspect_ratio: '16:9' },
            sm: { width: 480, aspect_ratio: '4:3' },
          },
        },
      });

      const node: SceneNode = { type: 'image', image_style: 'hero', src: '/img/hero.jpg', alt: 'Hero' };
      const result = await imageStyleBuilder.build(node, ctx);

      const cn = result[0] as ComponentNode;
      const responsive = cn.props!.responsiveStyles as Array<{ media: string; aspectRatio: string }>;
      expect(responsive).toHaveLength(2);
      expect(responsive[0]!.media).toBe('(max-width: 768px)');
      expect(responsive[0]!.aspectRatio).toBe('16/9');
      expect(responsive[1]!.media).toBe('(max-width: 480px)');
      expect(responsive[1]!.aspectRatio).toBe('4/3');
    });
  });

  describe('error handling', () => {
    it('returns placeholder for unknown image style', async () => {
      const ctx = makeCtx({});

      const node: SceneNode = { type: 'image', image_style: 'nonexistent', alt: 'Test' };
      const result = await imageStyleBuilder.build(node, ctx);

      const cn = result[0] as ComponentNode;
      expect(cn.component).toBe('designbook:placeholder');
      expect(cn.props!.message as string).toContain('nonexistent');
    });

    it('returns placeholder when image_style is missing', async () => {
      const ctx = makeCtx({});

      const node: SceneNode = { type: 'image', alt: 'Test' };
      const result = await imageStyleBuilder.build(node, ctx);

      const cn = result[0] as ComponentNode;
      expect(cn.component).toBe('designbook:placeholder');
      expect(cn.props!.message as string).toContain('missing image_style');
    });
  });
});
