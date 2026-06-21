/**
 * Entity Module Builder — demo.yml + sibling .jsonata mappings → CSF string.
 *
 * Parses a per-bundle `entity-mapping/<type>.<bundle>.demo.yml`, discovers
 * sibling `<type>.<bundle>.<view_mode>.jsonata` files, resolves every demo
 * record through each mapping using the shared render context, and emits a
 * CSF module via buildEntityCsfModule.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';
import { load as parseYaml } from 'js-yaml';

import { buildRenderContext, defaultSdcResolver, loadDataModel } from './scene-module-builder';
import { view } from './view';
import { buildEntityCsfModule, type EntityCsfViewMode } from './csf-prep';
import { extractFieldMappings } from './jsonata-mapping-analyzer';
import { buildExportName } from './scene-metadata';
import type { SampleData, SceneNode, SceneNodeBuilder, SceneTreeNode, ComponentNode } from './types';

// ── Helpers ────────────────────────────────────────────────────────────

export function titleCaseBundle(bundle: string): string {
  return bundle
    .split(/[_-]/)
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p))
    .join(' ');
}

/** Parse "<type>.<bundle>.demo.yml" → { entity_type, bundle }. */
function parseDemoName(file: string): { entity_type: string; bundle: string } {
  const parts = basename(file).split('.');
  return { entity_type: parts[0] ?? '', bundle: parts[1] ?? '' };
}

// ── Main entry point ───────────────────────────────────────────────────

export async function buildEntityModule(
  demoFilePath: string,
  designbookDir: string,
  options: {
    builders?: SceneNodeBuilder[];
    resolveImportPath?: (componentId: string) => string | null;
    wrapImport?: (alias: string) => string;
  } = {},
): Promise<string> {
  const { entity_type, bundle } = parseDemoName(demoFilePath);
  const dir = dirname(demoFilePath);

  const sampleData = (parseYaml(readFileSync(demoFilePath, 'utf-8')) as SampleData) ?? {};

  // Discover view-modes from sibling mapping files: <type>.<bundle>.<view_mode>.jsonata
  const prefix = `${entity_type}.${bundle}.`;
  const viewModeNames = readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.jsonata'))
    .map((f) => f.slice(prefix.length, -'.jsonata'.length))
    .sort();

  // Record count from the demo data
  const records =
    (sampleData.content?.[entity_type]?.[bundle] as unknown[] | undefined) ??
    (sampleData.config?.[entity_type]?.[bundle] as unknown[] | undefined) ??
    [];
  const recordCount = Math.max(records.length, 1);

  // Load data model via shared loader (reuses scene-module-builder's logic)
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
      const built = await ctx.buildNode({ entity: `${entity_type}.${bundle}`, view_mode: vm, record: r } as SceneNode);
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
    source: basename(demoFilePath),
    mappingBasename: (vm) => `${prefix}${vm}.jsonata`,
    viewModes,
    resolveImportPath,
    wrapImport,
  });
}
