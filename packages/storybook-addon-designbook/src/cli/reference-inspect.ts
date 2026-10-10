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
import type { CapturedSource, PropertyNode } from '../tools/inspect/element-walker.js';
import { cssFontFamilies } from './extract-page.js';
import { sourceDumpName } from '../tools/reference-project.js';
import { readPublishedCapture, type ObservationSample, type ReferenceContract } from '../tools/reference-capture.js';
import {
  isObservationDocument,
  parseObservationDocument,
  readStoredExtract,
  type ReferenceObservationDocument,
} from '../tools/reference-observations.js';

export interface InspectNode {
  depth: number;
  kind: string;
  label: string;
  locator: string;
  text?: string;
}

/**
 * Why a locator did not resolve, in the terms the agent can act on. A dump
 * records one exact locator per node, so a selector that addresses the right
 * element in the browser still misses here when it is written differently.
 */
export interface InspectMiss {
  /** Recorded locators ending in the requested path — the same node, named in full. */
  suffix_matches?: string[];
  /** Deepest ancestor of the requested path that the dump does record. */
  resolved_prefix?: string;
  /** First requested segment absent under `resolved_prefix`. */
  failed_segment?: string;
  /** Recorded children of `resolved_prefix` — the segments that exist instead. */
  children?: string[];
}

export interface InspectResult {
  state: string;
  /** Total nodes in the state's dump — the observation the answer comes from. */
  nodes: number;
  source_ref: string;
  /** Imported observations only: the source kind and the locator kind that was matched. */
  source_kind?: string;
  locator_kind?: string;
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
    /** Present when `found` is false and the dump offers a way forward. */
    miss?: InspectMiss;
    /** Imported observations: the sample cell the node was found in, and its explicit gaps. */
    context?: { subject: string; view: string; state: string };
    unavailable?: ObservationSample['unavailable'];
  };
}

const DEFAULT_DEPTH = 2;
const DEFAULT_LIMIT = 40;
/** Walker locator separator — `getDomPath` joins its segments with this. */
const SEPARATOR = ' > ';
const MAX_CANDIDATES = 10;

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

/**
 * Probe the requested path hierarchically so a miss names its own cause.
 *
 * Two mechanisms, because the two realistic misses have different answers: a
 * locator written shorter than the recorded path (`app-site-header` for
 * `body > app-root > app-site-header`) is found by suffix, while a path whose
 * tail is wrong (a stale `nth-of-type`, an element the walk never saw because
 * it was hidden) is found by keeping the ancestors that do resolve and naming
 * the children that exist there instead.
 */
function locatorMiss(dump: CapturedSource, locator: string): InspectMiss {
  const requested = locator
    .split(SEPARATOR)
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (!requested.length) return {};
  const path = requested.join(SEPARATOR);
  const miss: InspectMiss = {};

  const suffixMatches = dump.nodes
    .map((node) => node.source.locator)
    .filter((recorded) => recorded === path || recorded.endsWith(SEPARATOR + path));
  if (suffixMatches.length) miss.suffix_matches = suffixMatches.slice(0, MAX_CANDIDATES);

  for (let depth = requested.length - 1; depth > 0; depth--) {
    const prefix = requested.slice(0, depth).join(SEPARATOR);
    const ancestor = dump.nodes.find((node) => node.source.locator === prefix);
    if (!ancestor) continue;
    const byId = new Map(dump.nodes.map((node) => [node.id, node]));
    miss.resolved_prefix = prefix;
    miss.failed_segment = requested[depth]!;
    miss.children = ancestor.child_ids
      .map((id) => byId.get(id)?.source.locator)
      .filter((child): child is string => Boolean(child))
      .slice(0, MAX_CANDIDATES);
    break;
  }
  return miss;
}

export interface InspectOptions {
  reference: string;
  state: string;
  locator?: string;
  depth?: number;
  limit?: number;
  /** Imported observations: narrow the sample context and name the native locator kind. */
  subject?: string;
  view?: string;
  locatorKind?: string;
  /** Effective workflow contract for unpublished imported observations. */
  contract?: ReferenceContract;
}

/**
 * Imported observations carry no CSS paths: a native id either is a node of the
 * selected sample or it is not. Membership in stored evidence, not live freshness.
 */
