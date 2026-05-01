import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig } from '../config.js';

describe('loadConfig — repo-root guard', () => {
  it('refuses to resolve DESIGNBOOK_DATA inside a directory containing pnpm-workspace.yaml AND .git', () => {
    const root = resolve(tmpdir(), `designbook-test-rootguard-${Date.now()}`);
    mkdirSync(root, { recursive: true });
    mkdirSync(resolve(root, '.git'), { recursive: true });
    writeFileSync(resolve(root, 'pnpm-workspace.yaml'), 'packages:\n  - x\n');
    try {
      expect(() => loadConfig(root)).toThrow(/repo root/i);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('allows DESIGNBOOK_DATA in a workspace directory (no pnpm-workspace.yaml at the data parent)', () => {
    const root = resolve(tmpdir(), `designbook-test-okworkspace-${Date.now()}`);
    mkdirSync(root, { recursive: true });
    try {
      expect(() => loadConfig(root)).not.toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
