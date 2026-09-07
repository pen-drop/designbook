import { afterEach, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import type { DesignbookConfig } from '../../config.js';
import { runExtractPage } from '../extract-page.js';

vi.mock('../../inspect/capture.js', () => ({
  capture: async (_url: string, path: string) => {
    writeFileSync(path, JSON.stringify({ nodes: [], source: { url: 'https://example.test' } }));
  },
}));
vi.mock('../../inspect/style-env.js', () => ({ captureStyleEnv: async () => undefined }));
vi.mock('../../inspect/breakpoint-widths.js', () => ({ resolveBreakpointWidths: () => [{ name: 'sm', width: 640 }] }));
const folders: string[] = [];
afterEach(() => {
  for (const path of folders.splice(0)) rmSync(path, { recursive: true, force: true });
});
it('writes raw observations separately from the planner-authored enriched extract', async () => {
  const folder = mkdtempSync(resolve(tmpdir(), 'extract-output-'));
  folders.push(folder);
  const path = await runExtractPage(
    'https://example.test',
    folder,
    { breakpoints: ['sm'], fonts: [] },
    {} as DesignbookConfig,
  );
  expect(path).toBe(resolve(folder, 'observations.json'));
  expect(JSON.parse(readFileSync(path, 'utf8')).url).toBe('https://example.test');
  expect(existsSync(resolve(folder, 'captured.json'))).toBe(true);
  expect(existsSync(resolve(folder, 'extract.json'))).toBe(false);
});
