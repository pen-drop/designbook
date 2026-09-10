/** Source-neutral publication of observations produced by ordinary workflow tasks. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, statSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { validateImage } from './validators/image.js';
import { declaredStates, sourceDumpName } from './reference-project.js';

export interface SourceLocator {
  kind: string;
  value: string;
}
export interface CaptureSource {
  kind: string;
  identity: string;
  revision: string | null;
}
export interface CaptureScope {
  subject: string;
  view: string;
  state: string;
  /** Session the state is observed as; `anonymous` when no session is loaded. */
  session: string;
  locator: SourceLocator;
  breakpoint?: string;
}
/**
 * The prelude that made every pass of this revision observable. Its path stays
 * in the repo so one script serves every revision of a source; its digest is
 * fixed here so a later edit cannot silently redefine what was observed.
 */
export interface CapturePrelude {
  path: string;
  digest: string;
}
export interface CaptureDefinition {
  role: 'reference' | 'actual';
  source: CaptureSource;
  prelude?: CapturePrelude;
  scope: CaptureScope[];
}
/**
 * The frozen query contract a later reference query needs, stored in the binding so
 * queries are self-contained — no workflow document is reloaded after publication.
 */
export interface ReferenceContract {
  referenceSchema: unknown;
  definitions: Record<string, object>;
}
export interface CaptureBinding {
  id: string;
  revision: string;
  directory: string;
  workflow: string;
  files: Record<string, string>;
  contract: ReferenceContract;
}
export interface ObservationStructure {
  roots: string[];
  nodes: Array<{ id: string; kind: string; locator: SourceLocator; children: string[] }>;
}
export interface ObservationDependencies {
  parent_ids: string[];
  asset_ids: string[];
  font_families: string[];
}
export interface ObservationSample {
  view: string;
  state: string;
  breakpoint?: string;
  structure: ObservationStructure;
  observations: {
    layout?: unknown;
    typography?: unknown;
    content?: unknown;
    interactions?: unknown;
    properties?: unknown;
  };
  dependencies: ObservationDependencies;
  unavailable: Array<{ property: string; reason: string; required: boolean }>;
}
export interface ObservationMeta {
  source: CaptureSource;
  role: 'reference' | 'actual';
  /** Digest of the prelude that prepared every pass, when the capture used one. */
  prelude_digest?: string;
  assets_dir: string;
  elements: Array<{
    id: string;
    locator: SourceLocator;
    /** Each state names its own dump (`extract--<name>.json`) and its observer. */
    states: Array<{ name: string; session: string }>;
    views: Array<{ id: string; width: number; height: number; breakpoint?: string }>;
  }>;
}
export interface ObservationExtract {
  subjects: Array<{ id: string; locator: SourceLocator; samples: ObservationSample[] }>;
  parents: Array<{
    id: string;
    parent?: string;
    samples: Array<{ view: string; state: string; layout: unknown; asset_ids: string[]; font_families: string[] }>;
  }>;
  images: Array<Record<string, unknown> & { url: string; reference_path: string }>;
  fonts: Array<
    Record<string, unknown> & {
      family: string;
      source: string;
      files?: Array<{ local_path: string; format?: string }>;
    }
  >;
  captures: Array<{ subject: string; view: string; state: string; path: string; width: number; height: number }>;
}
const text = { type: 'string', minLength: 1 };
const locator = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'value'],
  properties: { kind: text, value: text },
};
export const captureDefinitionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['role', 'source', 'scope'],
  properties: {
    role: { enum: ['reference', 'actual'] },
    source: {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'identity', 'revision'],
      properties: { kind: text, identity: text, revision: { anyOf: [text, { type: 'null' }] } },
    },
    prelude: {
      type: 'object',
      additionalProperties: false,
      required: ['path', 'digest'],
      properties: { path: text, digest: { type: 'string', pattern: '^[a-f0-9]{64}$' } },
    },
    scope: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['subject', 'view', 'state', 'session', 'locator'],
        properties: { subject: text, view: text, state: text, session: text, locator, breakpoint: text },
      },
    },
  },
};
export const digestBytes = (bytes: string | Buffer): string => createHash('sha256').update(bytes).digest('hex');
export type CaptureIdentity = Pick<CaptureDefinition, 'source' | 'scope' | 'prelude'>;
/**
 * `id` addresses the source; `revision` addresses one fixed observation of it.
 *
 * The revision digest covers the selected scope and the prelude, not just the
 * workflow ID: otherwise editing the prelude or the scope silently overwrites a
 * revision that was captured under different conditions. The workflow ID stays
 * in the digest so `reserveCapture` keeps its one-owner-per-directory rule —
 * two workflows with identical scope get separate revisions instead of
 * colliding on a shared one.
 */
