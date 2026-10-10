/**
 * Local export input for `capture-image` / `capture-file`: copy bytes a source
 * integration already obtained (e.g. a host tool's image block) into the
 * revision, at the path its imported observations declared. No browser, no
 * network. Copying records the asserted association; it cannot authenticate
 * which renderer produced the bytes.
 */
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { assertUnpublishedTarget, type CaptureDefinition, type ReferenceContract } from '../tools/reference-capture.js';
import { isObservationDocument, parseObservationDocument, readStoredExtract } from '../tools/reference-observations.js';
import { pngSize, sourceDumpName } from '../tools/reference-project.js';
import { validateImage } from '../validation/image.js';

export interface CaptureInputOptions {
  reference: string;
  path: string;
  input: string;
  capture: CaptureDefinition;
  contract: ReferenceContract;
  subject: string;
  view: string;
  state: string;
  mode: 'image' | 'file';
  assetId?: string | undefined;
  fontFamily?: string | undefined;
}

const inside = (root: string, path: string) => {
  const rel = relative(root, path);
  return rel !== '' && rel !== '..' && !rel.startsWith('../') && !isAbsolute(rel);
};

export function importCaptureInput(opts: CaptureInputOptions): {
  path: string;
  bytes: number;
  width?: number;
  height?: number;
} {
  if (!isAbsolute(opts.reference)) throw new Error('reference: expected absolute revision directory');
  if (isAbsolute(opts.path) || !inside(resolve(opts.reference), resolve(opts.reference, opts.path)))
    throw new Error('path: expected a path inside --reference');
  if (!existsSync(join(opts.reference, sourceDumpName(opts.state))))
    throw new Error(`No imported observations for state "${opts.state}" — run reference import first`);
  const raw = readStoredExtract(opts.reference, opts.state);
  if (!isObservationDocument(raw))
    throw new Error(`${sourceDumpName(opts.state)} is not an imported observation document`);
  const doc = parseObservationDocument(raw, opts.contract);
  if (!isDeepStrictEqual(doc.capture, opts.capture))
    throw new Error('--capture differs from the capture definition of the imported observations');
  const subject = doc.extract.subjects.find((item) => item.id === opts.subject);
  const sample = subject?.samples.find((item) => item.view === opts.view && item.state === opts.state);
  if (!sample) throw new Error(`No imported sample ${opts.subject}/${opts.view}/${opts.state}`);

  const bytes = readFileSync(opts.input);
  if (!bytes.length) throw new Error(`input: empty file ${opts.input}`);
  let size: { width: number; height: number } | undefined;
  if (opts.mode === 'image') {
    const record = doc.extract.captures.find(
      (item) => item.subject === opts.subject && item.view === opts.view && item.state === opts.state,
    )!;
    if (opts.path !== record.path) throw new Error(`path: the declared screenshot is ${record.path}`);
    const check = validateImage(opts.input);
    if (!check.valid) throw new Error(`input: ${check.errors.join('; ')}`);
    // Declared capture pixels, not the source frame geometry: a host may return a downscaled export.
    size = pngSize(bytes);
    if (size.width !== record.width || size.height !== record.height)
      throw new Error(
        `input: PNG dimensions ${size.width}×${size.height} differ from the declared capture ${record.width}×${record.height}`,
      );
  } else {
    if (Boolean(opts.assetId) === Boolean(opts.fontFamily))
      throw new Error('Exactly one of --asset-id or --font-family is required');
    // A sample owes the dependencies of its own nodes and of its parent chain in the same cell.
    const parents = new Map(doc.extract.parents.map((parent) => [parent.id, parent]));
    const owed = {
      asset_ids: [...sample.dependencies.asset_ids],
      font_families: [...sample.dependencies.font_families],
    };
    const visit = (id: string) => {
      const parent = parents.get(id)!;
      const match = parent.samples.find((item) => item.view === opts.view && item.state === opts.state);
      if (match) {
        owed.asset_ids.push(...match.asset_ids);
        owed.font_families.push(...match.font_families);
      }
      if (parent.parent) visit(parent.parent);
    };
    sample.dependencies.parent_ids.forEach(visit);
    if (opts.assetId) {
      if (!owed.asset_ids.includes(opts.assetId))
        throw new Error(`asset ${opts.assetId} is not a dependency of this sample`);
      const image = doc.extract.images.find((item) => item.url === opts.assetId)!;
      if (image.reference_path !== opts.path)
        throw new Error(`path: asset ${opts.assetId} is declared at ${image.reference_path}`);
    } else {
      if (!owed.font_families.includes(opts.fontFamily!))
        throw new Error(`font ${opts.fontFamily} is not a dependency of this sample`);
      const font = doc.extract.fonts.find((item) => item.family === opts.fontFamily)!;
      if (!(font.files ?? []).some((file) => file.local_path === opts.path))
        throw new Error(`path: font ${opts.fontFamily} declares no binary at ${opts.path}`);
    }
  }

  // Confine through real ancestors: a symlinked directory must not carry the write outside.
  const root = realpathSync(opts.reference);
  const target = resolve(opts.reference, opts.path);
  let existing = dirname(target);
  while (!existsSync(existing)) existing = dirname(existing);
  const real = resolve(realpathSync(existing), relative(existing, target));
  if (!inside(root, real) || (existsSync(target) && lstatSync(target).isSymbolicLink()))
    throw new Error(`path: ${opts.path} escapes the revision directory`);
  assertUnpublishedTarget(target);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  return { path: opts.path, bytes: bytes.length, ...(size ?? {}) };
}
