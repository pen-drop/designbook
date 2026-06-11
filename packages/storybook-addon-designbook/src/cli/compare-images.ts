/**
 * `compare-images` — deterministic pixel-diff of a reference vs a captured
 * screenshot via odiff. Produces a measured `diff_percent` and a severity derived
 * in code, so the compare/verify score is model-independent (same screenshots →
 * same score) instead of self-graded by the model's visual judgement.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Command } from 'commander';

export type CompareSeverity = 'pass' | 'minor' | 'major' | 'critical';

export interface CompareImagesResult {
  match: boolean;
  reason: 'equal' | 'pixel-diff' | 'layout-diff' | 'file-not-exists';
  /** Ratio 0..1 (odiff diffPercentage / 100). 0 when matched; 1 when a side is missing. */
  diff_percent: number;
  diff_pixels: number;
  ref_dim: { w: number; h: number } | null;
  actual_dim: { w: number; h: number } | null;
  /** Per-axis |actual-ref|/ref. Empty when a dimension is unknown. */
  dimension_drift: { w: number; h: number } | null;
  /** Count of image rows containing diffs (spatial-extent signal). */
  diff_line_count: number;
  diff_path: string;
  severity: CompareSeverity;
  missing?: string;
}

/** Read PNG width/height from the IHDR chunk (no image dependency). */
export function pngDimensions(path: string): { w: number; h: number } | null {
  try {
    const head = Buffer.alloc(24);
    const fd = readFileSync(path);
    fd.copy(head, 0, 0, 24);
    // PNG signature (8 bytes) + IHDR length (4) + "IHDR" (4) → width@16, height@20
    if (head.toString('ascii', 12, 16) !== 'IHDR') return null;
    return { w: head.readUInt32BE(16), h: head.readUInt32BE(20) };
  } catch {
    return null;
  }
}

/**
 * Deterministic severity from the measured signals. Floors (take the highest
 * match); combines pixel ratio, structural dimension drift, and spatial extent
 * (diff line count) so a small-but-widely-spread shift isn't undercounted.
 */
export function severityFromMeasure(input: {
  diff_percent: number;
  dimension_drift: { w: number; h: number } | null;
  diff_line_count: number;
  ref_dim: { w: number; h: number } | null;
}): CompareSeverity {
  const { diff_percent, dimension_drift, diff_line_count, ref_dim } = input;
  const drift = dimension_drift ? Math.max(dimension_drift.w, dimension_drift.h) : 0;
  // Spatial extent: fraction of rows touched (catches horizontal shifts that are
  // few % of pixels but span most of the height).
  const extent = ref_dim && ref_dim.h > 0 ? diff_line_count / ref_dim.h : 0;
  if (diff_percent > 0.25 || drift > 0.25) return 'critical';
  if (diff_percent > 0.1 || drift > 0.1 || extent > 0.5) return 'major';
  if (diff_percent > 0.02 || drift > 0.02) return 'minor';
  return 'pass';
}

/** Measure ref vs actual. `base = reference` (denominator + diff image are the base). */
export async function compareImages(
  referencePath: string,
  actualPath: string,
  diffPath: string,
  opts?: { threshold?: number },
): Promise<CompareImagesResult> {
  const ref_dim = existsSync(referencePath) ? pngDimensions(referencePath) : null;
  const actual_dim = existsSync(actualPath) ? pngDimensions(actualPath) : null;
  const dimension_drift =
    ref_dim && actual_dim && ref_dim.w > 0 && ref_dim.h > 0
      ? { w: Math.abs(actual_dim.w - ref_dim.w) / ref_dim.w, h: Math.abs(actual_dim.h - ref_dim.h) / ref_dim.h }
      : null;

  const { compare } = await import('odiff-bin');
  const r = await compare(referencePath, actualPath, diffPath, {
    // Measure pixel diff even when sizes differ (top-left aligned, missing area
    // counts as diff) — do NOT bail to layout-diff; we report drift separately.
    failOnLayoutDiff: false,
    antialiasing: true,
    threshold: opts?.threshold ?? 0.1,
    captureDiffLines: true,
    noFailOnFsErrors: true,
  });

  const base = { ref_dim, actual_dim, dimension_drift, diff_path: diffPath };

  if (r.match) {
    return {
      ...base,
      match: true,
      reason: 'equal',
      diff_percent: 0,
      diff_pixels: 0,
      diff_line_count: 0,
      severity: 'pass',
    };
  }
  if (r.reason === 'file-not-exists') {
    return {
      ...base,
      match: false,
      reason: 'file-not-exists',
      diff_percent: 1,
      diff_pixels: 0,
      diff_line_count: 0,
      severity: 'critical',
      missing: r.file,
    };
  }
  if (r.reason === 'layout-diff') {
    // Only reached if a future caller opts into failOnLayoutDiff; score from drift.
    return {
      ...base,
      match: false,
      reason: 'layout-diff',
      diff_percent: 1,
      diff_pixels: 0,
      diff_line_count: 0,
      severity: 'critical',
    };
  }
  const diff_percent = r.diffPercentage / 100;
  const diff_line_count = r.diffLines?.length ?? 0;
  return {
    ...base,
    match: false,
    reason: 'pixel-diff',
    diff_percent,
    diff_pixels: r.diffCount,
    diff_line_count,
    severity: severityFromMeasure({ diff_percent, dimension_drift, diff_line_count, ref_dim }),
  };
}

export function register(program: Command): void {
  program
    .command('compare-images')
    .description('Deterministic pixel-diff (odiff) of a reference vs a captured screenshot.')
    .requiredOption('--reference <path>', 'Reference screenshot (the comparison base)')
    .requiredOption('--actual <path>', 'Captured Storybook screenshot')
    .requiredOption('--diff <path>', 'Output diff image path')
    .option('--threshold <n>', 'Per-pixel color threshold 0..1 (default 0.1)', (v) => parseFloat(v))
    .action(async (opts: { reference: string; actual: string; diff: string; threshold?: number }) => {
      const result = await compareImages(resolve(opts.reference), resolve(opts.actual), resolve(opts.diff), {
        threshold: opts.threshold,
      });
      console.log(JSON.stringify(result));
    });
}
