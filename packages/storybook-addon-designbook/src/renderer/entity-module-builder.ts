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

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';

import { buildRenderContext, defaultSdcResolver, loadDataModel, loadSampleData } from './scene-module-builder';
import { view } from './view';
import { buildEntityCsfModule, type EntityCsfViewMode } from './csf-prep';
import { extractFieldMappings } from './jsonata-mapping-analyzer';
import { buildExportName } from './scene-metadata';
import type { SceneNode, SceneNodeBuilder, SceneTreeNode, ComponentNode } from './types';

// ── Helpers ────────────────────────────────────────────────────────────

export function titleCaseBundle(bundle: string): string {
  return bundle
    .split(/[_-]/)
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p))
    .join(' ');
}

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
    for (let r = 0; r < recordCount; r++) {
      const tree: SceneTreeNode[] = [];
      const built = await ctx.buildNode({
        entity: `${entity_type}.${bundle}`,
        view_mode: vm,
        select: `$[${r}]`,
      } as SceneNode);
      tree.push(...built);
      recordsNodes.push(view(tree));
    }

    viewModes.push({ view_mode: vm, exportName: buildExportName(vm), recordsNodes, source, fieldMappings });
  }

  const resolveImportPath =
    options.resolveImportPath ?? ((componentId) => defaultSdcResolver(componentId, designbookDir));
  const wrapImport =
    options.wrapImport ?? ((alias) => `{ render: (p, s) => ${alias}.default.component({...p, ...s}) }`);

  return buildEntityCsfModule({
    group: `Entities/${entity_type}/${titleCaseBundle(bundle)}`,
    source: basename(mappingFilePath),
    mappingBasename: (vm) => `${prefix}${vm}.jsonata`,
    viewModes,
    resolveImportPath,
    wrapImport,
  });
}
