/**
 * Scene Module Builder — orchestrates the async build pipeline.
 *
 * Build time (async, Node.js):
 *   SceneNode[] → BuilderRegistry → ComponentNode[] → buildCsfModule() → CSF string
 *
 * Runtime (sync, browser):
 *   renderComponent(args.__scene, __imports) → framework-native output
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { load as parseYaml } from 'js-yaml';

import { extractGroup, buildExportName, fileBaseName, extractScenes } from './scene-metadata';
import { expandEntries } from './parser';
import { BuilderRegistry } from './builder-registry';
import { entityBuilder } from './builders/entity-builder';
import { sceneBuilder } from './builders/scene-builder';
import { componentBuilder } from './builders/component-builder';
import { imageStyleBuilder } from './builders/image-style-builder';
import { buildCsfModule } from './csf-prep';
import { view } from './view';
import { validateSceneNodes } from './validate-scene-nodes';

import type { DataModel, DesignbookConfig, SampleData, SceneNode, SceneNodeBuilder, SceneTreeNode, ComponentNode } from './types';

// ── Default SDC import resolver ────────────────────────────────────────

/**
 * Default import path resolver for SDC (.component.yml) components.
 * Resolves 'provider:component' → absolute path to component.yml
 */
function defaultSdcResolver(componentId: string, designbookDir: string): string | null {
  const parts = componentId.split(':');
  if (parts.length !== 2 || !parts[1]) return null;

  const componentName = parts[1];
  // Try both underscore and hyphen conventions (Drupal SDC uses hyphens in dirs)
  const candidates = [componentName, componentName.replace(/_/g, '-')];

  for (const dirName of candidates) {
    // Try both underscore and hyphen for the yml filename too
    for (const fileName of [componentName, dirName]) {
      const componentYml = join(resolve(designbookDir, '..', 'components', dirName), `${fileName}.component.yml`);
      if (existsSync(componentYml)) return componentYml;
    }
  }

  return null;
}

// ── Data loading ────────────────────────────────────────────────────────

function loadDataModel(designbookDir: string): DataModel {
  const dataModelPath = join(designbookDir, 'data-model.yml');
  try {
    return parseYaml(readFileSync(dataModelPath, 'utf-8')) as DataModel;
  } catch {
    console.warn('[Designbook] No data-model.yml found, scene entities will not resolve');
    return { content: {} };
  }
}

function loadDesignbookConfig(designbookDir: string): DesignbookConfig | undefined {
  const configPath = join(resolve(designbookDir, '..'), 'designbook.config.yml');
  if (!existsSync(configPath)) {
    const altPath = join(resolve(designbookDir, '..'), 'designbook.config.yaml');
    if (!existsSync(altPath)) return undefined;
    try {
      return parseYaml(readFileSync(altPath, 'utf-8')) as DesignbookConfig;
    } catch {
      return undefined;
    }
  }
  try {
    return parseYaml(readFileSync(configPath, 'utf-8')) as DesignbookConfig;
  } catch {
    return undefined;
  }
}

