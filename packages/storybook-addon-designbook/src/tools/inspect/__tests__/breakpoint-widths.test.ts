import { describe, it, expect } from 'vitest';
import { resolveBreakpointWidths } from '../breakpoint-widths.js';

describe('resolveBreakpointWidths', () => {
  it('uses Tailwind defaults when tokens lack breakpoints', () => {
    const r = resolveBreakpointWidths({ data: '/nonexistent' } as never, ['sm', 'xl']);
    expect(r).toEqual([
      { name: 'sm', width: 640 },
      { name: 'xl', width: 1280 },
    ]);
  });
  it('sorts ascending by width regardless of input order', () => {
    const r = resolveBreakpointWidths({ data: '/nonexistent' } as never, ['xl', 'sm']);
    expect(r.map((b) => b.name)).toEqual(['sm', 'xl']);
  });
  it('drops unknown breakpoint names', () => {
    const r = resolveBreakpointWidths({ data: '/nonexistent' } as never, ['sm', 'bogus']);
    expect(r).toEqual([{ name: 'sm', width: 640 }]);
  });
});
