import { describe, it, expect, afterAll } from 'vitest';
import { writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { severityFromMeasure, pngDimensions } from '../compare-images.js';

describe('severityFromMeasure', () => {
  const base = { dimension_drift: null, diff_line_count: 0, ref_dim: { w: 100, h: 100 } };

  it('maps measured pixel ratio to floors', () => {
    expect(severityFromMeasure({ ...base, diff_percent: 0.3 })).toBe('critical');
    expect(severityFromMeasure({ ...base, diff_percent: 0.15 })).toBe('major');
    expect(severityFromMeasure({ ...base, diff_percent: 0.05 })).toBe('minor');
    expect(severityFromMeasure({ ...base, diff_percent: 0.0 })).toBe('pass');
  });

  it('escalates on structural dimension drift even when pixel ratio is low', () => {
    expect(
      severityFromMeasure({ ...base, diff_percent: 0.01, dimension_drift: { w: 0, h: 0.3 } }),
    ).toBe('critical');
    expect(
      severityFromMeasure({ ...base, diff_percent: 0.01, dimension_drift: { w: 0, h: 0.12 } }),
    ).toBe('major');
  });

  it('escalates a small-but-widely-spread shift via spatial extent', () => {
    // 2.8% pixels but touching >50% of rows (horizontal shift) → major, not minor
    expect(
      severityFromMeasure({ diff_percent: 0.028, dimension_drift: null, diff_line_count: 90, ref_dim: { w: 1280, h: 162 } }),
    ).toBe('major');
  });
});

const ws = resolve(tmpdir(), `dbo-compare-img-${process.pid}`);
afterAll(() => rmSync(ws, { recursive: true, force: true }));

describe('pngDimensions', () => {
  it('reads width/height from the PNG IHDR chunk', () => {
    // Minimal header: 8-byte signature + 4-byte IHDR length + "IHDR" + w + h
    const buf = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
    buf.write('IHDR', 12, 'ascii');
    buf.writeUInt32BE(1280, 16);
    buf.writeUInt32BE(699, 20);
    writeFileSync(ws + '.png', buf);
    expect(pngDimensions(ws + '.png')).toEqual({ w: 1280, h: 699 });
  });

  it('returns null for a non-PNG / missing file', () => {
    expect(pngDimensions(ws + '-nope.png')).toBeNull();
  });
});
