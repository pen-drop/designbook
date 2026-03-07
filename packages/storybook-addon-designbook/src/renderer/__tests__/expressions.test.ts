/**
 * JSONata Expression Tests — validates that .jsonata fixtures
 * produce correct ComponentNode[] when evaluated against sample data.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import jsonata from 'jsonata';

const fixturesDir = resolve(__dirname, 'fixtures');

function loadExpression(name: string): string {
    return readFileSync(resolve(fixturesDir, 'view-modes', name), 'utf-8');
}

const sampleRecord = {
    title: 'Understanding Modern Architecture',
    field_body: '<p>Architecture has evolved significantly over the past century...</p>',
    field_media: {
        url: '/images/architecture-hero.jpg',
        alt: 'Modern building with glass facade',
    },
    field_category: {
        name: 'Architecture',
        id: 1,
    },
    field_teaser: 'A deep dive into the evolution of modern architecture and its impact.',
};

describe('JSONata expression evaluation', () => {
    describe('node.article.teaser.jsonata', () => {
        it('produces an array of ComponentNodes', async () => {
            const expr = jsonata(loadExpression('node.article.teaser.jsonata'));
            const result = await expr.evaluate(sampleRecord);

            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(3);
        });

        it('maps figure with field_media props', async () => {
            const expr = jsonata(loadExpression('node.article.teaser.jsonata'));
            const result = await expr.evaluate(sampleRecord);

            expect(result[0]).toEqual({
                type: 'component',
                component: 'figure',
                props: {
                    src: '/images/architecture-hero.jpg',
                    alt: 'Modern building with glass facade',
                },
            });
        });

        it('maps heading with title slot', async () => {
            const expr = jsonata(loadExpression('node.article.teaser.jsonata'));
            const result = await expr.evaluate(sampleRecord);

            expect(result[1]).toEqual({
                type: 'component',
                component: 'heading',
                props: { level: 'h3' },
                slots: { text: 'Understanding Modern Architecture' },
            });
        });

        it('maps text-block with field_teaser fallback', async () => {
            const expr = jsonata(loadExpression('node.article.teaser.jsonata'));
            const result = await expr.evaluate(sampleRecord);

            expect(result[2].component).toBe('text-block');
            expect(result[2].slots.content).toContain('deep dive');
        });

        it('falls back to field_body when field_teaser is missing', async () => {
            const expr = jsonata(loadExpression('node.article.teaser.jsonata'));
            const recordNoTeaser = { ...sampleRecord, field_teaser: undefined };
            const result = await expr.evaluate(recordNoTeaser);

            expect(result[2].slots.content).toContain('Architecture has evolved');
        });
    });

    describe('node.article.full.jsonata', () => {
        it('produces full view mode with conditional badge', async () => {
            const expr = jsonata(loadExpression('node.article.full.jsonata'));
            const result = await expr.evaluate(sampleRecord);

            expect(Array.isArray(result)).toBe(true);
            // figure, heading, badge, text-block = 4 nodes
            expect(result).toHaveLength(4);
        });

        it('includes badge when field_category exists', async () => {
            const expr = jsonata(loadExpression('node.article.full.jsonata'));
            const result = await expr.evaluate(sampleRecord);

            const badge = result.find((n: any) => n.component === 'badge');
            expect(badge).toBeDefined();
            expect(badge.slots.label).toBe('Architecture');
        });

        it('excludes badge when field_category is missing', async () => {
            const expr = jsonata(loadExpression('node.article.full.jsonata'));
            const recordNoCat = { ...sampleRecord, field_category: undefined };
            const result = await expr.evaluate(recordNoCat);

            // JSONata filters null from arrays
            const badge = result.find((n: any) => n?.component === 'badge');
            expect(badge).toBeUndefined();
            // Should be 3 nodes: figure, heading, text-block
            expect(result.filter(Boolean)).toHaveLength(3);
        });

        it('sets full_width on figure', async () => {
            const expr = jsonata(loadExpression('node.article.full.jsonata'));
            const result = await expr.evaluate(sampleRecord);

            expect(result[0].props.full_width).toBe(true);
        });

        it('uses h1 for heading', async () => {
            const expr = jsonata(loadExpression('node.article.full.jsonata'));
            const result = await expr.evaluate(sampleRecord);

            expect(result[1].props.level).toBe('h1');
        });
    });
});