export function captureLocation(data: string, capture: CaptureIdentity, workflowId: string) {
  if (!isAbsolute(data)) throw new Error('Capture data root must be absolute');
  const id = digestBytes(JSON.stringify([capture.source.kind, capture.source.identity])).slice(0, 16);
  const scope = [...capture.scope]
    .map((cell) => [cell.subject, cell.view, cell.state, cell.session, cell.locator, cell.breakpoint ?? null])
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  const revision = digestBytes(
    JSON.stringify([capture.source.kind, capture.source.identity, scope, capture.prelude?.digest ?? null, workflowId]),
  ).slice(0, 16);
  return { id, revision, directory: join(data, 'references', id, revision) };
}
/** Reserve a revision directory for one fixed owner before any result file may be written. */
export function reserveCapture(directory: string, ownerWorkflow: string): () => void {
  mkdirSync(directory, { recursive: true });
  const owner = join(directory, '.capture-owner.json');
  try {
    writeFileSync(owner, JSON.stringify({ workflow: resolve(ownerWorkflow) }), { flag: 'wx' });
  } catch (error) {
    throw new Error(`Capture revision is already owned; refresh requires a new workflow ID: ${directory}`, {
      cause: error,
    });
  }
  return () => unlinkSync(owner);
}

export function assertUnpublishedTarget(path: string): void {
  let parent = dirname(resolve(path));
  // Resolve existing directory aliases before checking the published ancestor.
  let existing = parent;
  while (!existsSync(existing) && dirname(existing) !== existing) existing = dirname(existing);
  if (existsSync(existing)) parent = resolve(realpathSync(existing), relative(existing, parent));
  for (;;) {
    if (existsSync(join(parent, 'publication.json'))) throw new Error(`Published reference is read-only: ${parent}`);
    const next = dirname(parent);
    if (next === parent) return;
    parent = next;
  }
}
/** Steps that write a capture revision. Other workflows keep `capture` optional. */
export const CAPTURE_STEPS = new Set([
  'observe-website',
  'observe-figma',
  'observe-storybook',
  'capture-file',
  'capture-image',
  'publish-capture',
]);

export function isCaptureWorkflow(steps: Iterable<string>): boolean {
  for (const step of steps) if (CAPTURE_STEPS.has(step)) return true;
  return false;
}

/**
 * A capture identity's scope integrity, independent of any task shape: one dump per
 * declared state, no duplicate scope cells, one observer session per state.
 */
