/**
 * StoryMeta entity — read-only accessor for per-story reference configuration.
 *
 * On-disk format: meta.yml at `stories/{storyId}/meta.yml`
 * Checks and issues are runtime-only and never persisted here.
 */

import { resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { load as parseYaml, dump as dumpYaml } from 'js-yaml';
import { glob } from 'glob';
import { buildExportName } from './renderer/scene-metadata.js';
import type { DesignbookConfig } from './config.js';

// ---------------------------------------------------------------------------
// Storybook ID helpers — mirrors storybook/internal/csf sanitize + toId
// ---------------------------------------------------------------------------

function sanitize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[ '–—―′¿'`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function toStoryId(title: string, exportName: string): string {
  return `${sanitize(title)}--${sanitize(exportName)}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoryMetaElementJSON {
  id: string;
  selector: string;
}

export interface StoryMetaJSON {
  storyId: string;
  section: string;
  storyDir: string;
  /** Hash of the reference URL, or null when no reference is set. */
  reference: string | null;
  /**
   * Reference-screenshot folder relative to the designbook dir
   * (`references/{hash}`), or null when no reference is set.
   */
  referenceDir: string | null;
  /** Story elements bound to this reference. */
  elements: StoryMetaElementJSON[];
}

// ---------------------------------------------------------------------------
// Internal meta.yml types
// ---------------------------------------------------------------------------

interface MetaElement {
  id: string;
  selector?: string;
  states?: Array<{ name: string; steps: unknown[] }>;
}

export interface StoryMetaData {
  /** Hash string of the associated reference, or undefined. */
  reference?: string;
  elements?: MetaElement[];
}

// ---------------------------------------------------------------------------
// Scene resolution
// ---------------------------------------------------------------------------

interface SceneEntry {
  name: string;
  reference?: {
    type: string;
    url: string;
    title?: string;
    screens?: Record<string, string>;
  };
  items?: unknown[];
}

interface ScenesFile {
  id: string;
  title: string;
  group?: string;
  name?: string;
  scenes?: SceneEntry[];
}

/**
 * Resolve a scene identifier to a scenes.yml file path and scene entry.
 *
 * Patterns:
 * - "design-system:shell" → design-system/design-system.scenes.yml → scene "shell"
 * - "galerie:product-detail" → sections/galerie/galerie.section.scenes.yml → scene "product-detail"
 * - "galerie" (no colon) → all scenes in sections/galerie/
 */
export function resolveScene(
  dist: string,
  sceneRef: string,
): { filePath: string; scenes: SceneEntry[]; allScenes: ScenesFile } {
  const parts = sceneRef.split(':');
  const group = parts[0]!;
  const sceneName = parts[1]; // may be undefined

  // Try design-system path first
  let filePath = resolve(dist, 'design-system', `${group}.scenes.yml`);
  if (!existsSync(filePath)) {
    // Try design-system with design-system prefix
    filePath = resolve(dist, group, `${group}.scenes.yml`);
  }
  if (!existsSync(filePath)) {
    // Try sections path
    const sectionGlob = resolve(dist, 'sections', group, '*.section.scenes.yml');
    const matches = glob.sync(sectionGlob);
    if (matches.length > 0) {
      filePath = matches[0]!;
    }
  }

  if (!existsSync(filePath)) {
    throw new Error(
      `No scenes file found for "${group}". Tried:\n  - ${dist}/design-system/${group}.scenes.yml\n  - ${dist}/${group}/${group}.scenes.yml\n  - ${dist}/sections/${group}/*.section.scenes.yml`,
    );
  }

  const content = readFileSync(filePath, 'utf-8');
  const parsed = parseYaml(content) as ScenesFile;
  const allScenes = parsed.scenes ?? [];

  if (sceneName) {
    const matched = allScenes.filter((s) => s.name === sceneName);
    if (matched.length === 0) {
      const available = allScenes.map((s) => s.name).join(', ');
      throw new Error(`Scene "${sceneName}" not found in ${filePath}. Available: ${available}`);
    }
    return { filePath, scenes: matched, allScenes: parsed };
  }

  return { filePath, scenes: allScenes, allScenes: parsed };
}

// ---------------------------------------------------------------------------
// StoryMeta
// ---------------------------------------------------------------------------

export class StoryMeta {
  readonly storyId: string;
  readonly section: string;
  readonly storyDir: string;

  private _meta: StoryMetaData;
  private readonly _metaPath: string;

  private constructor(storyId: string, section: string, storyDir: string, meta: StoryMetaData, metaPath: string) {
    this.storyId = storyId;
    this.section = section;
    this.storyDir = storyDir;
    this._meta = meta;
    this._metaPath = metaPath;
  }

  get data(): Readonly<StoryMetaData> {
    return this._meta;
  }

  // -------------------------------------------------------------------------
  // Static loaders
  // -------------------------------------------------------------------------

  /**
   * Load a StoryMeta from a storyId. Returns null if story directory doesn't exist.
   */
  static load(config: DesignbookConfig, storyId: string): StoryMeta | null {
    const storyDir = resolve(config.data, 'stories', storyId);
    if (!existsSync(storyDir)) return null;

    const metaPath = resolve(storyDir, 'meta.yml');
    let meta: StoryMetaData = {};

    if (existsSync(metaPath)) {
      const content = readFileSync(metaPath, 'utf-8');
      meta = (parseYaml(content) as StoryMetaData) ?? {};
    }

    const section = StoryMeta._deriveSection(storyId);

    return new StoryMeta(storyId, section, storyDir, meta, metaPath);
  }

  /**
   * List stories, optionally filtered by section.
   */
  static list(config: DesignbookConfig, filter?: { section?: string }): StoryMeta[] {
    const storiesDir = resolve(config.data, 'stories');
    if (!existsSync(storiesDir)) return [];

    const entries = readdirSync(storiesDir, { withFileTypes: true });
    const stories: StoryMeta[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const story = StoryMeta.load(config, entry.name);
      if (!story) continue;
      if (filter?.section && story.section !== filter.section) continue;
      stories.push(story);
    }

    return stories;
  }

  /**
   * Load a story by scene reference (group:sceneName format).
   * Resolves the scene to a storyId first.
   */
  static loadByScene(config: DesignbookConfig, sceneRef: string): StoryMeta | null {
    const { scenes, allScenes } = resolveScene(config.data, sceneRef);
    if (scenes.length === 0) return null;

    const sceneName = scenes[0]!.name;
    const storyId = StoryMeta._deriveStoryIdFromScene(allScenes, sceneName);

    return StoryMeta.load(config, storyId);
  }

  /**
   * Load a story by ID, creating the directory and meta.yml if it doesn't exist.
   * Breakpoints are derived from design-tokens.yml when creating.
   */
  static loadOrCreate(config: DesignbookConfig, storyId: string): StoryMeta {
    const existing = StoryMeta.load(config, storyId);
    if (existing) return existing;

    const storyDir = resolve(config.data, 'stories', storyId);
    mkdirSync(storyDir, { recursive: true });

    const metaPath = resolve(storyDir, 'meta.yml');
    const section = StoryMeta._deriveSection(storyId);

    const meta: StoryMetaData = {};
    writeFileSync(metaPath, dumpYaml(meta, { lineWidth: -1 }), 'utf-8');

    return new StoryMeta(storyId, section, storyDir, meta, metaPath);
  }

  /**
   * Create or load a story by scene reference. Creates the story directory if
   * missing, optionally seeds meta.yml with provided data.
   */
  static createByScene(
    config: DesignbookConfig,
    sceneRef: string,
    metaSeed?: Partial<StoryMetaData>,
  ): StoryMeta | null {
    const { scenes, allScenes } = resolveScene(config.data, sceneRef);
    if (scenes.length === 0) return null;

    const sceneName = scenes[0]!.name;
    const storyId = StoryMeta._deriveStoryIdFromScene(allScenes, sceneName);

    const storyDir = resolve(config.data, 'stories', storyId);
    mkdirSync(storyDir, { recursive: true });

    const metaPath = resolve(storyDir, 'meta.yml');

    let meta: StoryMetaData = {};
    if (existsSync(metaPath)) {
      const content = readFileSync(metaPath, 'utf-8');
      meta = (parseYaml(content) as StoryMetaData) ?? {};
    }

    if (metaSeed?.reference !== undefined) {
      meta.reference = metaSeed.reference;
    }
    if (metaSeed?.elements !== undefined) {
      meta.elements = metaSeed.elements;
    }

    writeFileSync(metaPath, dumpYaml(meta, { lineWidth: -1 }), 'utf-8');

    return StoryMeta.load(config, storyId);
  }

  // -------------------------------------------------------------------------
  // Serialization
  // -------------------------------------------------------------------------

  toJSON(): StoryMetaJSON {
    const reference = this._meta.reference ?? null;
    const referenceDir = reference ? `references/${reference}` : null;
    const elements = (this._meta.elements ?? []).map((e) => ({
      id: e.id,
      selector: e.selector ?? '',
    }));
    return {
      storyId: this.storyId,
      section: this.section,
      storyDir: this.storyDir,
      reference,
      referenceDir,
      elements,
    };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Derive a storyId that matches how Storybook indexes scenes.
   * Storybook uses: title = `${group}/Scenes`, exportName = PascalCase(sceneName).
   * The canonical storyId is `sanitize(title)--sanitize(exportName)`.
   */
  private static _deriveStoryIdFromScene(allScenes: { group?: string; id?: string }, sceneName: string): string {
    const group = allScenes.group;
    if (group) {
      const title = `${group}/Scenes`;
      const exportName = buildExportName(sceneName);
      return toStoryId(title, exportName);
    }
    const prefix = allScenes.id ?? 'unknown';
    return `${sanitize(prefix)}--${sanitize(sceneName)}`;
  }

  private static _deriveSection(storyId: string): string {
    const idx = storyId.indexOf('--');
    return idx > 0 ? storyId.substring(0, idx) : storyId;
  }
}
