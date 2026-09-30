/**
 * Browsable inventory of published reference revisions under `<data>/references/<id>/<revision>/`.
 * One source for the Storybook indexer, the generated CSF module and the `/__designbook/references` endpoint.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { Reference, isReferenceBinding } from './reference-entity.js';
import { readApproval, publicationFilesFingerprint } from './reference-approval.js';
import { readPublishedCapture } from './reference-capture.js';
import { toId, storyNameFromExport } from 'storybook/internal/csf';
import { StoryMeta } from '../scene-model/story-entity.js';
import { buildExportName } from '../scene-model/scene-metadata.js';

export type ReferenceEntryStatus = 'ok' | 'unpublished' | 'invalid';
export type ReferenceApprovalState = 'approved' | 'pending' | 'rejected' | 'stale' | 'none';

export interface ReferenceCaptureEntry {
  subject: string;
  view: string;
  state: string;
  session: string;
  path: string;
  width: number;
  height: number;
  exportName: string;
  name: string;
  storyId: string;
}

export interface ReferenceLibraryEntry {
  id: string;
  revision: string;
  binding: string;
  dir: string;
  status: ReferenceEntryStatus;
  error?: string;
  /** Capture plan that produced the revision; `id/revision` stays the identity. */
  label: string;
  /** 1-based position among this reference's published revisions, by publication time. */
  number?: number;
  /** ISO time `publication.json` was written (publication is write-once). */
  publishedAt?: string;
  title?: string;
  /** Storybook meta id, bound to the immutable id/revision so URLs survive renumbering. */
  metaId?: string;
  source: { kind: string; identity: string; revision: string | null };
  views: Array<{ id: string; width: number; height: number; breakpoint?: string }>;
  captures: ReferenceCaptureEntry[];
  approval: ReferenceApprovalState;
  boundStories: string[];
}

const EMPTY_SOURCE = { kind: 'unknown', identity: '', revision: null };

/** Readable revision name: the capture plan's folder (`plans/<name>/plan.md`) or file name. */
export function revisionLabel(workflow: string): string {
  const file = basename(workflow);
  return file === 'plan.md' ? basename(dirname(workflow)) : file.replace(/(\.plan)?\.md$/, '');
}