export function validateCaptureScope(capture: CaptureDefinition): void {
  const seen = new Set<string>();
  const sessions = new Map<string, string>();
  for (const cell of capture.scope) {
    const key = JSON.stringify([cell.subject, cell.view, cell.state]);
    if (seen.has(key)) throw new Error(`Duplicate capture scope ${key}`);
    seen.add(key);
    const known = sessions.get(cell.state);
    if (known !== undefined && known !== cell.session)
      throw new Error(`State ${cell.state} is observed as both "${known}" and "${cell.session}"`);
    sessions.set(cell.state, cell.session);
  }
}
export function readCaptureFile(directory: string, name: string): Buffer {
  if (!name || isAbsolute(name)) throw new Error(`Capture file ${name}: expected relative path`);
  const root = realpathSync(directory);
  const file = realpathSync(resolve(root, name));
  const rel = relative(root, file);
  if (rel === '..' || rel.startsWith('../') || isAbsolute(rel))
    throw new Error(`Capture file ${name}: escapes reference directory`);
  if (!statSync(file).isFile()) throw new Error(`Capture file ${name}: not a file`);
  const bytes = readFileSync(file);
  if (!bytes.length) throw new Error(`Capture file ${name}: empty file`);
  return bytes;
}
function unique<T>(values: T[], key: (item: T) => string, label: string): Map<string, T> {
  const result = new Map<string, T>();
  for (const value of values) {
    const id = key(value);
    if (result.has(id)) throw new Error(`${label}: duplicate ${id}`);
    result.set(id, value);
  }
  return result;
}
export function validateObservedStructure(structure: ObservationStructure): void {
  const nodes = unique(structure.nodes, (node) => node.id, 'structure nodes');
  const seen = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id)) throw new Error(`Structure cycle or repeated placement: ${id}`);
    const node = nodes.get(id);
    if (!node) throw new Error(`Structure missing node: ${id}`);
    seen.add(id);
    node.children.forEach(visit);
  };
  structure.roots.forEach(visit);
  if (seen.size !== nodes.size || !seen.size) throw new Error('Structure contains unreachable nodes or is empty');
}
/** Publication validates all selected cells, not merely files requested by the first worker. */
export function validateCaptureObservations(
  directory: string,
  capture: CaptureDefinition,
  meta: ObservationMeta,
  extract: ObservationExtract,
): Set<string> {
  if (
    meta.source.kind !== capture.source.kind ||
    meta.source.identity !== capture.source.identity ||
    meta.source.revision !== capture.source.revision ||
    meta.role !== capture.role
  )
    throw new Error('Capture source identity/revision or role differs from fixed definition');
  if (meta.assets_dir !== 'assets') throw new Error('Capture uses the canonical assets directory');
  if ((meta.prelude_digest ?? null) !== (capture.prelude?.digest ?? null))
    throw new Error('Capture prelude digest differs from the fixed definition');
  const elements = unique(meta.elements, (e) => e.id, 'metadata elements');
  const subjects = unique(extract.subjects, (e) => e.id, 'extract subjects');
  const captures = unique(extract.captures, (e) => JSON.stringify([e.subject, e.view, e.state]), 'captures');
  const parents = unique(extract.parents, (e) => e.id, 'parents');
  const assets = unique(extract.images, (e) => e.url, 'assets');
  const fonts = unique(extract.fonts, (e) => e.family, 'fonts');
  const expected = new Set(capture.scope.map((e) => JSON.stringify([e.subject, e.view, e.state])));
  const actual = new Set<string>();
  const files = new Set(['meta.yml', ...declaredStates(meta).map(sourceDumpName)]);
  const dependency = (deps: Pick<ObservationDependencies, 'asset_ids' | 'font_families'>) => {
    for (const id of deps.asset_ids) {
      const asset = assets.get(id);
      if (!asset) throw new Error(`Missing asset ${id}`);
      files.add(asset.reference_path);
    }
    for (const family of deps.font_families) {
      const font = fonts.get(family);
      if (!font) throw new Error(`Missing font ${family}`);
      // Only a `@font-face` family the source ships owes the revision a binary.
      // An `other` family is an OS fallback the stack names and the source never
      // delivers, so there is nothing to download and nothing to miss.
      if (font.source === 'self-hosted' && !font.files?.length) throw new Error(`Missing local font files ${family}`);
      for (const file of font.files ?? []) files.add(file.local_path);
    }
  };
  for (const subject of subjects.values()) {
    const element = elements.get(subject.id);
    if (!element || JSON.stringify(element.locator) !== JSON.stringify(subject.locator))
      throw new Error(`Subject ${subject.id}: metadata locator differs`);
    unique(element.views, (view) => view.id, 'views');
    unique(element.states, (state) => state.name, 'states');
    const scopeCells = capture.scope.filter((cell) => cell.subject === subject.id);
    const sameIdentities = (left: string[], right: string[]) =>
      JSON.stringify([...new Set(left)].sort()) === JSON.stringify([...new Set(right)].sort());
    if (
      !sameIdentities(
        element.views.map((view) => view.id),
        scopeCells.map((cell) => cell.view),
      ) ||
      !sameIdentities(
        element.states.map((state) => state.name),
        scopeCells.map((cell) => cell.state),
      )
    )
      throw new Error(`Subject ${subject.id}: metadata views/states differ from selected capture scope`);
    for (const state of element.states) {
      const cell = scopeCells.find((item) => item.state === state.name);
      if (!cell || cell.session !== state.session)
        throw new Error(`Subject ${subject.id}: state ${state.name} observer differs from the selected capture scope`);
    }
    for (const sample of subject.samples) {
      const key = JSON.stringify([subject.id, sample.view, sample.state]);
      if (actual.has(key) || !expected.has(key)) throw new Error(`Unexpected or duplicate observation ${key}`);
      actual.add(key);
      const scope = capture.scope.find((s) => JSON.stringify([s.subject, s.view, s.state]) === key)!;
      const view = element.views.find((v) => v.id === sample.view);
      if (
        !view ||
        !element.states.some((s) => s.name === sample.state) ||
        scope.breakpoint !== view.breakpoint ||
        sample.breakpoint !== view.breakpoint ||
        JSON.stringify(scope.locator) !== JSON.stringify(subject.locator)
      )
        throw new Error(`Observation mapping differs for ${key}`);
      const missing = sample.unavailable.filter((item) => item.required);
      if (missing.length)
        throw new Error(
          `Missing required evidence ${key}: ${missing.map((item) => `${item.property}: ${item.reason}`).join('; ')}`,
        );
      validateObservedStructure(sample.structure);
      dependency(sample.dependencies);
      const visitParent = (id: string, seen = new Set<string>()) => {
        if (seen.has(id)) throw new Error(`Parent cycle ${id}`);
        seen.add(id);
        const parent = parents.get(id);
        if (!parent) throw new Error(`Missing parent ${id}`);
        if (parent.parent) visitParent(parent.parent, seen);
        const matches = parent.samples.filter((s) => s.view === sample.view && s.state === sample.state);
        if (matches.length !== 1)
          throw new Error(`Missing or ambiguous parent sample ${id}/${sample.view}/${sample.state}`);
        dependency(matches[0]!);
      };
      sample.dependencies.parent_ids.forEach((id) => visitParent(id));
      const image = captures.get(key);
      if (!image) throw new Error(`Missing screenshot ${key}`);
      readCaptureFile(directory, image.path);
      const result = validateImage(resolve(directory, image.path));
      if (!result.valid) throw new Error(`Invalid screenshot ${image.path}: ${result.errors.join('; ')}`);
      const png = readCaptureFile(directory, image.path);
      if (png.readUInt32BE(16) !== image.width || png.readUInt32BE(20) !== image.height)
        throw new Error(`Screenshot dimensions differ: ${image.path}`);
      files.add(image.path);
    }
  }
  if (actual.size !== expected.size || subjects.size !== elements.size || captures.size !== expected.size)
    throw new Error('Capture coverage is incomplete or contains undeclared evidence');
  for (const asset of assets.values()) files.add(asset.reference_path);
  for (const font of fonts.values()) for (const file of font.files ?? []) files.add(file.local_path);
  for (const file of files) readCaptureFile(directory, file);
  return files;
}
/**
 * Inputs `plan done` assembles for the publish-capture step: the fixed capture
 * identity, the revision digest inputs (`data` root + `workflowId`), the owner path,
 * the declared file hashes recorded by the observe/capture steps, and the frozen
 * query contract lifted from the plan (the `reference` output schema + definitions).
 */
