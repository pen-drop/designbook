/**
 * Entity Module Builder — `.jsonata` mappings + shared data/ pool → CSF string.
 *
 * Anchored on any `entity-mapping/<type>.<bundle>.<view_mode>.jsonata` file: it
 * derives the bundle, discovers every sibling `<type>.<bundle>.*.jsonata`
 * view-mode mapping, pulls that bundle's records from the shared sample-data
 * pool (`data/<type>.<bundle>.yml`), resolves each record through each mapping,
 * and emits a per-bundle CSF module via buildEntityCsfModule (one story per
 * view-mode, a `record` Controls select over the pool records).
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';

import { buildRenderContext, defaultSdcResolver, loadDataModel, loadSampleData } from './scene-module-builder';
import { view } from './view';
import { buildEntityCsfModule, type EntityCsfViewMode, type EntityCsfFormMode } from './csf-prep';
import { extractFieldMappings } from './jsonata-mapping-analyzer';
import { buildExportName, formExportName } from './scene-metadata';
import type { SceneNode, SceneNodeBuilder, SceneTreeNode, ComponentNode } from './types';
import { entityStoryGroup, titleCaseBundle } from './story-address';

export { entityStoryGroup, titleCaseBundle };

// ── Helpers ────────────────────────────────────────────────────────────

/** Parse "<type>.<bundle>.<view_mode>.jsonata" → { entity_type, bundle }. */
function parseMappingName(file: string): { entity_type: string; bundle: string } {
  const parts = basename(file).split('.');
  return { entity_type: parts[0] ?? '', bundle: parts[1] ?? '' };
}

// ── Main entry point ───────────────────────────────────────────────────

export async function buildEntityModule(
  mappingFilePath: string,
  designbookDir: string,
  options: {
    builders?: SceneNodeBuilder[];
    resolveImportPath?: (componentId: string) => string | null;
    wrapImport?: (alias: string) => string;
  } = {},
): Promise<string> {
  const { entity_type, bundle } = parseMappingName(mappingFilePath);
  const dir = dirname(mappingFilePath);

  // Discover all view-modes for this bundle: <type>.<bundle>.<view_mode>.jsonata
  const prefix = `${entity_type}.${bundle}.`;
  const viewModeNames = readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.jsonata'))
    .map((f) => f.slice(prefix.length, -'.jsonata'.length))
    .sort();

  // Records come from the shared sample-data pool (data/<type>.<bundle>.yml),
  // not a co-located demo file. entity-builder selects them via `select`.
  const sampleData = loadSampleData(designbookDir);
  const records =
    (sampleData.content?.[entity_type]?.[bundle] as unknown[] | undefined) ??
    (sampleData.config?.[entity_type]?.[bundle] as unknown[] | undefined) ??
    [];
  const recordCount = Math.max(records.length, 1);

  const dataModel = loadDataModel(designbookDir);

  const ctx = buildRenderContext({
    dataModel,
    sampleData,
    designbookDir,
    config: undefined,
    builders: options.builders,
  });

  const viewModes: EntityCsfViewMode[] = [];
  for (const vm of viewModeNames) {
    const source = readFileSync(resolve(dir, `${prefix}${vm}.jsonata`), 'utf-8');
    let fieldMappings = [] as ReturnType<typeof extractFieldMappings>;
    try {
      fieldMappings = extractFieldMappings(source);
    } catch {
      // Non-critical — panel just won't show mappings
    }

    const recordsNodes: ComponentNode[][] = [];
    const recordsTrees: SceneTreeNode[][] = [];
    for (let r = 0; r < recordCount; r++) {
      const tree: SceneTreeNode[] = [];
      const built = await ctx.buildNode({
        entity: `${entity_type}.${bundle}`,
        view_mode: vm,
        select: `$[${r}]`,
      } as SceneNode);
      tree.push(...built);
      // view() projects the render nodes AND stamps the canonical path onto the
      // IR, so the retained tree stays in lock-step with the rendered record.
      recordsNodes.push(view(tree));
      recordsTrees.push(tree);
    }

    viewModes.push({
      view_mode: vm,
      exportName: buildExportName(vm),
      recordsNodes,
      recordsTrees,
      source,
      fieldMappings,
    });
  }

  // Discover the bundle's form-mapping/ siblings (the editing half). A sibling
  // directory namespace makes this collision-free — the view glob above never
  // sees these files, so view stories can never regress. A bundle with no
  // form-mapping/ dir (or no matching file) yields zero form stories.
  const formDir = resolve(dir, '..', 'form-mapping');
  const formModeNames = existsSync(formDir)
    ? readdirSync(formDir)
        .filter((f) => f.startsWith(prefix) && f.endsWith('.jsonata'))
        .map((f) => f.slice(prefix.length, -'.jsonata'.length))
        .sort()
    : [];

  const formModes: EntityCsfFormMode[] = [];
  for (const fm of formModeNames) {
    const source = readFileSync(resolve(formDir, `${prefix}${fm}.jsonata`), 'utf-8');
    let fieldMappings = [] as ReturnType<typeof extractFieldMappings>;
    try {
      fieldMappings = extractFieldMappings(source);
    } catch {
      // Non-critical — panel just won't show mappings
    }

    const recordsNodes: ComponentNode[][] = [];
    const recordsTrees: SceneTreeNode[][] = [];
    for (let r = 0; r < recordCount; r++) {
      const tree: SceneTreeNode[] = [];
      const built = await ctx.buildNode({
        entity: `${entity_type}.${bundle}`,
        form_mode: fm,
        select: `$[${r}]`,
      } as SceneNode);
      tree.push(...built);
      recordsNodes.push(view(tree));
      recordsTrees.push(tree);
    }

    formModes.push({
      form_mode: fm,
      exportName: formExportName(fm),
      recordsNodes,
      recordsTrees,
      source,
      fieldMappings,
    });
  }

  const resolveImportPath =
    options.resolveImportPath ?? ((componentId) => defaultSdcResolver(componentId, designbookDir));
  const wrapImport =
    options.wrapImport ?? ((alias) => `{ render: (p, s) => ${alias}.default.component({...p, ...s}) }`);

  const { title, isConfig } = entityStoryGroup(dataModel, entity_type, bundle);

  return buildEntityCsfModule({
    group: title,
    extraTags: isConfig ? ['config'] : [],
    source: basename(mappingFilePath),
    mappingBasename: (vm) => `${prefix}${vm}.jsonata`,
    viewModes,
    formModes,
    formMappingBasename: (fm) => `${prefix}${fm}.jsonata`,
    resolveImportPath,
    wrapImport,
  });
}
