import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { validateImage } from '../image.js';

const tmpDir = resolve(import.meta.dirname, '.tmp-image-test');

function setup() {
  mkdirSync(tmpDir, { recursive: true });
}

function teardown() {
  rmSync(tmpDir, { recursive: true, force: true });
}

/** Minimal valid 1×1 white PNG (67 bytes) */
function createValidPng(): Buffer {
  // prettier-ignore
  return Buffer.from([
    // PNG signature
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    // IHDR chunk (13 bytes data)
    0x00, 0x00, 0x00, 0x0d, // length
    0x49, 0x48, 0x44, 0x52, // "IHDR"
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, 0x02,             // bit depth: 8, color type: RGB
    0x00, 0x00, 0x00,       // compression, filter, interlace
    0x90, 0x77, 0x53, 0xde, // CRC
    // IDAT chunk
    0x00, 0x00, 0x00, 0x0c, // length
    0x49, 0x44, 0x41, 0x54, // "IDAT"
    0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00,
    0x00, 0x02, 0x00, 0x01, // data
    0xe2, 0x21, 0xbc, 0x33, // CRC
    // IEND chunk
    0x00, 0x00, 0x00, 0x00, // length
    0x49, 0x45, 0x4e, 0x44, // "IEND"
    0xae, 0x42, 0x60, 0x82, // CRC
  ]);
}

describe('validateImage', () => {
  it('reports error for missing file', () => {
    const result = validateImage('/nonexistent/image.png');
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([expect.stringContaining('not found')]);
  });

  it('reports error for empty file', () => {
    setup();
    try {
      const p = resolve(tmpDir, 'empty.png');
      writeFileSync(p, '');
      const result = validateImage(p);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual([expect.stringContaining('empty')]);
    } finally {
      teardown();
    }
  });

  it('reports error for too-small file', () => {
    setup();
    try {
      const p = resolve(tmpDir, 'tiny.png');
      writeFileSync(p, 'abc');
      const result = validateImage(p);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual([expect.stringContaining('too small')]);
    } finally {
      teardown();
    }
  });

  it('reports error for non-PNG file', () => {
    setup();
    try {
      const p = resolve(tmpDir, 'not-png.png');
      writeFileSync(p, Buffer.alloc(200, 0x42)); // 200 bytes of 'B'
      const result = validateImage(p);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual([expect.stringContaining('not a valid PNG')]);
    } finally {
      teardown();
    }
  });

  it('reports error for zero-dimension PNG', () => {
    setup();
    try {
      const p = resolve(tmpDir, 'zero-dim.png');
      const buf = createValidPng();
      // Overwrite width to 0
      buf.writeUInt32BE(0, 16);
      writeFileSync(p, buf);
      const result = validateImage(p);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual([expect.stringContaining('Invalid PNG dimensions')]);
    } finally {
      teardown();
    }
  });

  it('accepts a valid PNG', () => {
    setup();
    try {
      const p = resolve(tmpDir, 'valid.png');
      writeFileSync(p, createValidPng());
      const result = validateImage(p);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    } finally {
      teardown();
    }
  });
});