export interface PublishInput {
  data: string;
  capture: CaptureDefinition;
  workflowId: string;
  ownerWorkflow: string;
  declaredFiles: Record<string, string>;
  contract: ReferenceContract;
}

/**
 * Validate every selected observation, confirm each file is an unchanged declared
 * output, and write the self-contained publication binding. No workflow document is
 * consulted — the plan's execution produced the declared hashes and the contract.
 */
/**
 * Publication is deliberately simple: no observation validation. A capture
 * workflow runs synchronously, so when it finishes the revision is done — publish
 * just freezes it. The human decides whether the screenshots are right; the machine
 * only records a fingerprint (sha256 of every revision file) plus the query contract,
 * so a later query can detect drift.
 */
export function publishCapture(input: PublishInput): CaptureBinding {
  const location = captureLocation(input.data, input.capture, input.workflowId);
  const binding: CaptureBinding = {
    ...location,
    workflow: resolve(input.ownerWorkflow),
    files: input.declaredFiles,
    contract: input.contract,
  };
  writeFileSync(join(location.directory, 'publication.json'), JSON.stringify(binding, null, 2) + '\n', { flag: 'wx' });
  return binding;
}
export function discardPublication(binding: CaptureBinding): void {
  unlinkSync(join(binding.directory, 'publication.json'));
}
export function readPublishedCapture(directory: string): CaptureBinding {
  const publication = join(directory, 'publication.json');
  if (!existsSync(publication))
    throw new Error('Reference revision is incomplete: finish its capture workflow before planning');
  const binding = JSON.parse(readFileSync(publication, 'utf8')) as CaptureBinding;
  if (binding.directory !== resolve(directory)) throw new Error('Publication directory differs from binding');
  const owner = JSON.parse(readFileSync(join(directory, '.capture-owner.json'), 'utf8')) as { workflow: string };
  if (owner.workflow !== binding.workflow) throw new Error('Capture revision belongs to a different workflow');
  for (const [file, digest] of Object.entries(binding.files))
    if (digestBytes(readCaptureFile(directory, file)) !== digest)
      throw new Error(`Reference fingerprint changed: ${file}`);
  return binding;
}
