/**
 * Source-neutral stored observations. A source integration (Figma, ...) reads its
 * host tools, translates the answers into the shared DesignReference members and
 * hands this document to `reference import`. The addon never switches on the
 * source kind: native locators and properties pass through verbatim.
 */
import Ajv from 'ajv';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, normalize } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import {
  assertUnpublishedTarget,
  captureDefinitionSchema,
  validateCaptureScope,
  validateObservedStructure,
  type CaptureDefinition,
  type ObservationExtract,
  type ReferenceContract,
} from './reference-capture.js';
import { sourceDumpName } from './reference-project.js';

export const OBSERVATION_FORMAT = 'designbook-observations';
export interface ReferenceObservationDocument {
  format: typeof OBSERVATION_FORMAT;
  capture: CaptureDefinition;
  state: string;
  captured_at: string;
  extract: ObservationExtract;
}

const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const cell = (subject: string, view: string, state: string) => JSON.stringify([subject, view, state]);

/** Explicit tag: the browser producer writes a CapturedSource, imports write this envelope. */
export function isObservationDocument(value: unknown): boolean {
  return (value as { format?: unknown } | null)?.format === OBSERVATION_FORMAT;
}

function assetPath(path: string, label: string): void {
  if (isAbsolute(path) || normalize(path) !== path || !path.startsWith('assets/') || path.includes('/../'))
    throw new Error(`${label}: expected a normalized path under assets/, got ${path}`);
}

const ajv = new Ajv({ allErrors: true, strict: false });
const compiled = new Map<string, ReturnType<typeof ajv.compile>>();
/**
 * Contracts arrive as freshly parsed JSON on every read, and a published read
 * re-validates each state document per query cell, so compile once per distinct
 * schema text instead of once per call.
 */
export function schemaCheck(value: unknown, schema: object, definitions: Record<string, object>, label: string): void {
  const full = { ...schema, definitions };
  const key = JSON.stringify(full);
  let check = compiled.get(key);
  if (!check) compiled.set(key, (check = ajv.compile(full)));
  if (!check(value)) throw new Error(`${label}: ${ajv.errorsText(check.errors)}`);
}

