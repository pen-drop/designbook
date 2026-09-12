import { afterEach, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import type { DesignbookConfig } from '../../shared/config.js';
import { runExtractPage } from '../extract-page.js';

vi.mock('../../tools/inspect/capture.js', () => ({
  capture: async (_url: string, path: string) => {
    writeFileSync(path, JSON.stringify({ nodes: [], source: { url: 'https://example.test' } }));
  },
}));
vi.mock('../../tools/inspect/style-env.js', () => ({ captureStyleEnv: async () => undefined }));
vi.mock('../../tools/inspect/breakpoint-widths.js', () => ({
  resolveBreakpointWidths: () => [{ name: 'sm', width: 640 }],
}));
const folders: string[] = [];
afterEach(() => {
  for (const path of folders.splice(0)) rmSync(path, { recursive: true, force: true });
});
it('writes one source dump and returns the catalogue without a second observations file', async () => {
  const folder = mkdtempSync(resolve(tmpdir(), 'extract-output-'));
  folders.push(folder);
  const result = await runExtractPage(
    'https://example.test',
    folder,
    { breakpoints: ['sm'], fonts: [], state: 'rest', session: 'anonymous' },
    {} as DesignbookConfig,
  );
  expect(result.dumpPath).toBe(resolve(folder, 'extract--rest.json'));
  expect(result.catalogue.url).toBe('https://example.test');
  expect(JSON.parse(readFileSync(result.dumpPath, 'utf8')).nodes).toEqual([]);
  expect(existsSync(resolve(folder, 'observations.json'))).toBe(false);
  expect(existsSync(resolve(folder, 'captured.json'))).toBe(false);
});
