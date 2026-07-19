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
    .description(
      'Capture the element × state × breakpoint matrix from an extract-reference meta.yml in one browser session.',
    )
    .requiredOption('--out <dir>', 'Output directory for PNGs')
    .requiredOption('--url <url>', 'Base URL to capture')
    .option('--consent-selector <sel>', 'Selector clicked once to dismiss a consent banner')
    .action(async (metaPath: string, opts: { out: string; url: string; consentSelector?: string }) => {
      const config = loadConfig();
      const { matrixCellsFromMeta, planCaptureMatrix, runCaptureMatrix, ensureCellsPlanned } =
        await import('./capture-matrix.js');
      const { resolveBreakpointWidths } = await import('../inspect/breakpoint-widths.js');
      try {
        const meta = parseYaml(readFileSync(metaPath, 'utf-8')) as Parameters<typeof matrixCellsFromMeta>[0];
        const cells = matrixCellsFromMeta(meta);
        ensureCellsPlanned(cells, metaPath);
        const widths = resolveBreakpointWidths(config, [...new Set(cells.map((c) => c.breakpoint))]);
        const jobs = planCaptureMatrix(cells, widths, opts.out);
        const { jobs: done, warnings } = await runCaptureMatrix(
          jobs,
          { url: opts.url, ...(opts.consentSelector ? { consentSelector: opts.consentSelector } : {}) },
          config,
        );
        const captured = done.filter((j) => !j.frozen).length;
        const frozen = done.filter((j) => j.frozen).length;
        console.log(`Captured ${captured}, reused ${frozen} frozen (of ${done.length})`);
        for (const w of warnings) console.warn(`Warning: ${w}`);
        console.log(`MATRIX_RESULT: ${JSON.stringify({ jobs: done, warnings })}`);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    });

  capture
    .command('screenshot')
    .description('Capture ONE element (or story root / full page) in a single browser session.')
    .requiredOption('--url <url>', 'URL (reference page or story iframe) to capture')
    .requiredOption('--out <png>', 'Output PNG path')
    .requiredOption('--width <px>', 'Viewport width in pixels', (v) => Number.parseInt(v, 10))
    .option('--selector <sel>', 'Element selector to isolate ("" ⇒ full page / story root)', '')
    .option('--steps <json>', 'JSON array of capture steps to reach a non-rest state')
    .option('--consent-selector <sel>', 'Selector clicked once to dismiss a consent banner')
    .option('--transparent', 'Capture with a transparent background (default for element captures)')
    .option('--full-page', 'Full-page capture when no selector is given')
    .action(
      async (opts: {
        url: string;
        out: string;
        width: number;
        selector: string;
        steps?: string;
        consentSelector?: string;
        transparent?: boolean;
        fullPage?: boolean;
      }) => {
        const config = loadConfig();
        const { runCaptureScreenshot, parseStepsArg } = await import('./capture-screenshot.js');
        try {
          const result = await runCaptureScreenshot(
            {
              url: opts.url,
              selector: opts.selector,
              width: opts.width,
              outPath: opts.out,
              steps: parseStepsArg(opts.steps),
              ...(opts.transparent !== undefined ? { transparent: opts.transparent } : {}),
              ...(opts.fullPage !== undefined ? { fullPage: opts.fullPage } : {}),
              ...(opts.consentSelector ? { consentSelector: opts.consentSelector } : {}),
            },
            config,
          );
          console.log(`Wrote ${result.outPath}`);
          if (result.warning) console.warn(`Warning: ${result.warning}`);
          console.log(`SCREENSHOT_RESULT: ${JSON.stringify(result)}`);
        } catch (err) {
          console.error(`Error: ${(err as Error).message}`);
          process.exitCode = 1;
        }
      },
    );
}