/** Validate envelope, contract, graph and cell mapping before anything walks or writes it. */
export function parseObservationDocument(value: unknown, contract: ReferenceContract): ReferenceObservationDocument {
  const doc = value as ReferenceObservationDocument;
  if (!doc || typeof doc !== 'object' || !isObservationDocument(doc))
    throw new Error(`observations: expected format "${OBSERVATION_FORMAT}"`);
  const extra = Object.keys(doc).filter(
    (key) => !['format', 'capture', 'state', 'captured_at', 'extract'].includes(key),
  );
  if (extra.length) throw new Error(`observations: unknown members ${extra.join(', ')}`);
  if (typeof doc.state !== 'string' || !SAFE_SEGMENT.test(doc.state))
    throw new Error('observations.state: expected a single safe name');
  if (
    typeof doc.captured_at !== 'string' ||
    !ISO_TIME.test(doc.captured_at) ||
    Number.isNaN(Date.parse(doc.captured_at))
  )
    throw new Error('observations.captured_at: expected an ISO timestamp');
  schemaCheck(doc.capture, captureDefinitionSchema, {}, 'observations.capture');
  validateCaptureScope(doc.capture);
  schemaCheck(doc.extract, { $ref: '#/definitions/DesignReference' }, contract.definitions, 'observations.extract');

  const { state, extract } = doc;
  const scope = new Map(
    doc.capture.scope.filter((s) => s.state === state).map((s) => [cell(s.subject, s.view, s.state), s]),
  );
  if (!scope.size) throw new Error(`observations: capture scope selects no cell in state ${state}`);
  const images = new Map(extract.images.map((image) => [image.url, image]));
  const fonts = new Map(extract.fonts.map((font) => [font.family, font]));
  const parents = new Map(extract.parents.map((parent) => [parent.id, parent]));
  if (
    images.size !== extract.images.length ||
    fonts.size !== extract.fonts.length ||
    parents.size !== extract.parents.length
  )
    throw new Error('observations: duplicate image, font or parent identity');
  for (const image of extract.images) assetPath(image.reference_path, `image ${image.url}`);
  for (const font of extract.fonts)
    for (const file of font.files ?? []) assetPath(file.local_path, `font ${font.family}`);
  const dependencies = (deps: { asset_ids: string[]; font_families: string[] }, label: string) => {
    for (const id of deps.asset_ids) if (!images.has(id)) throw new Error(`${label}: undeclared asset ${id}`);
    for (const family of deps.font_families)
      if (!fonts.has(family)) throw new Error(`${label}: undeclared font ${family}`);
  };

  const samples = new Set<string>();
  const subjects = new Set<string>();
  for (const subject of extract.subjects) {
    if (subjects.has(subject.id)) throw new Error(`observations: duplicate subject ${subject.id}`);
    subjects.add(subject.id);
    for (const sample of subject.samples) {
      const key = cell(subject.id, sample.view, sample.state);
      const selected = scope.get(key);
      if (sample.state !== state || !selected)
        throw new Error(`observations: sample ${key} is outside the ${state} scope`);
      if (samples.has(key)) throw new Error(`observations: duplicate sample ${key}`);
      samples.add(key);
      if (!isDeepStrictEqual(selected.locator, subject.locator))
        throw new Error(`observations: subject ${subject.id} locator differs from the capture scope`);
      if (selected.breakpoint !== sample.breakpoint) throw new Error(`observations: sample ${key} breakpoint differs`);
      validateObservedStructure(sample.structure);
      const foreign = sample.structure.nodes.find((node) => node.locator.kind !== subject.locator.kind);
      // A native locator names one node per sample; a repeat would make inspection pick silently.
      if (new Set(sample.structure.nodes.map((node) => node.locator.value)).size !== sample.structure.nodes.length)
        throw new Error(`observations: sample ${key} repeats a native locator`);
      if (foreign)
        throw new Error(`observations: node ${foreign.id} locator kind ${foreign.locator.kind} is not native`);
      dependencies(sample.dependencies, key);
      for (const id of sample.dependencies.parent_ids)
        if (!parents.has(id)) throw new Error(`${key}: undeclared parent ${id}`);
    }
  }
  for (const key of scope.keys()) if (!samples.has(key)) throw new Error(`observations: missing sample ${key}`);
  for (const parent of extract.parents) {
    for (let up = parent.parent, seen = new Set([parent.id]); up; up = parents.get(up)!.parent) {
      if (!parents.has(up)) throw new Error(`parent ${parent.id}: undeclared parent ${up}`);
      if (seen.has(up)) throw new Error(`parent ${parent.id}: parent cycle through ${up}`);
      seen.add(up);
    }
    for (const sample of parent.samples) {
      if (sample.state !== state) throw new Error(`parent ${parent.id}: sample outside state ${state}`);
      dependencies(sample, `parent ${parent.id}`);
    }
  }
  const captures = new Set<string>();
  for (const shot of extract.captures) {
    const key = cell(shot.subject, shot.view, shot.state);
    if (!scope.has(key) || captures.has(key)) throw new Error(`observations: unexpected or duplicate capture ${key}`);
    captures.add(key);
    if (shot.path !== `${shot.view}--${shot.subject}--${shot.state}.png`)
      throw new Error(`observations: capture ${key} must use ${shot.view}--${shot.subject}--${shot.state}.png`);
    if (!Number.isInteger(shot.width) || !Number.isInteger(shot.height))
      throw new Error(`observations: capture ${key} needs integer pixel dimensions`);
  }
  if (captures.size !== scope.size) throw new Error('observations: every selected cell needs a screenshot record');
  return doc;
}

/** Read a state's stored extract as JSON, whatever representation it is. */
export function readStoredExtract(directory: string, state: string): unknown {
  return JSON.parse(readFileSync(join(directory, sourceDumpName(state)), 'utf8'));
}

