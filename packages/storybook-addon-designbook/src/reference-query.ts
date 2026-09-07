/** Read-only, exact-scope reference packages. Browser interpretation belongs to intake. */
import Ajv from 'ajv';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { load } from 'js-yaml';
import { validateImage } from './validators/image.js';

export type ReferencePackageKind = 'component' | 'composition' | 'tokens';
export interface ReferenceQueryRequest {
  reference: string;
  package: ReferencePackageKind;
  subjects: string[];
  states: string[];
  breakpoints: string[];
}
export interface FrozenReferenceQuery extends ReferenceQueryRequest {
  fingerprint: string;
}
export interface ReferenceQueryContract {
  referenceSchema: object;
  extractSchema: object;
  definitions: Record<string, object>;
}
type RecordValue = Record<string, unknown>;
interface Sample extends RecordValue {
  state: string;
  breakpoint: string;
  asset_ids: string[];
  font_families: string[];
}
interface Subject extends RecordValue {
  id: string;
  selector: string;
  parent?: string;
  samples: Sample[];
}
interface Parent extends RecordValue {
  id: string;
  parent?: string;
  samples: Array<Sample>;
}
interface Extract extends RecordValue {
  subjects: Subject[];
  parents: Parent[];
  images: Array<RecordValue & { url: string; reference_path: string }>;
  fonts: Array<RecordValue & { family: string; source: string; files?: Array<{ local_path: string }> }>;
}
interface Metadata {
  source: unknown;
  extract: string;
  elements: Array<{ id: string; selector: string; states: Array<{ name: string }>; breakpoints: string[] }>;
}
export interface ReferenceQueryResult {
  package: ReferencePackageKind;
  scope: Omit<ReferenceQueryRequest, 'reference' | 'package'>;
  subjects: Subject[];
  dependencies: { parents: Parent[]; assets: Extract['images']; fonts: Extract['fonts'] };
  captures: Array<{ subject: string; state: string; breakpoint: string; path: string }>;
  provenance: { reference: string; source: unknown; fingerprint: string; files: Record<string, string> };
  checks: { schema: true; scope: true; files: number };
}
export class ReferenceQueryError extends Error {
  constructor(public readonly findings: string[]) {
    super(findings.join('\n'));
    this.name = 'ReferenceQueryError';
  }
}
function fail(message: string): never {
  throw new ReferenceQueryError([message]);
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, canonical(entry)]),
    );
  return value;
}
function hash(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}
function unique(values: string[], field: string): void {
  if (
    !Array.isArray(values) ||
    !values.length ||
    values.some((v) => typeof v !== 'string' || !v.trim()) ||
    new Set(values).size !== values.length
  )
    fail(`${field}: expected nonempty unique identities`);
}
function indexed<T>(items: T[], key: (value: T) => string, label: string): Map<string, T> {
  if (!Array.isArray(items)) fail(`${label}: missing array`);
  const map = new Map<string, T>();
  for (const item of items) {
    const id = key(item);
    if (map.has(id)) fail(`${label}: ambiguous identity ${id}`);
    map.set(id, item);
  }
  return map;
}
/** Unrelated workflow schemas must not change a reference contract's identity. */
function scopedContract(contract: ReferenceQueryContract): ReferenceQueryContract {
  const definitions: Record<string, object> = {};
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      for (const child of value) visit(child);
      return;
    }
    const object = value as Record<string, unknown>;
    if (typeof object.$ref === 'string' && object.$ref.startsWith('#/definitions/')) {
      const name = object.$ref.slice('#/definitions/'.length).split('/')[0]!.replace(/~1/g, '/').replace(/~0/g, '~');
      if (!(name in definitions)) {
        const schema = contract.definitions[name];
        if (!schema) fail(`contract.definitions: missing ${name}`);
        definitions[name] = schema;
        visit(schema);
      }
    }
    for (const child of Object.values(object)) visit(child);
  };
  visit(contract.referenceSchema);
  visit(contract.extractSchema);
  return { referenceSchema: contract.referenceSchema, extractSchema: contract.extractSchema, definitions };
}
function evaluate(request: ReferenceQueryRequest, suppliedContract: ReferenceQueryContract): ReferenceQueryResult {
  const contract = scopedContract(suppliedContract);
  if (!isAbsolute(request.reference)) fail('reference: expected absolute folder');
  if (!['component', 'composition', 'tokens'].includes(request.package))
    fail('package: expected component, composition or tokens');
  for (const field of ['subjects', 'states', 'breakpoints'] as const) unique(request[field], field);
  const folder = realpathSync(request.reference);
  const files: Record<string, string> = {};
  const read = (name: string): Buffer => {
    if (typeof name !== 'string' || !name || isAbsolute(name)) fail(`file ${name}: expected reference-relative path`);
    try {
      const path = realpathSync(resolve(folder, name));
      const rel = relative(folder, path);
      if (rel === '..' || rel.startsWith('../') || isAbsolute(rel)) fail(`file ${name}: escapes reference folder`);
      if (!statSync(path).isFile()) fail(`file ${name}: not a file`);
      const bytes = readFileSync(path);
      if (!bytes.length) fail(`file ${name}: empty file`);
      files[name] = hash(bytes);
      return bytes;
    } catch (error) {
      if (error instanceof ReferenceQueryError) throw error;
      return fail(`file ${name}: ${(error as Error).message}`);
    }
  };
  const parse = (name: string): unknown => {
    try {
      return load(read(name).toString('utf8'));
    } catch (error) {
      if (error instanceof ReferenceQueryError) throw error;
      return fail(`${name}: ${(error as Error).message}`);
    }
  };
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = (data: unknown, schema: object, name: string) => {
    const check = ajv.compile({ ...schema, definitions: contract.definitions });
    if (!check(data))
      throw new ReferenceQueryError(
        (check.errors ?? []).map(
          (e) =>
            `${name}${e.instancePath}: ${e.message}${e.keyword === 'required' ? ` (${String(e.params.missingProperty)})` : ''}`,
        ),
      );
  };
  const meta = parse('meta.yml') as Metadata;
  validate(meta, contract.referenceSchema, 'meta');
  if (typeof meta.extract !== 'string') fail('meta.extract: explicit enriched extract path required');
  const extract = parse(meta.extract) as Extract;
  validate(extract, contract.extractSchema, 'extract');
  const subjects = indexed(extract.subjects, (s) => s.id, 'extract.subjects');
  const elements = indexed(meta.elements, (s) => s.id, 'meta.elements');
  const parents = indexed(extract.parents, (s) => s.id, 'extract.parents');
  const assets = indexed(extract.images, (s) => s.url, 'extract.images');
  const fonts = indexed(extract.fonts, (s) => s.family, 'extract.fonts');
  const selectedParents = new Map<string, Parent>();
  const selectedAssets = new Map<string, Extract['images'][number]>();
  const selectedFonts = new Map<string, Extract['fonts'][number]>();
  const captures: ReferenceQueryResult['captures'] = [];
  const selectSamples = <T extends { state: string; breakpoint: string }>(samples: T[], label: string): T[] => {
    const map = indexed(samples, (s) => JSON.stringify([s.state, s.breakpoint]), `${label}.samples`);
    return request.states.flatMap((state) =>
      request.breakpoints.map((breakpoint) => {
        const sample = map.get(JSON.stringify([state, breakpoint]));
        if (!sample) fail(`${label}.samples: missing state=${state} breakpoint=${breakpoint}`);
        return sample;
      }),
    );
  };
  const addDependencies = (sample: Sample, label: string): void => {
    for (const assetId of sample.asset_ids) {
      const asset = assets.get(assetId);
      if (!asset) fail(`${label}: missing asset ${assetId}`);
      read(asset.reference_path);
      selectedAssets.set(assetId, asset);
    }
    for (const family of sample.font_families) {
      const font = fonts.get(family);
      if (!font) fail(`${label}: missing font ${family}`);
      if (font.source !== 'system' && !font.files?.length)
        fail(`font ${family}: local binaries required for offline execution`);
      for (const file of font.files ?? []) read(file.local_path);
      selectedFonts.set(family, font);
    }
  };
  const addParent = (id: string, chain: string[] = []): void => {
    if (chain.includes(id)) fail(`parents: cycle ${[...chain, id].join(' -> ')}`);
    if (selectedParents.has(id)) return;
    const parent = parents.get(id);
    if (!parent) fail(`parents: missing ${id}`);
    if (parent.parent) addParent(parent.parent, [...chain, id]);
    const samples = selectSamples(parent.samples, `parent ${id}`);
    for (const sample of samples) addDependencies(sample, `parent ${id}`);
    selectedParents.set(id, { ...parent, samples });
  };
  const selected = request.subjects.map((id) => {
    const subject = subjects.get(id);
    const element = elements.get(id);
    if (!subject || !element) fail(`subject ${id}: missing exact extract/metadata identity`);
    if (subject.selector !== element.selector) fail(`subject ${id}: selector differs from metadata`);
    if (subject.parent) addParent(subject.parent);
    const samples = selectSamples(subject.samples, `subject ${id}`);
    for (const sample of samples) {
      if (!element.states?.some((s) => s.name === sample.state) || !element.breakpoints?.includes(sample.breakpoint))
        fail(`subject ${id}: undeclared state=${sample.state} breakpoint=${sample.breakpoint}`);
      if (!(request.package in sample))
        fail(`subject ${id}: missing ${request.package} package decisions for ${sample.state}/${sample.breakpoint}`);
      const filename = `${sample.breakpoint}--${id}--${sample.state}.png`;
      read(filename);
      const image = validateImage(resolve(folder, filename));
      if (!image.valid) fail(`file ${filename}: ${image.errors.join('; ')}`);
      captures.push({
        subject: id,
        state: sample.state,
        breakpoint: sample.breakpoint,
        path: resolve(folder, filename),
      });
      addDependencies(sample, `subject ${id}`);
    }
    const packageSamples = samples.map((sample) => {
      const selected = { ...sample };
      for (const kind of ['component', 'composition', 'tokens']) if (kind !== request.package) delete selected[kind];
      return selected;
    });
    return { ...subject, samples: packageSamples };
  });
  // Bind both exact scope and effective validation contract; neither may drift after intake.
  const fingerprint = hash(
    JSON.stringify({
      request: {
        reference: request.reference,
        package: request.package,
        subjects: request.subjects,
        states: request.states,
        breakpoints: request.breakpoints,
      },
      contract: canonical(contract),
      files,
    }),
  );
  return {
    package: request.package,
    scope: { subjects: request.subjects, states: request.states, breakpoints: request.breakpoints },
    subjects: selected,
    dependencies: {
      parents: [...selectedParents.values()],
      assets: [...selectedAssets.values()],
      fonts: [...selectedFonts.values()],
    },
    captures,
    provenance: { reference: folder, source: meta.source, fingerprint, files },
    checks: { schema: true, scope: true, files: Object.keys(files).length },
  };
}
export function prepareReferenceQuery(
  request: ReferenceQueryRequest,
  contract: ReferenceQueryContract,
): FrozenReferenceQuery {
  const result = evaluate(request, contract);
  return {
    reference: request.reference,
    package: request.package,
    subjects: [...request.subjects],
    states: [...request.states],
    breakpoints: [...request.breakpoints],
    fingerprint: result.provenance.fingerprint,
  };
}
export function queryReference(request: FrozenReferenceQuery, contract: ReferenceQueryContract): ReferenceQueryResult {
  if (!/^[a-f0-9]{64}$/.test(request.fingerprint ?? '')) fail('fingerprint: missing frozen intake fingerprint');
  const result = evaluate(request, contract);
  if (result.provenance.fingerprint !== request.fingerprint)
    fail('fingerprint: reference files, scope or schema changed since intake; rebuild the plan');
  return result;
}
