import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'js-yaml';
import type { DesignbookConfig } from '../config.js';

export interface BreakpointWidth {
  name: string;
  width: number;
}

// Mirrors src/components/VisualCompareTool.tsx KNOWN_BREAKPOINTS.
const KNOWN_BREAKPOINTS: Record<string, number> = { sm: 640, md: 768, lg: 1024, xl: 1280 };

const TOKENS_PATH = 'design-system/design-tokens.yml';

function widthsFromTokens(dataDir: string): Record<string, number> {
  const file = join(dataDir, TOKENS_PATH);
  if (!existsSync(file)) return {};
  let parsed: unknown;
  try {
    parsed = load(readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
  const semantic = (parsed as { semantic?: { breakpoints?: Record<string, unknown> } })?.semantic;
  const bps = semantic?.breakpoints;
  if (!bps || typeof bps !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [name, def] of Object.entries(bps)) {
    if (name.startsWith('$')) continue;
    const raw = (def as { $value?: unknown })?.$value;
    const px = typeof raw === 'string' ? Number.parseInt(raw, 10) : typeof raw === 'number' ? raw : NaN;
    if (Number.isFinite(px) && px > 0) out[name] = px;
  }
  return out;
}

/**
 * Resolve breakpoint names to pixel widths, ascending. Token-defined widths win;
 * otherwise Tailwind defaults. Names with no known width are dropped.
 */
export function resolveBreakpointWidths(config: DesignbookConfig, names: string[]): BreakpointWidth[] {
  const tokenWidths = widthsFromTokens(config.data);
  const out: BreakpointWidth[] = [];
  for (const name of names) {
    const width = tokenWidths[name] ?? KNOWN_BREAKPOINTS[name];
    if (typeof width === 'number') out.push({ name, width });
  }
  return out.sort((a, b) => a.width - b.width);
}