function sidebarTitle(source: ReferenceLibraryEntry['source'], number: number): string {
  // One sidebar level per source: a `/` in the identity would open extra groups.
  const identity = source.identity.replace(/^[a-z]+:\/\//i, '').replace(/\/+/g, ' | ');
  return `Designbook/References/${source.kind}: ${identity}/Revision ${number}`;
}

/** Published revisions of one reference id → their 1-based number by publication time. */
function revisionNumbers(root: string, id: string): Map<string, number> {
  // ponytail: publication time is the file mtime (write-once `wx`); a copy that resets mtimes reorders numbers.
  const published = readdirSync(join(root, id))
    .filter((revision) => existsSync(join(root, id, revision, 'publication.json')))
    .map((revision) => ({ revision, time: statSync(join(root, id, revision, 'publication.json')).mtimeMs }))
    .sort((a, b) => a.time - b.time || a.revision.localeCompare(b.revision));
  return new Map(published.map((p, index) => [p.revision, index + 1]));
}

function approvalState(directory: string, files: Record<string, string>): ReferenceApprovalState {
  const approval = readApproval(directory);
  if (!approval) return 'none';
  const current = publicationFilesFingerprint(files);
  return approval.fingerprint === current ? approval.status : 'stale';
}

function entry(
  data: string,
  id: string,
  revision: string,
  boundStories: string[],
  number: number | undefined,
): ReferenceLibraryEntry | null {
  const binding = `${id}/${revision}`;
  const directory = join(resolve(data, 'references'), binding);
  // The capture owner (reserved before any file is written) names the revision in every status.
  const ownerFile = join(directory, '.capture-owner.json');
  const label = existsSync(ownerFile)
    ? revisionLabel((JSON.parse(readFileSync(ownerFile, 'utf8')) as { workflow: string }).workflow)
    : revision;
  const base = {
    id,
    revision,
    binding,
    label,
    dir: `references/${binding}`,
    source: EMPTY_SOURCE,
    views: [],
    captures: [],
    approval: 'none' as const,
    boundStories,
  };
  if (!existsSync(join(directory, 'publication.json'))) return { ...base, status: 'unpublished' };
  const publishedAt = statSync(join(directory, 'publication.json')).mtime.toISOString();
  try {
    const reference = Reference.load({ data, technology: 'html' }, binding);
    if (!reference)
      return { ...base, status: 'invalid', number, publishedAt, error: 'Revision directory is outside references/' };
    const json = reference.toJSON();
    if (json.role !== 'reference') return null;
    const published = readPublishedCapture(directory);
    const title = sidebarTitle(json.source, number!);
    const metaId = `designbook-references-${id}-${revision}`;
    const views = new Map(json.elements.flatMap((el) => el.views.map((view) => [view.id, view] as const)));
    const sessions = new Map(
      json.elements.flatMap((el) => el.states.map((state) => [`${el.id}\0${state.name}`, state.session] as const)),
    );
    const captures = json.captures.map((capture) => {
      const name = `${capture.subject} · ${capture.view} · ${capture.state}`;
      const exportName = buildExportName(`${capture.subject} ${capture.view} ${capture.state}`);
      return {
        ...capture,
        session: sessions.get(`${capture.subject}\0${capture.state}`) ?? '',
        name,
        exportName,
        // Storybook's own id derivation from the meta id, so links match the index exactly.
        storyId: toId(metaId, storyNameFromExport(exportName)),
      };
    });
    return {
      ...base,
      status: 'ok',
      number,
      publishedAt,
      title,
      metaId,
      source: json.source,
      views: [...views.values()],
      captures,
      approval: approvalState(directory, published.files),
    };
  } catch (error) {
    return {
      ...base,
      status: 'invalid',
      number,
      publishedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function boundStoriesByBinding(data: string): Map<string, string[]> {
  const bound = new Map<string, string[]>();
  for (const story of StoryMeta.list({ data, technology: 'html' })) {
    const reference = story.toJSON().reference;
    if (reference) bound.set(reference, [...(bound.get(reference) ?? []), story.storyId]);
  }
  return bound;
}

export function listReferences(data: string): ReferenceLibraryEntry[] {
  const root = resolve(data, 'references');
  if (!existsSync(root)) return [];
  const bound = boundStoriesByBinding(data);
  const entries: ReferenceLibraryEntry[] = [];
  for (const id of readdirSync(root, { withFileTypes: true })) {
    if (!id.isDirectory()) continue;
    const numbers = revisionNumbers(root, id.name);
    for (const revision of readdirSync(join(root, id.name), { withFileTypes: true })) {
      if (!revision.isDirectory() || !isReferenceBinding(`${id.name}/${revision.name}`)) continue;
      const binding = `${id.name}/${revision.name}`;
      const item = entry(data, id.name, revision.name, bound.get(binding) ?? [], numbers.get(revision.name));
      if (item) entries.push(item);
    }
  }
  return entries.sort((a, b) => a.id.localeCompare(b.id) || (a.number ?? Infinity) - (b.number ?? Infinity));
}

export function loadReferenceEntry(data: string, id: string, revision: string): ReferenceLibraryEntry | null {
  if (!isReferenceBinding(`${id}/${revision}`)) return null;
  const root = resolve(data, 'references');
  if (!existsSync(join(root, id, revision))) return null;
  const number = revisionNumbers(root, id).get(revision);
  return entry(data, id, revision, boundStoriesByBinding(data).get(`${id}/${revision}`) ?? [], number);
}

/** A `publication.json` path → the healthy role-reference entry it publishes, or null. */
function entryForPublication(data: string, file: string): ReferenceLibraryEntry | null {
  const revisionDir = dirname(file);
  if (basename(file) !== 'publication.json') return null;
  const found = loadReferenceEntry(data, basename(dirname(revisionDir)), basename(revisionDir));
  return found?.status === 'ok' ? found : null;
}

export function referenceIndexEntries(
  data: string,
  file: string,
): Array<{ title: string; metaId: string; name: string; exportName: string; storyId: string }> {
  const found = entryForPublication(data, file);
  if (!found) return [];
  return found.captures.map((c) => ({
    title: found.title!,
    metaId: found.metaId!,
    name: c.name,
    exportName: c.exportName,
    storyId: c.storyId,
  }));
}

const MOUNT_REACT_IMPORT = "import { mountReact } from 'storybook-addon-designbook/dist/pages/mount-react.js';";
const REFERENCE_PAGE_IMPORT =
  "import { DeboReferencePage } from 'storybook-addon-designbook/dist/components/pages/DeboReferencePage.js';";

/** CSF module for one revision: one story per captured tuple, each rendering the frozen detail page. */
export function buildReferenceModule(data: string, file: string): string {
  const found = entryForPublication(data, file);
  if (!found) return "export default { title: 'Designbook/References/Unavailable', tags: ['!autodocs'] };\n";
  const lines = [
    MOUNT_REACT_IMPORT,
    REFERENCE_PAGE_IMPORT,
    '',
    `export default { id: ${JSON.stringify(found.metaId)}, title: ${JSON.stringify(found.title)}, tags: ['!autodocs'], parameters: { layout: 'fullscreen' } };`,
    '',
  ];
  for (const capture of found.captures) {
    const props = {
      id: found.id,
      revision: found.revision,
      subject: capture.subject,
      view: capture.view,
      state: capture.state,
    };
    lines.push(
      `export const ${capture.exportName} = {`,
      `  name: ${JSON.stringify(capture.name)},`,
      `  render: () => mountReact(DeboReferencePage, ${JSON.stringify(props)}),`,
      '};',
      '',
    );
  }
  return lines.join('\n');
}