function inspectImported(raw: unknown, opts: InspectOptions): InspectResult {
  const published = existsSync(join(opts.reference, 'publication.json'));
  const contract = published ? readPublishedCapture(opts.reference).contract : opts.contract;
  if (!contract) throw new Error('Imported observations need --contract <json> (the effective workflow contract)');
  const doc: ReferenceObservationDocument = parseObservationDocument(raw, contract);
  const contexts = doc.extract.subjects.flatMap((subject) =>
    subject.samples
      .filter((sample) => (!opts.subject || subject.id === opts.subject) && (!opts.view || sample.view === opts.view))
      .map((sample) => ({ subject: subject.id, sample })),
  );
  const result: InspectResult = {
    state: opts.state,
    nodes: contexts.reduce((total, { sample }) => total + sample.structure.nodes.length, 0),
    source_ref: doc.capture.source.identity,
    source_kind: doc.capture.source.kind,
  };
  if (!opts.locator) return result;
  if (!opts.locatorKind) throw new Error('Imported observations need --locator-kind with --locator (e.g. figma-node)');
  result.locator_kind = opts.locatorKind;
  const hits = contexts.flatMap(({ subject, sample }) => {
    const node = sample.structure.nodes.find(
      (item) => item.locator.kind === opts.locatorKind && item.locator.value === opts.locator,
    );
    return node ? [{ subject, sample, node }] : [];
  });
  if (!hits.length) {
    result.subject = { locator: opts.locator, found: false };
    return result;
  }
  if (hits.length > 1)
    throw new Error(
      `Locator ${opts.locator} is ambiguous across ${hits
        .map((hit) => `${hit.subject}/${hit.sample.view}`)
        .join(', ')}; select one with --subject and --view`,
    );
  const { subject, sample, node: root } = hits[0]!;
  const byId = new Map(sample.structure.nodes.map((node) => [node.id, node]));
  const depth = opts.depth ?? DEFAULT_DEPTH;
  const limit = opts.limit ?? DEFAULT_LIMIT;
  // The structure was validated acyclic and fully placed before this walk.
  const tree: Array<{ node: (typeof sample.structure.nodes)[number]; level: number }> = [];
  const walk = (id: string, level: number) => {
    const node = byId.get(id)!;
    tree.push({ node, level });
    node.children.forEach((child) => walk(child, level + 1));
  };
  walk(root.id, 0);
  const withinDepth = tree.filter((item) => item.level <= depth);
  const shown = withinDepth.slice(0, limit).map(({ node, level }) => ({
    depth: level,
    kind: node.kind,
    label: node.id,
    locator: node.locator.value,
  }));
  result.subject = {
    locator: opts.locator,
    found: true,
    kind: root.kind,
    label: root.id,
    context: { subject, view: sample.view, state: sample.state },
    descendants: tree.length,
    images: sample.dependencies.asset_ids,
    fonts: sample.dependencies.font_families,
    unavailable: sample.unavailable,
    tree: shown,
    ...(shown.length < withinDepth.length ? { truncated: true } : {}),
  };
  return result;
}

export function inspectReference(opts: InspectOptions): InspectResult {
  if (!isAbsolute(opts.reference)) throw new Error('reference: expected absolute revision directory');
  const file = join(opts.reference, sourceDumpName(opts.state));
  if (!existsSync(file))
    throw new Error(
      `No dump for state "${opts.state}" in ${opts.reference} — run reference save --state (browser) or reference import (translated source observations) first`,
    );
  const raw = readStoredExtract(opts.reference, opts.state);
  if (isObservationDocument(raw)) return inspectImported(raw, opts);
  const dump = raw as CapturedSource;
  if (!Array.isArray(dump?.nodes))
    throw new Error(`${sourceDumpName(opts.state)}: expected a source dump with nodes[]`);
  const result: InspectResult = { state: opts.state, nodes: dump.nodes.length, source_ref: dump.source_ref };
  if (!opts.locator) return result;

  const root = dump.nodes.find((node) => node.source.locator === opts.locator);
  if (!root) {
    // An unresolved locator is the answer, not an error: intake asks this
    // question precisely to find out, and a nonzero exit would hide the
    // candidates the agent needs to correct it.
    const miss = locatorMiss(dump, opts.locator);
    result.subject = {
      locator: opts.locator,
      found: false,
      ...(Object.keys(miss).length ? { miss } : {}),
    };
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
