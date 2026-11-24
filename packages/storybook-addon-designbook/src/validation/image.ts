import { existsSync, readFileSync, statSync } from 'node:fs';
import type { ValidationResult } from './types.js';

/** PNG magic bytes: 137 80 78 71 13 10 26 10 */
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Minimum file size in bytes for a valid PNG.
 * A minimal 1×1 PNG is ~67 bytes; anything under 50 is certainly broken.
 */
const MIN_FILE_SIZE = 50;

/**
 * Read width and height from the PNG IHDR chunk.
 * IHDR starts at byte 8 (length) + 4 (type) = data at byte 16.
 * Width: bytes 16–19, Height: bytes 20–23 (big-endian uint32).
 */
function readPngDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24) return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

export function validateImage(filePath: string): ValidationResult {
  if (!existsSync(filePath)) {
    return { valid: false, errors: [`Image file not found: ${filePath}`], warnings: [] };
  }

  const stat = statSync(filePath);
  if (stat.size === 0) {
    return { valid: false, errors: ['Image file is empty (0 bytes)'], warnings: [] };
  }

  const buf = readFileSync(filePath);

  // Need at least 8 bytes for PNG header check
  if (buf.length < 8) {
    return { valid: false, errors: [`Image file too small (${stat.size} bytes) — likely corrupt`], warnings: [] };
  }

  if (!buf.subarray(0, 8).equals(PNG_HEADER)) {
    return { valid: false, errors: ['Invalid PNG header — file is not a valid PNG image'], warnings: [] };
  }

  if (stat.size < MIN_FILE_SIZE) {
    return { valid: false, errors: [`Image file too small (${stat.size} bytes) — likely corrupt`], warnings: [] };
  }

  const dims = readPngDimensions(buf);
  if (!dims) {
    return { valid: false, errors: ['Cannot read PNG dimensions — file truncated'], warnings: [] };
  }
  if (dims.width === 0 || dims.height === 0) {
    return { valid: false, errors: [`Invalid PNG dimensions: ${dims.width}×${dims.height}`], warnings: [] };
  }

  return { valid: true, errors: [], warnings: [] };
}
