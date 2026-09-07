/** Bounded, read-only observations from one published capture revision. */
import Ajv from 'ajv';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isAbsolute, resolve, relative } from 'node:path';
import { load } from 'js-yaml';
import {
  readPublishedCapture,
  readCaptureFile,
  type CaptureBinding,
  type ObservationMeta,
  type ObservationExtract,
  type ObservationSample,
} from './reference-capture.js';

export type ReferencePackageKind = 'component' | 'composition' | 'tokens' | 'assets';
export interface ReferenceQueryRequest {
  reference: string;
  package: ReferencePackageKind;
  subjects: string[];
  states: string[];
  views?: string[];
  breakpoints?: string[];
}
export interface FrozenReferenceQuery extends ReferenceQueryRequest {
  fingerprint: string;
}
export interface ReferenceQueryContract {
  referenceSchema: object;
  extractSchema: object;
  definitions: Record<string, object>;
}
export interface ReferenceQueryResult {
  package: ReferencePackageKind;
  scope: Omit<ReferenceQueryRequest, 'reference' | 'package'>;
  subjects: Array<{
    id: string;
    locator: ObservationExtract['subjects'][number]['locator'];
    samples: Array<{
      view: string;
      state: string;
      breakpoint?: string;
      component?: Record<string, unknown>;
      composition?: Record<string, unknown>;
      tokens?: Record<string, unknown>;
      assets?: Record<string, unknown>;
    }>;
  }>;
  dependencies: {
    parents: ObservationExtract['parents'];
    assets: ObservationExtract['images'];
    fonts: ObservationExtract['fonts'];
  };
  captures: Array<ObservationExtract['captures'][number]>;
  provenance: {
    reference: string;
    source: unknown;
    binding: Omit<CaptureBinding, 'files'>;
    fingerprint: string;
    files: Record<string, string>;
  };
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
export function publishedReferenceContract(reference: string): ReferenceQueryContract {
  const binding = readPublishedCapture(reference);
  const doc = load(readFileSync(binding.workflow, 'utf8')) as import('./workflow-document.js').WorkflowDocument;
  const outputs = doc.definition.tasks.flatMap((task) => Object.entries(task.outputs));
  return {
    referenceSchema: outputs.find(([key]) => key === 'reference')![1].schema,
    extractSchema: outputs.find(([key]) => key === 'reference_extract')![1].schema,
    definitions: doc.definition.schemas,
  };
}
function loadReference(reference: string, suppliedContract: ReferenceQueryContract) {
  if (!isAbsolute(reference)) fail('reference: expected absolute revision directory');
  const binding = readPublishedCapture(reference);
  const contract = scopedContract(suppliedContract);
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = (value: unknown, schema: object, label: string) => {
    const check = ajv.compile({ ...schema, definitions: contract.definitions });
    if (!check(value)) fail(`${label}: ${ajv.errorsText(check.errors)}`);
  };
  const meta = load(readCaptureFile(reference, 'meta.yml').toString('utf8')) as ObservationMeta;
  const extract = JSON.parse(readCaptureFile(reference, 'extract.json').toString('utf8')) as ObservationExtract;
  validate(meta, contract.referenceSchema, 'meta');
  validate(extract, contract.extractSchema, 'extract');
  return { binding, contract, meta, extract };
}
export const MAX_REFERENCE_PACKAGE_BYTES = 64 * 1024;
function bounded<T>(value: T, label: string): T {
  const bytes = Buffer.byteLength(JSON.stringify(value));
  if (bytes > MAX_REFERENCE_PACKAGE_BYTES)
    fail(
      `${label}: ${bytes} exceeds ${MAX_REFERENCE_PACKAGE_BYTES}-byte package limit; narrow the subject/view/state selection`,
    );
  return value;
}
function evaluate(request: ReferenceQueryRequest, suppliedContract: ReferenceQueryContract): ReferenceQueryResult {
  if (!['component', 'composition', 'tokens', 'assets'].includes(request.package))
    fail('package: expected component, composition, tokens or assets');
  unique(request.subjects, 'subjects');
  unique(request.states, 'states');
  if (Boolean(request.views) === Boolean(request.breakpoints))
    fail('Select exactly one of views or explicitly mapped breakpoints');
  if (request.views) unique(request.views, 'views');
  if (request.breakpoints) unique(request.breakpoints, 'breakpoints');
  const { binding, contract, meta, extract } = loadReference(request.reference, suppliedContract);
  const subjects = indexed(extract.subjects, (s) => s.id, 'subjects');
  const elements = indexed(meta.elements, (s) => s.id, 'elements');
  const parents = indexed(extract.parents, (p) => p.id, 'parents');
  const images = indexed(extract.images, (a) => a.url, 'assets');
  const fonts = indexed(extract.fonts, (f) => f.family, 'fonts');
  const selectedParents = new Map<string, ObservationExtract['parents'][number]>();
  const selectedImages = new Map<string, ObservationExtract['images'][number]>();
  const selectedFonts = new Map<string, ObservationExtract['fonts'][number]>();
  const captures: ReferenceQueryResult['captures'] = [];
  const dependencies = (value: { asset_ids: string[]; font_families: string[] }) => {
    for (const id of value.asset_ids) {
      const image = images.get(id);
      if (!image) fail(`Missing asset ${id}`);
      selectedImages.set(id, image);
    }
    for (const family of value.font_families) {
      const font = fonts.get(family);
      if (!font) fail(`Missing font ${family}`);
      selectedFonts.set(family, font);
    }
  };
  const parent = (id: string, sample: ObservationSample, chain: string[] = []) => {
    if (chain.includes(id)) fail(`Parent cycle ${id}`);
    const item = parents.get(id);
    if (!item) fail(`Missing parent ${id}`);
    const match = item.samples.find((s) => s.view === sample.view && s.state === sample.state);
    if (!match) fail(`Missing parent sample ${id}/${sample.view}/${sample.state}`);
    dependencies(match);
    const selected = selectedParents.get(id) ?? { ...item, samples: [] };
    if (!selected.samples.some((s) => s.view === match.view && s.state === match.state)) selected.samples.push(match);
    selectedParents.set(id, selected);
    if (item.parent) parent(item.parent, sample, [...chain, id]);
  };
  const selected = request.subjects.map((id) => {
    const subject = subjects.get(id);
    const element = elements.get(id);
    if (!subject || !element) fail(`Missing subject ${id}`);
    const views =
      request.views ??
      request.breakpoints!.map((bp) => {
        const mapped = element.views.filter((view) => view.breakpoint === bp);
        if (mapped.length !== 1)
          fail(
            `Subject ${id}: breakpoint ${bp} requires one explicit view mapping; use views for ambiguous source variants`,
          );
        return mapped[0]!.id;
      });
    const samples = request.states.flatMap((state) =>
      views.map((view) => {
        const sample = subject.samples.find((s) => s.state === state && s.view === view);
        if (!sample) fail(`Subject ${id}: missing state=${state} view=${view}`);
        dependencies(sample.dependencies);
        if (request.package === 'component' || request.package === 'composition')
          for (const id of sample.dependencies.parent_ids) parent(id, sample);
        const capture = extract.captures.find((c) => c.subject === id && c.state === state && c.view === view);
        if (!capture) fail(`Missing screenshot ${id}/${view}/${state}`);
        captures.push({ ...capture, path: resolve(request.reference, capture.path) });
        // The source owns observed facts only. Target markup and design decisions stay in the plan.
        const material =
          request.package === 'component'
            ? {
                structure: sample.structure,
                layout: sample.observations.layout,
                typography: sample.observations.typography,
                content: sample.observations.content,
                interactions: sample.observations.interactions,
                unavailable: sample.unavailable,
              }
            : request.package === 'composition'
              ? { structure: sample.structure, layout: sample.observations.layout, unavailable: sample.unavailable }
              : request.package === 'tokens'
                ? {
                    typography: sample.observations.typography,
                    properties: sample.observations.properties,
                    unavailable: sample.unavailable,
                  }
                : { dependencies: sample.dependencies, unavailable: sample.unavailable };
        return {
          view,
          state,
          ...(sample.breakpoint ? { breakpoint: sample.breakpoint } : {}),
          [request.package]: bounded(material, `Subject ${id}.${request.package}`),
        };
      }),
    );
    return { id, locator: subject.locator, samples };
  });
  const scope = {
    subjects: request.subjects,
    states: request.states,
    ...(request.views ? { views: request.views } : { breakpoints: request.breakpoints }),
  };
  const fingerprint = hash(
    JSON.stringify(
      canonical({
        request: { reference: request.reference, package: request.package, ...scope },
        contract,
        files: binding.files,
        id: binding.id,
        revision: binding.revision,
      }),
    ),
  );
  const selectedFiles = new Set(['meta.yml', 'extract.json']);
  for (const capture of captures) selectedFiles.add(relative(request.reference, capture.path));
  for (const asset of selectedImages.values()) selectedFiles.add(asset.reference_path);
  for (const font of selectedFonts.values()) for (const file of font.files ?? []) selectedFiles.add(file.local_path);
  const files = Object.fromEntries([...selectedFiles].map((file) => [file, binding.files[file]!]));
  const compactBinding = {
    id: binding.id,
    revision: binding.revision,
    directory: binding.directory,
    workflow: binding.workflow,
  };
  const result: ReferenceQueryResult = {
    package: request.package,
    scope,
    subjects: selected,
    dependencies: {
      parents: [...selectedParents.values()],
      assets: [...selectedImages.values()],
      fonts: [...selectedFonts.values()],
    },
    captures,
    provenance: { reference: request.reference, source: meta.source, binding: compactBinding, fingerprint, files },
    checks: { schema: true, scope: true, files: selectedFiles.size },
  };
  return bounded(result, 'Resolved observation package');
}
export function prepareReferenceQuery(
  request: ReferenceQueryRequest,
  contract: ReferenceQueryContract,
): FrozenReferenceQuery {
  const result = evaluate(request, contract);
  return { ...request, fingerprint: result.provenance.fingerprint };
}
export function queryReference(request: FrozenReferenceQuery, contract: ReferenceQueryContract): ReferenceQueryResult {
  if (!/^[a-f0-9]{64}$/.test(request.fingerprint ?? '')) fail('fingerprint: missing frozen intake fingerprint');
  const result = evaluate(request, contract);
  if (result.provenance.fingerprint !== request.fingerprint)
    fail('fingerprint: reference scope or schema changed; rebuild the plan');
  return result;
}
export interface ReferenceIntakeValidation {
  pass: true;
  reference: string;
  binding: CaptureBinding;
  checks: { schema: true; subjects: number; cells: number; packages: number };
  scopes: FrozenReferenceQuery[];
}
export function validateReferenceIntake(
  reference: string,
  contract: ReferenceQueryContract,
): ReferenceIntakeValidation {
  const { binding, extract } = loadReference(reference, contract);
  const scopes: FrozenReferenceQuery[] = [];
  let cells = 0;
  for (const subject of extract.subjects)
    for (const sample of subject.samples) {
      cells++;
      for (const kind of ['component', 'composition', 'tokens', 'assets'] as const)
        scopes.push(
          prepareReferenceQuery(
            { reference, package: kind, subjects: [subject.id], states: [sample.state], views: [sample.view] },
            contract,
          ),
        );
    }
  return {
    pass: true,
    reference,
    binding,
    checks: { schema: true, subjects: extract.subjects.length, cells, packages: scopes.length },
    scopes,
  };
}
