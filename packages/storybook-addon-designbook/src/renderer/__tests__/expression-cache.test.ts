import { describe, it, expect } from 'vitest';
import { ExpressionCache } from '../expression-cache';

describe('ExpressionCache', () => {
    it('compiles and caches an expression', async () => {
        const cache = new ExpressionCache();
        const expr = cache.getOrCompile('test.jsonata', '$.title');
        expect(expr).toBeDefined();
        expect(cache.size).toBe(1);

        const result = await expr.evaluate({ title: 'Hello' });
        expect(result).toBe('Hello');
    });

    it('returns cached expression on second call', () => {
        const cache = new ExpressionCache();
        const first = cache.getOrCompile('test.jsonata', '$.title');
        const second = cache.getOrCompile('test.jsonata', '$.title');
        expect(first).toBe(second); // Same reference
        expect(cache.size).toBe(1);
    });

    it('caches different paths separately', () => {
        const cache = new ExpressionCache();
        cache.getOrCompile('a.jsonata', '$.x');
        cache.getOrCompile('b.jsonata', '$.y');
        expect(cache.size).toBe(2);
    });

    it('invalidates a specific entry', () => {
        const cache = new ExpressionCache();
        cache.getOrCompile('a.jsonata', '$.x');
        cache.getOrCompile('b.jsonata', '$.y');

        const removed = cache.invalidate('a.jsonata');
        expect(removed).toBe(true);
        expect(cache.size).toBe(1);
    });

    it('returns false when invalidating non-existent entry', () => {
        const cache = new ExpressionCache();
        const removed = cache.invalidate('nope.jsonata');
        expect(removed).toBe(false);
    });

    it('clears all entries', () => {
        const cache = new ExpressionCache();
        cache.getOrCompile('a.jsonata', '$.x');
        cache.getOrCompile('b.jsonata', '$.y');

        cache.clear();
        expect(cache.size).toBe(0);
    });

    it('recompiles after invalidation', async () => {
        const cache = new ExpressionCache();
        const first = cache.getOrCompile('test.jsonata', 'title');
        cache.invalidate('test.jsonata');
        const second = cache.getOrCompile('test.jsonata', 'title');

        expect(first).not.toBe(second); // Different reference
        const result = await second.evaluate({ title: 'Recompiled' });
        expect(result).toBe('Recompiled');
    });
});
