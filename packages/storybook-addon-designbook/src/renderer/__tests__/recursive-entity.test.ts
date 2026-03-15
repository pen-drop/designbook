import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { entityJsonataRenderer } from '../entity-renderer';
import type { RenderContext, SceneNode } from '../types';
import { SceneNodeRenderService } from '../render-service';

const fixturesDir = resolve(__dirname, 'fixtures');

describe('recursive entity resolution', () => {
  it('entity renderer produces marker for entity nodes in JSONata output', () => {
    const ctx: RenderContext = {
      provider: 'test_provider',
      dataModel: { content: {} },
      sampleData: {
        node: {
          article: [{ title: 'Test', field_body: 'body', field_media: { url: '/img.jpg', alt: 'alt' } }],
        },
      },
      designbookDir: fixturesDir,
      renderNode: () => '',
      trackImport: (id) => id.replace(/[-:]/g, ''),
      evaluateExpression: async () => null,
    };

    // The "with-author" JSONata returns a mix of component and entity nodes
    const result = entityJsonataRenderer.render(
      {
        type: 'entity',
        entity_type: 'node',
        bundle: 'article',
        view_mode: 'with-author',
        record: 0,
      },
      ctx,
    );

    // Should produce an entity expression marker (the async pipeline resolves it)
    expect(result).toContain('__ENTITY_EXPR__');
    expect(result).toContain('with-author');
  });

  it('render service dispatches entity nodes to entity renderer', () => {
    const renderService = new SceneNodeRenderService();
    renderService.register([entityJsonataRenderer]);

    const ctx: RenderContext = {
      provider: 'test_provider',
      dataModel: { content: {} },
      sampleData: {
        user: {
          user: [{ name: 'Jane Doe' }],
        },
      },
      designbookDir: fixturesDir,
      renderNode: (node: SceneNode) => renderService.render(node, ctx),
      trackImport: (id) => id.replace(/[-:]/g, ''),
      evaluateExpression: async () => null,
    };

    const result = renderService.render(
      {
        type: 'entity',
        entity_type: 'user',
        bundle: 'user',
        view_mode: 'compact',
        record: 0,
      },
      ctx,
    );

    // Entity renderer should produce a marker for async resolution
    expect(result).toContain('__ENTITY_EXPR__');
    expect(result).toContain('user.user.compact');
  });
});
