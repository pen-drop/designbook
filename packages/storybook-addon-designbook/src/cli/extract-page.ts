/**
 * `_debo extract <url>` — one headless browser pass that dumps a reference page's
 * structure into an `extract.json` skeleton the `extract-reference` task then
 * fills the judgment gaps on. The mechanics (landmarks, interactive elements,
 * forms, images/assets, fonts, colors) live here in code; the completeness
 * judgment stays model work in the task.
 *
 * Built on the existing `inspect/` capture + style-env primitives so there is one
 * browser-automation path in the addon, not per-run improvised playwright
 * one-liners.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { CapturedSource, PropertyNode } from '../inspect/element-walker.js';
import type { StyleEnv } from '../inspect/style-env.js';
import type { DesignbookConfig } from '../config.js';

export interface ExtractLandmark {
  label: string;
  role: string;
  locator: string;
}
export interface ExtractInteractive {
  label: string;
  kind: string;
  text?: string;
  href?: string;
  locator: string;
}
export interface ExtractForm {
  label: string;
  locator: string;
  fields: Array<{ label: string; kind: string; locator: string }>;
}
export interface ExtractImage {
  src: string;
  alt?: string;
  locator: string;
}
export interface ExtractSkeleton {
  url: string;
  breakpoints: string[];
  landmarks: ExtractLandmark[];
  interactive: ExtractInteractive[];
  forms: ExtractForm[];
  images: ExtractImage[];
  fonts: string[];
  colors: string[];
}

const INTERACTIVE_KINDS = new Set(['button', 'link', 'input']);

/** Collect the ids of every descendant of `rootId` from the flat node list. */
function descendantIds(nodes: PropertyNode[], rootId: string): Set<string> {
  const byParent = new Map<string, string[]>();
  for (const n of nodes) {
    if (!n.parent_id) continue;
    (byParent.get(n.parent_id) ?? byParent.set(n.parent_id, []).get(n.parent_id)!).push(n.id);
  }
  const out = new Set<string>();
  const stack = [...(byParent.get(rootId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    stack.push(...(byParent.get(id) ?? []));
  }
  return out;
}

/**
 * Assemble the extract.json skeleton from a captured DOM tree and (optional)
 * document style env. Pure: same inputs → same output, no browser or IO.
 */
export function buildExtractSkeleton(
  captured: CapturedSource,
  styleEnv: StyleEnv | undefined,
  meta: { url: string; breakpoints: string[] },
): ExtractSkeleton {
  const nodes = captured.nodes ?? [];
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const landmarks: ExtractLandmark[] = [];
  const interactive: ExtractInteractive[] = [];
  const forms: ExtractForm[] = [];
  const images: ExtractImage[] = [];
  const fonts = new Set<string>();
  const colors = new Set<string>();

  for (const n of nodes) {
    if (n.role) landmarks.push({ label: n.label, role: n.role, locator: n.source.locator });

    if (INTERACTIVE_KINDS.has(n.kind)) {
      interactive.push({
        label: n.label,
        kind: n.kind,
        ...(n.text ? { text: n.text } : {}),
        ...(n.href ? { href: n.href } : {}),
        locator: n.source.locator,
      });
    }

    if (n.kind === 'form') {
      const descendants = descendantIds(nodes, n.id);
      const fields = [...descendants]
        .map((id) => byId.get(id)!)
        .filter((c) => c && c.kind === 'input')
        .map((c) => ({ label: c.label, kind: c.kind, locator: c.source.locator }));
      forms.push({ label: n.label, locator: n.source.locator, fields });
    }

    if ((n.kind === 'image' || n.kind === 'icon') && n.src) {
      images.push({ src: n.src, ...(n.alt ? { alt: n.alt } : {}), locator: n.source.locator });
    }

    if (n.style?.font_family) fonts.add(n.style.font_family);
    if (n.style?.background) colors.add(n.style.background);
    if (n.style?.foreground) colors.add(n.style.foreground);
  }

  for (const f of styleEnv?.fonts ?? []) if (f.family) fonts.add(f.family);

  return {
    url: meta.url,
    breakpoints: meta.breakpoints,
    landmarks,
    interactive,
    forms,
    images,
    fonts: [...fonts].sort(),
    colors: [...colors].sort(),
  };
}

/** Parse a comma-separated breakpoint list (`sm,xl`) into trimmed names. */
export function parseBreakpointNames(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Capture the DOM tree (one pass) and the document style env (a second short pass,
 * best-effort) and write the extract skeleton to `<out>/extract.json`. Also writes
 * the raw captured tree so the task can query it with jq without pasting it into
 * the conversation.
 */
export async function runExtractPage(
  url: string,
  outDir: string,
  opts: { breakpoints: string[]; fonts: string[] },
  config: DesignbookConfig,
): Promise<string> {
  const { capture } = await import('../inspect/capture.js');
  const { resolveBreakpointWidths } = await import('../inspect/breakpoint-widths.js');

  await mkdir(outDir, { recursive: true });
  const capturedPath = resolve(outDir, 'captured.json');
  const widths = resolveBreakpointWidths(config, opts.breakpoints);
  await capture(url, capturedPath, widths);

  const { readFile } = await import('node:fs/promises');
  const captured = JSON.parse(await readFile(capturedPath, 'utf-8')) as CapturedSource;

  let styleEnv: StyleEnv | undefined;
  try {
    const { captureStyleEnv } = await import('../inspect/style-env.js');
    styleEnv = await captureStyleEnv(url, { fonts: opts.fonts });
  } catch {
    styleEnv = undefined; // degrade — the captured tree still yields fonts/colors
  }

  const skeleton = buildExtractSkeleton(captured, styleEnv, {
    url,
    breakpoints: widths.map((w) => w.name).filter(Boolean),
  });
  const outPath = resolve(outDir, 'extract.json');
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(skeleton, null, 2));
  return outPath;
}
