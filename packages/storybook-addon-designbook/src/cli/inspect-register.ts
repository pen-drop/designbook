/**
 * CLI registration for `reference` (save, capture-image, image, validate,
 * prepare, query) and `capture matrix`.
 */

import type { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { loadConfig } from '../config.js';
import { assertUnpublishedTarget } from '../reference-capture.js';
import { pngSize, SOURCE_DUMP } from '../reference-project.js';

export function register(program: Command): void {
  const reference = program
    .command('reference')
    .description('Save, capture, validate and query a capture revision through the CLI.');
  reference
    .command('validate')
    .description('Validate a published capture revision and its bounded observation queries.')
    .requiredOption(
      '--reference <folder>',
      'Absolute published revision directory containing shared metadata and observations',
    )
    .option('--contract <json>', 'Optional effective schema contract; defaults to published capture workflow')
    .action(async (opts: { reference: string; contract?: string }) => {
      const { validateReferenceIntake, publishedReferenceContract, ReferenceQueryError } =
        await import('../reference-query.js');
      try {
        const contract = opts.contract
          ? JSON.parse(readFileSync(opts.contract, 'utf8'))
          : publishedReferenceContract(opts.reference);
        console.log(JSON.stringify(validateReferenceIntake(opts.reference, contract)));
      } catch (error) {
        console.error(
          JSON.stringify({
            ok: false,
            findings: error instanceof ReferenceQueryError ? error.findings : [(error as Error).message],
          }),
        );
        process.exitCode = 1;
      }
    });
  for (const operation of ['prepare', 'query'] as const) {
    reference
      .command(operation)
      .description(
        operation === 'prepare'
          ? 'Validate planned scope and emit its immutable fingerprint.'
          : 'Read the fixed package after checking its intake fingerprint.',
      )
      .requiredOption(
        '--request <json>',
        'JSON file containing reference/package/subjects/states and either views or explicitly mapped breakpoints',
      )
      .option(
        '--contract <json>',
        'JSON file with effective referenceSchema, extractSchema and definitions from the planning catalogue',
      )
      .action(async (opts: { request: string; contract?: string }) => {
        const { prepareReferenceQuery, queryReference, publishedReferenceContract, ReferenceQueryError } =
          await import('../reference-query.js');
        try {
          const request = JSON.parse(readFileSync(opts.request, 'utf8'));
          const contract = opts.contract
            ? JSON.parse(readFileSync(opts.contract, 'utf8'))
            : publishedReferenceContract(request.reference);
          console.log(
            JSON.stringify(
              operation === 'prepare' ? prepareReferenceQuery(request, contract) : queryReference(request, contract),
            ),
          );
        } catch (error) {
          console.error(
            JSON.stringify({
              ok: false,
              findings: error instanceof ReferenceQueryError ? error.findings : [(error as Error).message],
            }),
          );
          process.exitCode = 1;
        }
      });
  }
  reference
    .command('save')
    .description('Browser pass: write the source dump to the revision and print the catalogue JSON.')
    .requiredOption('--reference <folder>', 'Absolute capture revision directory')
    .requiredOption('--url <url>', 'Source URL to observe')
    .option('--breakpoints <list>', 'Comma-separated breakpoint names (e.g. sm,xl)')
    .option('--fonts <list>', 'Comma-separated font families to check')
    .action(async (opts: { reference: string; url: string; breakpoints?: string; fonts?: string }) => {
      const config = loadConfig();
      const { runExtractPage, parseBreakpointNames } = await import('./extract-page.js');
      try {
        if (!isAbsolute(opts.reference)) throw new Error('reference: expected absolute revision directory');
        assertUnpublishedTarget(join(opts.reference, SOURCE_DUMP));
        const result = await runExtractPage(
          opts.url,
          opts.reference,
          { breakpoints: parseBreakpointNames(opts.breakpoints), fonts: parseBreakpointNames(opts.fonts) },
          config,
        );
        console.log(JSON.stringify(result.catalogue));
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    });
  reference
    .command('capture-image')
    .description('Capture one PNG into the revision directory.')
    .requiredOption('--reference <folder>', 'Absolute capture revision or screenshot directory')
    .requiredOption('--path <rel>', 'PNG path relative to --reference')
    .requiredOption('--url <url>', 'URL (source page or story iframe)')
    .requiredOption('--width <px>', 'Viewport width in pixels', (v) => Number.parseInt(v, 10))
    .option('--selector <sel>', 'Element selector to isolate ("" ⇒ full page / story root)', '')
    .option('--steps <json>', 'JSON array of capture steps to reach a non-rest state')
    .option('--consent-selector <sel>', 'Selector clicked once to dismiss a consent banner')
    .option('--transparent', 'Capture with a transparent background (default for element captures)')
    .option('--full-page', 'Full-page capture when no selector is given')
    .action(
      async (opts: {
        reference: string;
        path: string;
        url: string;
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
          if (!isAbsolute(opts.reference)) throw new Error('reference: expected absolute directory');
          if (isAbsolute(opts.path)) throw new Error('path: expected a path relative to --reference');
          const outPath = join(opts.reference, opts.path);
          assertUnpublishedTarget(outPath);
          const result = await runCaptureScreenshot(
            {
              url: opts.url,
              selector: opts.selector,
              width: opts.width,
              outPath,
              steps: parseStepsArg(opts.steps),
              ...(opts.transparent !== undefined ? { transparent: opts.transparent } : {}),
              ...(opts.fullPage !== undefined ? { fullPage: opts.fullPage } : {}),
              ...(opts.consentSelector ? { consentSelector: opts.consentSelector } : {}),
            },
            config,
          );
          const size = pngSize(readFileSync(result.outPath));
          console.log(JSON.stringify({ path: opts.path, width: size.width, height: size.height }));
        } catch (err) {
          console.error(`Error: ${(err as Error).message}`);
          process.exitCode = 1;
        }
      },
    );
  reference
    .command('image')
    .description('Read PNG dimensions from a revision-relative path. No pixel payload.')
    .requiredOption('--reference <folder>', 'Absolute capture revision or screenshot directory')
    .requiredOption('--path <rel>', 'PNG path relative to --reference')
    .action((opts: { reference: string; path: string }) => {
      try {
        if (!isAbsolute(opts.reference)) throw new Error('reference: expected absolute directory');
        if (isAbsolute(opts.path)) throw new Error('path: expected a path relative to --reference');
        const bytes = readFileSync(join(opts.reference, opts.path));
        const size = pngSize(bytes);
        console.log(JSON.stringify({ path: opts.path, width: size.width, height: size.height }));
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
}
