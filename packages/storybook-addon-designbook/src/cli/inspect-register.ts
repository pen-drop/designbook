/**
 * CLI registration for `reference` (save, capture-image, capture-file, image,
 * validate, prepare, query, approval-write, approval-check) and `capture matrix`.
 */

import type { Command } from 'commander';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { loadConfig } from '../shared/config.js';
import {
  assertUnpublishedTarget,
  captureLocation,
  reserveCapture,
  publishCapture,
  digestBytes,
  type CaptureDefinition,
  type ReferenceContract,
} from '../tools/reference-capture.js';
import { checkApproval, writeApproval } from '../tools/reference-approval.js';
import { pngSize, sourceDumpName } from '../tools/reference-project.js';

/** Hash every revision file except the reservation/publication markers. */
function revisionFileHashes(directory: string): Record<string, string> {
  const hashes: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      const rel = relative(directory, abs);
      if (rel === 'publication.json' || rel === '.capture-owner.json') continue;
      hashes[rel] = digestBytes(readFileSync(abs));
    }
  };
  walk(directory);
  return hashes;
}

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
        await import('../tools/reference-query.js');
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
  reference
    .command('capture-location')
    .description(
      'Resolve the revision directory for a fixed capture. The revision digest covers the selected scope and prelude, so the whole capture block is required — not just the source.',
    )
    .requiredOption('--capture <path>', 'JSON capture block: role, source, optional prelude, and the fixed scope')
    .requiredOption('--workflow-id <id>', 'Unique fixed capture workflow ID; refresh uses a new ID')
    .action((opts: { capture: string; workflowId: string }) => {
      const capture = JSON.parse(readFileSync(opts.capture, 'utf8')) as CaptureDefinition;
      if (!capture?.source?.kind || !capture.source.identity || !Array.isArray(capture.scope) || !capture.scope.length)
        throw new Error('--capture: expected a capture block with source.kind, source.identity and a non-empty scope');
      console.log(JSON.stringify(captureLocation(loadConfig().data, capture, opts.workflowId)));
    });
  reference
    .command('publish')
    .description(
      'Seal a finished capture revision: fingerprint every file and write the self-contained publication binding. No observation validation — the human decides the screenshots are right.',
    )
    .requiredOption('--capture <json>', 'JSON capture block: role, source, optional prelude, and the fixed scope')
    .requiredOption('--workflow-id <id>', 'Capture workflow id (a revision digest input)')
    .requiredOption('--owner <path>', 'Owner identity recorded for the revision (the plan path)')
    .requiredOption('--contract <json>', 'JSON { referenceSchema, definitions } frozen for later reference queries')
    .action((opts: { capture: string; workflowId: string; owner: string; contract: string }) => {
      try {
        const capture = JSON.parse(readFileSync(opts.capture, 'utf8')) as CaptureDefinition;
        const contract = JSON.parse(readFileSync(opts.contract, 'utf8')) as ReferenceContract;
        const data = loadConfig().data;
        const location = captureLocation(data, capture, opts.workflowId);
        const owner = resolve(opts.owner);
        const ownerFile = join(location.directory, '.capture-owner.json');
        if (!existsSync(ownerFile)) {
          reserveCapture(location.directory, owner);
        } else {
          const existing = JSON.parse(readFileSync(ownerFile, 'utf8')) as { workflow: string };
          if (existing.workflow !== owner) throw new Error(`Capture revision is owned by a different workflow`);
        }
        const binding = publishCapture({
          data,
          capture,
          workflowId: opts.workflowId,
          ownerWorkflow: owner,
          declaredFiles: revisionFileHashes(location.directory),
          contract,
        });
        console.log(JSON.stringify(binding));
      } catch (error) {
        console.error((error as Error).message);
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
          await import('../tools/reference-query.js');
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
    .requiredOption('--state <name>', 'Observed state this dump records; writes extract--<state>.json')
    .option('--session <name>', 'Named session to observe as (see config sessions:)', 'anonymous')
    .option('--steps <json>', 'JSON array of capture steps that reach the recorded state')
    .option('--prelude <file>', 'Prelude module run after navigation on every pass')
    .option('--breakpoints <list>', 'Comma-separated breakpoint names (e.g. sm,xl)')
    .option('--fonts <list>', 'Comma-separated font families to check')
    .action(
      async (opts: {
        reference: string;
        url: string;
        state: string;
        session: string;
        steps?: string;
        prelude?: string;
        breakpoints?: string;
        fonts?: string;
      }) => {
        const config = loadConfig();
        const { runExtractPage, parseBreakpointNames } = await import('./extract-page.js');
        const { parseStepsArg } = await import('./capture-screenshot.js');
        try {
          if (!isAbsolute(opts.reference)) throw new Error('reference: expected absolute revision directory');
          assertUnpublishedTarget(join(opts.reference, sourceDumpName(opts.state)));
          const result = await runExtractPage(
            opts.url,
            opts.reference,
            {
              breakpoints: parseBreakpointNames(opts.breakpoints),
              fonts: parseBreakpointNames(opts.fonts),
              state: opts.state,
              session: opts.session,
              steps: parseStepsArg(opts.steps),
              ...(opts.prelude ? { prelude: opts.prelude } : {}),
            },
            config,
          );
          console.log(JSON.stringify(result.catalogue));
        } catch (err) {
          console.error(`Error: ${(err as Error).message}`);
          process.exitCode = 1;
        }
      },
    );
  reference
    .command('capture-image')
    .description('Capture one PNG into the revision directory.')
    .requiredOption('--reference <folder>', 'Absolute capture revision or screenshot directory')
    .requiredOption('--path <rel>', 'PNG path relative to --reference')
    .requiredOption('--url <url>', 'URL (source page or story iframe)')
    .requiredOption('--width <px>', 'Viewport width in pixels', (v) => Number.parseInt(v, 10))
    .option('--selector <sel>', 'Element selector to isolate ("" ⇒ full page / story root)', '')
    .option('--steps <json>', 'JSON array of capture steps to reach a non-rest state')
    .option('--session <name>', 'Named session to observe as (see config sessions:)', 'anonymous')
    .option('--state <name>', 'Observed state this shot records; passed to the prelude')
    .option('--view <id>', 'View identity this shot records; passed to the prelude')
    .option('--prelude <file>', 'Prelude module run after navigation on every pass')
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
        session: string;
        state?: string;
        view?: string;
        prelude?: string;
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
              session: opts.session,
              ...(opts.state ? { state: opts.state } : {}),
              ...(opts.view ? { view: opts.view } : {}),
              ...(opts.prelude ? { prelude: opts.prelude } : {}),
              ...(opts.transparent !== undefined ? { transparent: opts.transparent } : {}),
              ...(opts.fullPage !== undefined ? { fullPage: opts.fullPage } : {}),
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
    .command('capture-file')
    .description('Download one source asset into the revision directory as served.')
    .requiredOption('--reference <folder>', 'Absolute capture revision directory')
    .requiredOption('--path <rel>', 'Asset path relative to --reference')
    .requiredOption('--url <url>', 'Absolute http(s) URL of the source asset')
    .option('--session <name>', 'Named session to observe as (see config sessions:)', 'anonymous')
    .action(async (opts: { reference: string; path: string; url: string; session: string }) => {
      const config = loadConfig();
      const { runCaptureFile } = await import('./capture-file.js');
      try {
        if (!isAbsolute(opts.reference)) throw new Error('reference: expected absolute revision directory');
        if (isAbsolute(opts.path)) throw new Error('path: expected a path relative to --reference');
        const outPath = join(opts.reference, opts.path);
        const rel = relative(resolve(opts.reference), resolve(outPath));
        if (rel === '..' || rel.startsWith('../') || isAbsolute(rel))
          throw new Error('path: expected a path inside --reference');
        assertUnpublishedTarget(outPath);
        const result = await runCaptureFile({ url: opts.url, outPath, session: opts.session }, config);
        console.log(JSON.stringify({ path: opts.path, bytes: result.bytes }));
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    });
  reference
    .command('prelude')
    .description(
      'Validate a prelude module and print the { path, digest } pair for a capture block. Run before workflow capture-location: the revision digest covers the prelude.',
    )
    .requiredOption('--path <file>', 'Prelude module exporting default async (page, ctx) => {}')
    .action(async (opts: { path: string }) => {
      const { loadPrelude, preludeDigest } = await import('../tools/capture-session.js');
      try {
        await loadPrelude(opts.path); // reject a non-conforming module before it is fixed into a revision
        console.log(JSON.stringify({ path: opts.path, digest: preludeDigest(opts.path) }));
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    });
  reference
    .command('inspect')
    .description(
      'Read an unpublished revision during intake: does a locator resolve, what hangs under it, which images and fonts its subtree carries.',
    )
    .requiredOption('--reference <folder>', 'Absolute capture revision directory')
    .option('--state <name>', 'Which state dump to read', 'rest')
    .option('--locator <css>', 'Native locator to resolve; omit for dump totals only')
    .option('--depth <n>', 'Subtree depth to report', (v) => Number.parseInt(v, 10))
    .option('--limit <n>', 'Maximum subtree nodes to report', (v) => Number.parseInt(v, 10))
    .action(async (opts: { reference: string; state: string; locator?: string; depth?: number; limit?: number }) => {
      const { inspectReference } = await import('./reference-inspect.js');
      try {
        console.log(
          JSON.stringify(
            inspectReference({
              reference: opts.reference,
              state: opts.state,
              ...(opts.locator ? { locator: opts.locator } : {}),
              ...(opts.depth !== undefined ? { depth: opts.depth } : {}),
              ...(opts.limit !== undefined ? { limit: opts.limit } : {}),
            }),
          ),
        );
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    });
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
  reference
    .command('approval-write')
    .description(
      'Write or update approval.yml beside a published revision. Fingerprint is sealed from publication.json files.',
    )
    .requiredOption('--reference <folder>', 'Absolute published revision directory')
    .requiredOption('--status <status>', 'pending | approved | rejected')
    .requiredOption('--scope <json>', 'JSON { subjects, states, views? and/or breakpoints? }')
    .option('--note <text>', 'Optional decision note')
    .action((opts: { reference: string; status: string; scope: string; note?: string }) => {
      try {
        if (!isAbsolute(opts.reference)) throw new Error('reference: expected absolute revision directory');
        const status = opts.status as 'pending' | 'approved' | 'rejected';
        if (status !== 'pending' && status !== 'approved' && status !== 'rejected')
          throw new Error('--status: expected pending|approved|rejected');
        const scope = JSON.parse(opts.scope);
        const record = writeApproval(opts.reference, {
          status,
          scope,
          ...(opts.note !== undefined ? { note: opts.note } : {}),
        });
        console.log(JSON.stringify(record));
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    });
  reference
    .command('approval-check')
    .description(
      'Check approval.yml against the publication files seal and whether approval.scope covers the need scope.',
    )
    .requiredOption('--reference <folder>', 'Absolute published revision directory')
    .requiredOption('--need <json>', 'JSON need scope { subjects, states, views? and/or breakpoints? }')
    .action((opts: { reference: string; need: string }) => {
      try {
        if (!isAbsolute(opts.reference)) throw new Error('reference: expected absolute revision directory');
        const result = checkApproval(opts.reference, JSON.parse(opts.need));
        console.log(JSON.stringify(result));
        if (!result.ok) process.exitCode = 1;
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
    .option('--prelude <file>', 'Prelude module run after navigation on every pass')
    .action(async (metaPath: string, opts: { out: string; url: string; prelude?: string }) => {
      const config = loadConfig();
      const { matrixCellsFromMeta, planCaptureMatrix, runCaptureMatrix, ensureCellsPlanned } =
        await import('./capture-matrix.js');
      const { resolveBreakpointWidths } = await import('../tools/inspect/breakpoint-widths.js');
      try {
        const meta = parseYaml(readFileSync(metaPath, 'utf-8')) as Parameters<typeof matrixCellsFromMeta>[0];
        const cells = matrixCellsFromMeta(meta);
        ensureCellsPlanned(cells, metaPath);
        const widths = resolveBreakpointWidths(config, [...new Set(cells.map((c) => c.breakpoint))]);
        const jobs = planCaptureMatrix(cells, widths, opts.out);
        const { jobs: done, warnings } = await runCaptureMatrix(
          jobs,
          { url: opts.url, ...(opts.prelude ? { prelude: opts.prelude } : {}) },
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