/** Validate, compare against already imported states, then write `extract--<state>.json`. */
export function importObservations(
  directory: string,
  value: unknown,
  contract: ReferenceContract,
): ReferenceObservationDocument {
  if (!isAbsolute(directory)) throw new Error('reference: expected absolute revision directory');
  const doc = parseObservationDocument(value, contract);
  const target = join(directory, sourceDumpName(doc.state));
  assertUnpublishedTarget(target);
  if (lstatSync(target, { throwIfNoEntry: false })?.isSymbolicLink())
    throw new Error(`${sourceDumpName(doc.state)}: refusing to write through a symlink`);
  if (existsSync(directory))
    for (const name of readdirSync(directory)) {
      const match = /^extract--(.+)\.json$/.exec(name);
      if (!match || match[1] === doc.state) continue;
      const other = JSON.parse(readFileSync(join(directory, name), 'utf8'));
      if (!isObservationDocument(other))
        throw new Error(`${name}: a browser dump cannot mix with imported observations in one revision`);
      if (!isDeepStrictEqual((other as ReferenceObservationDocument).capture, doc.capture))
        throw new Error(`${name}: imported states must share one fixed capture definition`);
    }
  mkdirSync(directory, { recursive: true });
  writeFileSync(target, JSON.stringify(doc, null, 2) + '\n');
  return doc;
}

const CATALOGUE_NODES = 40;
/** Bounded intake view of what was imported: contexts, native ids, kinds, counts. */
export function observationCatalogue(doc: ReferenceObservationDocument) {
  return {
    state: doc.state,
    source: doc.capture.source,
    subjects: doc.extract.subjects.map((subject) => ({
      id: subject.id,
      locator: subject.locator,
      samples: subject.samples.map((sample) => ({
        view: sample.view,
        nodes: sample.structure.nodes.length,
        tree: sample.structure.nodes
          .slice(0, CATALOGUE_NODES)
          .map((node) => ({ id: node.id, kind: node.kind, locator: node.locator })),
        ...(sample.structure.nodes.length > CATALOGUE_NODES ? { truncated: true } : {}),
        assets: sample.dependencies.asset_ids.length,
        fonts: sample.dependencies.font_families.length,
        unavailable: sample.unavailable.length,
      })),
    })),
  };
}

/**
 * One revision's per-state documents as one extract. Shared records (assets,
 * fonts, parents) must agree across states; a conflict is an error, never a
 * silent pick. The stored capture is returned as the independent expected scope.
 */
export function mergeObservationDocuments(documents: ReferenceObservationDocument[]): {
  capture: CaptureDefinition;
  extract: ObservationExtract;
} {
  const capture = documents[0]?.capture;
  if (!capture) throw new Error('observations: no state documents');
  const states = new Set<string>();
  const subjects = new Map<string, ObservationExtract['subjects'][number]>();
  const parents = new Map<string, ObservationExtract['parents'][number]>();
  const images = new Map<string, ObservationExtract['images'][number]>();
  const fonts = new Map<string, ObservationExtract['fonts'][number]>();
  const captures: ObservationExtract['captures'] = [];
  const same = <T>(records: Map<string, T>, id: string, record: T, label: string) => {
    const known = records.get(id);
    if (known !== undefined && !isDeepStrictEqual(known, record))
      throw new Error(`observations: conflicting ${label} ${id}`);
    records.set(id, known ?? record);
  };
  for (const doc of documents) {
    if (!isDeepStrictEqual(doc.capture, capture))
      throw new Error('observations: states differ in their capture definition');
    if (states.has(doc.state)) throw new Error(`observations: duplicate state document ${doc.state}`);
    states.add(doc.state);
    for (const subject of doc.extract.subjects) {
      const known = subjects.get(subject.id);
      if (known && !isDeepStrictEqual(known.locator, subject.locator))
        throw new Error(`observations: conflicting subject locator ${subject.id}`);
      subjects.set(subject.id, { ...subject, samples: [...(known?.samples ?? []), ...subject.samples] });
    }
    for (const parent of doc.extract.parents) {
      const known = parents.get(parent.id);
      if (known && known.parent !== parent.parent) throw new Error(`observations: conflicting parent ${parent.id}`);
      parents.set(parent.id, { ...parent, samples: [...(known?.samples ?? []), ...parent.samples] });
    }
    for (const image of doc.extract.images) same(images, image.url, image, 'asset');
    for (const font of doc.extract.fonts) same(fonts, font.family, font, 'font');
    captures.push(...doc.extract.captures);
  }
  return {
    capture,
    extract: {
      subjects: [...subjects.values()],
      parents: [...parents.values()],
      images: [...images.values()],
      fonts: [...fonts.values()],
      captures,
    },
  };
}
