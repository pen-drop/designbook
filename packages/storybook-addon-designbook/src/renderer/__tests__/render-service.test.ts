import { describe, it, expect, vi } from 'vitest';
import { ScreenNodeRenderService } from '../render-service';
import type { ScreenNode, ScreenNodeRenderer, RenderContext } from '../types';

// Minimal mock context for testing
const mockContext: RenderContext = {
    dataModel: { content: {} },
    sampleData: {},
    designbookDir: '/tmp/test',
    renderNode: () => '',
    trackImport: () => '',
    evaluateExpression: async () => null,
};

describe('ScreenNodeRenderService', () => {
    it('dispatches to matching renderer', () => {
        const service = new ScreenNodeRenderService();
        const renderer: ScreenNodeRenderer = {
            name: 'test',
            appliesTo: (n) => n.type === 'test',
            render: () => '<test/>',
        };
        service.register([renderer]);

        const result = service.render({ type: 'test' }, mockContext);
        expect(result).toBe('<test/>');
    });

    it('respects priority ordering (higher priority wins)', () => {
        const service = new ScreenNodeRenderService();
        service.register([
            {
                name: 'low',
                priority: -10,
                appliesTo: () => true,
                render: () => 'low',
            },
            {
                name: 'high',
                priority: 10,
                appliesTo: () => true,
                render: () => 'high',
            },
        ]);

        const result = service.render({ type: 'any' }, mockContext);
        expect(result).toBe('high');
    });

    it('falls back for unknown node types', () => {
        const service = new ScreenNodeRenderService();
        service.register([
            {
                name: 'component-only',
                appliesTo: (n) => n.type === 'component',
                render: () => '<component/>',
            },
        ]);

        const result = service.render({ type: 'unknown' }, mockContext);
        expect(result).toContain('no renderer');
        expect(result).toContain('unknown');
    });

    it('merges built-in and integration renderers', () => {
        const service = new ScreenNodeRenderService();

        // Register built-in first
        service.register([
            {
                name: 'builtin',
                priority: -10,
                appliesTo: (n) => n.type === 'component',
                render: () => 'builtin',
            },
        ]);

        // Then integration renderer
        service.register([
            {
                name: 'custom-image',
                priority: 0,
                appliesTo: (n) => n.type === 'image',
                render: () => 'image',
            },
        ]);

        expect(service.getRenderers()).toHaveLength(2);
        // Custom should be first (priority 0 > -10)
        expect(service.getRenderers()[0].name).toBe('custom-image');
        expect(service.getRenderers()[1].name).toBe('builtin');
    });

    it('integration renderer overrides built-in with same appliesTo', () => {
        const service = new ScreenNodeRenderService();

        service.register([
            {
                name: 'builtin-component',
                priority: -10,
                appliesTo: (n) => n.type === 'component',
                render: () => 'builtin-output',
            },
            {
                name: 'custom-component',
                priority: 10,
                appliesTo: (n) => n.type === 'component',
                render: () => 'custom-output',
            },
        ]);

        const result = service.render({ type: 'component' }, mockContext);
        expect(result).toBe('custom-output');
    });

    it('passes node and context to renderer', () => {
        const service = new ScreenNodeRenderService();
        const renderSpy = vi.fn(() => 'rendered');

        service.register([
            {
                name: 'spy',
                appliesTo: () => true,
                render: renderSpy,
            },
        ]);

        const node: ScreenNode = { type: 'component', component: 'heading' };
        service.render(node, mockContext);

        expect(renderSpy).toHaveBeenCalledWith(node, mockContext);
    });

    it('uses default priority 0 when not specified', () => {
        const service = new ScreenNodeRenderService();

        service.register([
            {
                name: 'low',
                priority: -10,
                appliesTo: () => true,
                render: () => 'low',
            },
            {
                name: 'default',
                // no priority specified → defaults to 0
                appliesTo: () => true,
                render: () => 'default',
            },
        ]);

        const result = service.render({ type: 'any' }, mockContext);
        expect(result).toBe('default');
    });

    it('logs to console in debug mode', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

        const service = new ScreenNodeRenderService({ debug: true });
        service.register([
            {
                name: 'test-renderer',
                appliesTo: () => true,
                render: () => 'output',
            },
        ]);

        service.render({ type: 'component' }, mockContext);

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('test-renderer')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('component')
        );

        consoleSpy.mockRestore();
    });

    it('warns in debug mode when no renderer matches', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        const service = new ScreenNodeRenderService({ debug: true });
        service.render({ type: 'mystery' }, mockContext);

        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('mystery')
        );

        warnSpy.mockRestore();
    });
});
