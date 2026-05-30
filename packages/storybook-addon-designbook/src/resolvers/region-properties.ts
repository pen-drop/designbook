import { existsSync, mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve as joinPath } from 'node:path';
import { createHash } from 'node:crypto';
import type { ParamResolver, ResolverContext, ResolverResult } from './types.js';
import type { CapturedSource } from '../inspect/element-walker.js';
import { capture } from '../inspect/capture.js';
import { resolveBreakpointWidths } from '../inspect/breakpoint-widths.js';
import { locateRegion, pickRegionLabel } from '../inspect/region.js';
import { isFeatureEnabled } from '../config/features.js';
import type { DesignbookConfig } from '../config.js';

function hashUrl(url: string): string {
  return createHash('sha256').update(url.toLowerCase().replace(/\/+$/, '')).digest('hex').slice(0, 12);
}

function referenceFolder(url: string, dataDir: string): string {
  return joinPath(dataDir, 'references', hashUrl(url));
}

export const regionPropertiesResolver: ParamResolver = {
  name: 'region_properties',

  async resolve(input: string, _config: Record<string, unknown>, context: ResolverContext): Promise<ResolverResult> {
    const url = input && input !== '' ? input : undefined;
    if (!url || !/^https?:\/\//i.test(url)) {
      return { resolved: true, value: undefined, input: url ?? '' };
    }

    // Feature flag (default on). Off → param drops; the region-properties rules
    // fall back to extract.json + design_hint.
    if (!isFeatureEnabled('region_properties', context.config)) {
      return { resolved: true, value: undefined, input: url };
    }

    // Prefer the workflow's already-resolved reference_folder so we share the
    // cache directory with extract-reference. Computing it locally would
    // duplicate reference-folder.ts's URL normalization.
    const paramRefDir = context.params.reference_folder;
    const dataDir = (context.config as { data: string }).data;
    const refDir = typeof paramRefDir === 'string' && paramRefDir ? paramRefDir : referenceFolder(url, dataDir);
    const elementTreeDir = joinPath(refDir, '.element-tree');
    const sourcePath = joinPath(elementTreeDir, 'source.json');

    const bpParam = context.params.breakpoints;
    const bpNames =
      typeof bpParam === 'string'
        ? bpParam
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : Array.isArray(bpParam)
          ? bpParam.filter((x): x is string => typeof x === 'string')
          : [];
    const breakpointWidths = resolveBreakpointWidths(context.config as DesignbookConfig, bpNames);

    if (!existsSync(sourcePath)) {
      try {
        mkdirSync(elementTreeDir, { recursive: true });
        await capture(url, sourcePath, breakpointWidths);
      } catch (error) {
        console.warn(`[region-properties] capture failed: ${(error as Error).message}`);
        return { resolved: true, value: undefined, input: url };
      }
    }

    let captured: CapturedSource;
    try {
      captured = JSON.parse(await readFile(sourcePath, 'utf8')) as CapturedSource;
      if (!captured || !Array.isArray(captured.nodes)) {
        throw new Error('CapturedSource is missing nodes[]');
      }
    } catch (error) {
      console.warn(`[region-properties] failed to read ${sourcePath}: ${(error as Error).message}`);
      return { resolved: true, value: undefined, input: url };
    }

    const label = pickRegionLabel(context.params);
    const region = locateRegion(captured, label);
    return { resolved: true, value: region as unknown as Record<string, unknown>, input: url };
  },
};