function loadSampleData(id: string, designbookDir: string, firstSceneSection?: string): SampleData {
  let sectionId = firstSceneSection;
  if (!sectionId) {
    const match = id.match(/sections\/([^/]+)\//);
    if (match) sectionId = match[1];
  }

  if (sectionId) {
    const sectionDataPath = join(designbookDir, 'sections', sectionId, 'data.yml');
    if (existsSync(sectionDataPath)) {
      return parseYaml(readFileSync(sectionDataPath, 'utf-8')) as SampleData;
    }
  }

  const globalDataPath = join(designbookDir, 'data.yml');
  if (existsSync(globalDataPath)) {
    return parseYaml(readFileSync(globalDataPath, 'utf-8')) as SampleData;
  }

  return {};
}

// ── Main entry point ────────────────────────────────────────────────────

export interface SceneModuleOptions {
  builders?: SceneNodeBuilder[];
  /**
   * Framework-specific component import path resolver.
   * Defaults to the SDC (.component.yml) resolver.
   */
  resolveImportPath?: (componentId: string) => string | null;
  /**
   * Optional wrapper for each __imports map entry.
   * Defaults to the SDC wrapper: { render: (p, s) => alias.default.component({...p, ...s}) }
   */
  wrapImport?: (alias: string) => string;
}

/**
 * Build a CSF story module from a parsed scenes YAML object.
 *
 * Async build time: YAML → SceneNode[] → BuilderRegistry → ComponentNode[] → CSF string.
 * No markers. Fully resolved.
 */
export async function buildSceneModule(
  id: string,
  raw: Record<string, unknown>,
  designbookDir: string,
  options: SceneModuleOptions = {},
): Promise<string> {
  // ── 1. Parse scenes from YAML ─────────────────────────────────────
  const scenesArray = extractScenes(raw);

  // ── 2. Load data model + sample data ──────────────────────────────
  const dataModel = loadDataModel(designbookDir);
  const firstScene = scenesArray[0] as Record<string, unknown> | undefined;
  const sampleData = loadSampleData(
    id,
    designbookDir,
    typeof firstScene?.section === 'string' ? firstScene.section : undefined,
  );

  // ── 2b. Load designbook config ──────────────────────────────��─────
  const config = loadDesignbookConfig(designbookDir);

  // ── 3. Build registry with built-in + custom builders ─────────────
  const registry = new BuilderRegistry();
  // Built-ins registered first (lowest priority — custom builders override)
  registry.register(componentBuilder);
  registry.register(entityBuilder);
  registry.register(sceneBuilder);
  registry.register(imageStyleBuilder);
  // Custom builders registered last (highest priority)
  for (const builder of options.builders ?? []) {
    registry.register(builder);
  }

  const ctx = registry.createContext({ dataModel, sampleData, designbookDir, config });

  // ── 4. Scene metadata ─────────────────────────────────────────────
  const fileBase = fileBaseName(id);
  const group = extractGroup(raw, fileBase);

  // ── 5. Build each scene: items → SceneTree → RenderTree ────────────
  const resolvedScenes: Array<{
    name: string;
    exportName: string;
    nodes: ComponentNode[];
    theme?: string;
    tree: SceneTreeNode[];
  }> = [];

  for (const rawScene of scenesArray) {
    const scene = rawScene as Record<string, unknown>;
    const sceneName = (scene.name as string) || 'Default';
    const sceneTheme = (scene.theme as string) || undefined;
    const items = expandEntries((scene.items as unknown[] | undefined) ?? []);

    // build() → SceneTree
    const tree: SceneTreeNode[] = [];
    for (const entry of items) {
      const built = await ctx.buildNode(entry as SceneNode);
      tree.push(...built);
    }

    // view() → RenderTree
    const nodes = view(tree);

    // Validate: built scene must contain only proper ComponentNodes
    const validationErrors = validateSceneNodes(nodes, `scene:${sceneName}`);
    for (const err of validationErrors) {
      console.error(`[Designbook] Invalid node in built scene at ${err.path}: ${err.reason}`, err.node);
    }

    resolvedScenes.push({
      name: sceneName,
      exportName: buildExportName(sceneName),
      nodes,
      theme: sceneTheme,
      tree,
    });
  }

  // ── 6. CSF Prep ───────────────────────────────────────────────────
  const resolveImportPath =
    options.resolveImportPath ?? ((componentId) => defaultSdcResolver(componentId, designbookDir));

  // Default SDC wrapper: modules from .component.yml expose .default.component()
  const wrapImport =
    options.wrapImport ?? ((alias) => `{ render: (p, s) => ${alias}.default.component({...p, ...s}) }`);

  return buildCsfModule({
    group,
    source: fileBase + '.scenes.yml',
    scenes: resolvedScenes,
    resolveImportPath,
    wrapImport,
  });
}
