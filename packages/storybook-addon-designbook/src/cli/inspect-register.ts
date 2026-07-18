/**
 * CLI registration for the page-inspection commands (M5): `extract` and
 * `capture`. Thin action wrappers over the pure logic + browser runners in
 * extract-page.ts / capture-matrix.ts. Referenced from the extract-reference /
 * ensure-baseline skill tasks.
 */

import type { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { load as parseYaml } from 'js-yaml';
import { loadConfig } from '../config.js';

export function register(program: Command): void {
  program
    .command('extract <url>')
    .description('One browser pass → extract.json skeleton (landmarks, interactive, forms, images, fonts, colors).')
    .requiredOption('--out <dir>', 'Output directory for extract.json + captured.json')
    .option('--breakpoints <list>', 'Comma-separated breakpoint names (e.g. sm,xl)')
    .option('--fonts <list>', 'Comma-separated font families to check')
    .action(async (url: string, opts: { out: string; breakpoints?: string; fonts?: string }) => {
      const config = loadConfig();
      const { runExtractPage, parseBreakpointNames } = await import('./extract-page.js');
      try {
        const outPath = await runExtractPage(
          url,
          opts.out,
          { breakpoints: parseBreakpointNames(opts.breakpoints), fonts: parseBreakpointNames(opts.fonts) },
          config,
        );
        console.log(`Wrote ${outPath}`);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    });

  const capture = program.command('capture').description('Capture screenshots (matrix mode reads a meta.yml).');
  capture
    .command('matrix <meta>')
    .description('Capture the element × region × breakpoint matrix from a meta.yml in one browser session.')
    .requiredOption('--out <dir>', 'Output directory for PNGs')
    .requiredOption('--url <url>', 'Base URL to capture')
    .option('--consent-selector <sel>', 'Selector clicked once to dismiss a consent banner')
    .action(async (metaPath: string, opts: { out: string; url: string; consentSelector?: string }) => {
      const config = loadConfig();
      const { matrixCellsFromMeta, planCaptureMatrix, runCaptureMatrix } = await import('./capture-matrix.js');
      const { resolveBreakpointWidths } = await import('../inspect/breakpoint-widths.js');
      try {
        const meta = parseYaml(readFileSync(metaPath, 'utf-8')) as Parameters<typeof matrixCellsFromMeta>[0];
        const cells = matrixCellsFromMeta(meta);
        const widths = resolveBreakpointWidths(config, [...new Set(cells.map((c) => c.breakpoint))]);
        const jobs = planCaptureMatrix(cells, widths, opts.out);
        const done = await runCaptureMatrix(
          jobs,
          { url: opts.url, ...(opts.consentSelector ? { consentSelector: opts.consentSelector } : {}) },
          config,
        );
        const captured = done.filter((j) => !j.frozen).length;
        const frozen = done.filter((j) => j.frozen).length;
        console.log(`Captured ${captured}, reused ${frozen} frozen (of ${done.length})`);
        console.log(`MATRIX_RESULT: ${JSON.stringify(done)}`);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    });
}
