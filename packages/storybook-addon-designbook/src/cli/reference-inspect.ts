/**
 * Read an UNPUBLISHED capture revision during intake.
 *
 * `reference query` is the other read path and deliberately stays what it is: a
 * fingerprinted, contract-bound, bounded read of a *published* revision for
 * design planners. Intake needs the opposite — explorative, before publication,
 * before any meta.yml exists — so it gets its own command rather than loosening
 * the contract that makes `query` trustworthy.
 *
 * Every answer here is one an agent would otherwise fetch by driving a browser:
 * does this locator resolve, what hangs under it, which images and fonts does
 * that subtree carry. The output is deliberately bounded — an unbounded subtree
 * dump would cost more context than the browser detour it replaces.
 */

import { existsSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import type { CapturedSource, PropertyNode } from '../inspect/element-walker.js';
import { cssFontFamilies } from './extract-page.js';
import { loadSourceDump, sourceDumpName } from '../reference-project.js';

export interface InspectNode {
  depth: number;
  kind: string;
  label: string;
  locator: string;
  text?: string;
}

export interface InspectResult {
  state: string;
  /** Total nodes in the state's dump — the observation the answer comes from. */
  nodes: number;
  source_ref: string;
  /** Present when a locator was requested. */
  subject?: {
    locator: string;
    found: boolean;
    kind?: string;
    label?: string;
    text?: string;
    bbox?: { x: number; y: number; width: number; height: number };
    /** Nodes in the subtree, including the subject itself. */
    descendants?: number;
    /** Image `src` identities inside the subtree, deduplicated. */
    images?: string[];
    /** Font families inside the subtree, deduplicated. */
    fonts?: string[];
    /** Subtree shape down to `depth`, truncated at `limit` nodes. */
    tree?: InspectNode[];
    truncated?: boolean;
  };
}

const DEFAULT_DEPTH = 2;
const DEFAULT_LIMIT = 40;

function subtree(dump: CapturedSource, root: PropertyNode): PropertyNode[] {
  const byId = new Map(dump.nodes.map((node) => [node.id, node]));
  const out: PropertyNode[] = [];
  const walk = (id: string) => {
    const node = byId.get(id);
    if (!node) return;
    out.push(node);
    node.child_ids.forEach(walk);
  };
  walk(root.id);
  return out;
}

export function inspectReference(opts: {
  reference: string;
  state: string;
  locator?: string;
  depth?: number;
  limit?: number;
}): InspectResult {
  if (!isAbsolute(opts.reference)) throw new Error('reference: expected absolute revision directory');
  const file = join(opts.reference, sourceDumpName(opts.state));
  if (!existsSync(file))
    throw new Error(`No dump for state "${opts.state}" in ${opts.reference} — run reference save --state first`);
  const dump = loadSourceDump(opts.reference, opts.state);
  const result: InspectResult = { state: opts.state, nodes: dump.nodes.length, source_ref: dump.source_ref };
  if (!opts.locator) return result;

  const root = dump.nodes.find((node) => node.source.locator === opts.locator);
  if (!root) {
    // An unresolved locator is the answer, not an error: intake asks this
    // question precisely to find out, and a nonzero exit would hide the
    // candidates the agent needs to correct it.
    result.subject = { locator: opts.locator, found: false };
    return result;
  }

  const depth = opts.depth ?? DEFAULT_DEPTH;
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const tree = subtree(dump, root);
  const depthOf = new Map<string, number>([[root.id, 0]]);
  for (const node of tree) for (const child of node.child_ids) depthOf.set(child, (depthOf.get(node.id) ?? 0) + 1);

  const shown: InspectNode[] = [];
  for (const node of tree) {
    const level = depthOf.get(node.id) ?? 0;
    if (level > depth) continue;
    if (shown.length >= limit) break;
    shown.push({
      depth: level,
      kind: node.kind,
      label: node.label,
      locator: node.source.locator,
      ...(node.text ? { text: node.text } : {}),
    });
  }
  const withinDepth = tree.filter((node) => (depthOf.get(node.id) ?? 0) <= depth).length;

  result.subject = {
    locator: opts.locator,
    found: true,
    kind: root.kind,
    label: root.label,
    ...(root.text ? { text: root.text } : {}),
    bbox: root.bbox,
    descendants: tree.length,
    images: [...new Set(tree.map((node) => node.src).filter((src): src is string => Boolean(src)))],
    fonts: [
      ...new Set(tree.flatMap((node) => (node.style?.font_family ? cssFontFamilies(node.style.font_family) : []))),
    ].sort(),
    tree: shown,
    ...(shown.length < withinDepth ? { truncated: true } : {}),
  };
  return result;
}
