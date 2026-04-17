/**
 * StoryMeta entity — single model for all story-related data.
 *
 * Provides access to story metadata, checks (breakpoint×region verification),
 * and screenshots. Used by both CLI and addon.
 *
 * On-disk format: meta.yml at `stories/{storyId}/meta.yml`
 * Screenshots: `stories/{storyId}/screenshots/{reference|current}/{breakpoint}--{region}.png`
 */

import { resolve, basename } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { load as parseYaml, dump as dumpYaml } from 'js-yaml';
import { glob } from 'glob';
import { withLock } from './workflow-lock.js';
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

export type StoryStatus = 'pass' | 'failing' | 'unchecked';

export interface StoryMetaSummary {
  total: number;
  pass: number;
  fail: number;
  unchecked: number;
  maxDiff: number | null;
  avgDiff: number | null;
  threshold: number;
}

export interface StoryMetaCheckCurrent {
  screenshot: string;
  markup: string;
}

export interface StoryMetaCheckReference {
  screenshot?: string;
  url?: string;
  markup?: string;
  mcp?: string;
  data?: unknown;
}

export interface StoryIssue {
  id?: string;
  source: 'screenshots' | 'extraction';
  severity: 'critical' | 'major';
  description: string;
  label?: string;
  category?: 'typography' | 'layout' | 'media' | 'interactive' | 'decoration';
  property?: string | null;
  expected?: string;
  actual?: string;
  status: 'open' | 'done';
  result?: 'pass' | 'fail' | null;
}

export interface StoryMetaCheck {
  storyId: string;
  type: 'screenshot' | 'markup';
  breakpoint: string;
  region: string;
  selector?: string;
  status?: 'open' | 'done';
  result?: 'pass' | 'fail';
  diff?: number;
  issues?: StoryIssue[];
  threshold: number;
  current: StoryMetaCheckCurrent;
  reference: StoryMetaCheckReference;
}

export interface StoryMetaScreenshot {
  storyId: string;
  breakpoint: string;
  region: string;
  type: 'reference' | 'current';
  path: string;
  url?: string;
}

export interface StoryMetaReference {
  url?: string;
  origin?: string;
  screenId?: string;
  hasMarkup?: boolean;
}

export interface ChecksFilter {
  open?: boolean;
  breakpoints?: string[];
}

export interface ScreenshotsFilter {
  type?: 'reference' | 'current';
  breakpoint?: string;
}

export interface CheckUpdate {
  breakpoint: string;
  region: string;
  status: 'open' | 'done';
  result?: 'pass' | 'fail';
  diff?: number;
}

export interface StoryMetaJSON {
  storyId: string;
  section: string;
  storyDir: string;
  reference: StoryMetaReference;
  status: StoryStatus;
  summary: StoryMetaSummary;
  checks: StoryMetaCheck[];
  screenshots: StoryMetaScreenshot[];
}

// ---------------------------------------------------------------------------
// Internal meta.yml types
// ---------------------------------------------------------------------------

interface MetaRegion {
  selector?: string;
  threshold?: number;
}

interface MetaBreakpoint {
  threshold?: number;
  regions?: Record<string, MetaRegion>;
}

interface MetaCheckResult {
  status: 'open' | 'done';
  result?: 'pass' | 'fail';
  diff?: number;
  issues?: StoryIssue[];
}

interface MetaSummary {
  total: number;
  pass: number;
  fail: number;
  unchecked: number;
  maxDiff: number | null;
  avgDiff: number | null;
  threshold: number;
}

interface MetaSource {
  url?: string;
  origin?: string;
  screenId?: string;
  hasMarkup?: boolean;
}

export interface StoryMetaData {
  reference?: {
    source?: MetaSource;
    breakpoints?: Record<string, MetaBreakpoint>;
    checks?: Record<string, MetaCheckResult>;
    summary?: MetaSummary;
  };
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
  reference: StoryMetaReference;

  private _meta: StoryMetaData;
  private readonly _metaPath: string;
  private _allChecks: StoryMetaCheck[];
  private _allScreenshots: StoryMetaScreenshot[] | null = null;

  private constructor(storyId: string, section: string, storyDir: string, meta: StoryMetaData, metaPath: string) {
    this.storyId = storyId;
    this.section = section;
    this.storyDir = storyDir;
    this._meta = meta;
    this._metaPath = metaPath;
    this.reference = {
      url: meta.reference?.source?.url,
      origin: meta.reference?.source?.origin,
      screenId: meta.reference?.source?.screenId,
      hasMarkup: meta.reference?.source?.hasMarkup,
    };
    this._allChecks = this._buildChecks();
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
   * Create or load a story by scene reference. Creates the story directory if
   * missing, optionally seeds meta.yml with provided data, then runs ensureMeta
   * to derive breakpoints/regions from design tokens.
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

    // Build meta: start from existing or seed, then fill in breakpoints/regions
    let meta: StoryMetaData = {};
    if (existsSync(metaPath)) {
      const content = readFileSync(metaPath, 'utf-8');
      meta = (parseYaml(content) as StoryMetaData) ?? {};
    }

    // Merge seed data (e.g. reference.source from --json)
    if (metaSeed?.reference) {
      if (!meta.reference) meta.reference = {};
      if (metaSeed.reference.source) {
        meta.reference.source = { ...meta.reference.source, ...metaSeed.reference.source };
      }
      if (metaSeed.reference.breakpoints) {
        meta.reference.breakpoints = { ...meta.reference.breakpoints, ...metaSeed.reference.breakpoints };
      }
    }

    // Fill in breakpoints/regions from design tokens if not already present
    if (!meta.reference?.breakpoints || Object.keys(meta.reference.breakpoints).length === 0) {
      const section = StoryMeta._deriveSection(storyId);
      const tmpStory = new StoryMeta(storyId, section, storyDir, meta, metaPath);
      const breakpoints = tmpStory._getBreakpoints(config);
      const regions = tmpStory._deriveRegions(config);

      if (breakpoints.length > 0) {
        if (!meta.reference) meta.reference = {};
        meta.reference.breakpoints = {};
        for (const bp of breakpoints) {
          const regionMap: Record<string, MetaRegion> = {};
          for (const region of regions) {
            regionMap[region.name] = { selector: region.selector };
          }
          meta.reference.breakpoints[bp] = { threshold: 3, regions: regionMap };
        }
      }
    }

    // Write meta.yml
    writeFileSync(metaPath, dumpYaml(meta, { lineWidth: -1 }), 'utf-8');

    // Load the story from disk (now with full meta)
    return StoryMeta.load(config, storyId);
  }

  // -------------------------------------------------------------------------
  // Status & summary
  // -------------------------------------------------------------------------

  get status(): StoryStatus {
    if (this._allChecks.length === 0) return 'unchecked';
    const hasStatus = this._allChecks.some((c) => c.status !== undefined);
    if (!hasStatus) return 'unchecked';
    const allDonePass = this._allChecks.every((c) => c.status === 'done' && c.result === 'pass');
    if (allDonePass) return 'pass';
    return 'failing';
  }

  get summary(): StoryMetaSummary {
    // Use persisted summary from meta.yml if available
    const metaSummary = this._meta.reference?.summary;
    if (metaSummary) return metaSummary;

    // Fall back to computing from in-memory checks
    return this._computeSummary(this._meta);
  }

  // -------------------------------------------------------------------------
  // Checks
  // -------------------------------------------------------------------------

  checks(filter?: ChecksFilter): StoryMetaCheck[] {
    let result = this._allChecks;

    if (filter?.open) {
      result = result.filter((c) => c.status !== 'done');
    }
    if (filter?.breakpoints) {
      const bps = new Set(filter.breakpoints);
      result = result.filter((c) => bps.has(c.breakpoint));
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // Screenshots
  // -------------------------------------------------------------------------

  screenshots(filter?: ScreenshotsFilter): StoryMetaScreenshot[] {
    if (this._allScreenshots === null) {
      this._allScreenshots = this._scanScreenshots();
    }
    let result = this._allScreenshots;

    if (filter?.type) {
      result = result.filter((s) => s.type === filter.type);
    }
    if (filter?.breakpoint) {
      result = result.filter((s) => s.breakpoint === filter.breakpoint);
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  /**
   * Update a check result in meta.yml and recompute summary. Uses file locking.
   */
  updateCheck(update: CheckUpdate): void {
    withLock(this._metaPath, () => {
      let meta: StoryMetaData = {};
      if (existsSync(this._metaPath)) {
        meta = (parseYaml(readFileSync(this._metaPath, 'utf-8')) as StoryMetaData) ?? {};
      }
      if (!meta.reference) return;

      const key = `${update.breakpoint}--${update.region}`;
      if (!meta.reference.checks) meta.reference.checks = {};
      const existing = meta.reference.checks[key];
      const entry: MetaCheckResult = { status: update.status };
      if (update.result != null) entry.result = update.result;
      if (update.diff != null) entry.diff = update.diff;
      // Preserve existing issues when updating check status
      if (existing?.issues?.length) entry.issues = existing.issues;
      meta.reference.checks[key] = entry;

      // Recompute summary from all checks + expected checks from breakpoints
      meta.reference.summary = this._computeSummary(meta);

      mkdirSync(resolve(this.storyDir), { recursive: true });
      writeFileSync(this._metaPath, dumpYaml(meta, { lineWidth: -1 }), 'utf-8');
    });

    // Rebuild in-memory state
    if (existsSync(this._metaPath)) {
      const content = readFileSync(this._metaPath, 'utf-8');
      this._meta = (parseYaml(content) as StoryMetaData) ?? {};
      this._allChecks = this._buildChecks();
    }
  }

  private _reloadMeta(): void {
    if (existsSync(this._metaPath)) {
      const content = readFileSync(this._metaPath, 'utf-8');
      this._meta = (parseYaml(content) as StoryMetaData) ?? {};
      this._allChecks = this._buildChecks();
    }
  }

  private _computeSummary(meta: StoryMetaData): MetaSummary {
    const checks = meta.reference?.checks ?? {};
    const breakpoints = meta.reference?.breakpoints ?? {};

    // Count expected checks from breakpoints (regions + markup if hasMarkup)
    const hasMarkup = meta.reference?.source?.hasMarkup;
    let expectedTotal = 0;
    let defaultThreshold = 3;
    for (const [, bpConfig] of Object.entries(breakpoints)) {
      const regionCount = Object.keys(bpConfig.regions ?? {}).length;
      expectedTotal += regionCount + (hasMarkup ? 1 : 0);
      defaultThreshold = bpConfig.threshold ?? defaultThreshold;
    }

    const entries = Object.values(checks);
    let pass = 0;
    let fail = 0;
    const diffs: number[] = [];

    for (const c of entries) {
      if (c.status === 'done' && c.result === 'pass') pass++;
      else if (c.status === 'done' && c.result === 'fail') fail++;
      if (c.diff != null) diffs.push(c.diff);
    }

    const total = Math.max(expectedTotal, entries.length);
    const unchecked = total - pass - fail;
    const maxDiff = diffs.length > 0 ? Math.max(...diffs) : null;
    const avgDiff = diffs.length > 0 ? Math.round((diffs.reduce((a, b) => a + b, 0) / diffs.length) * 100) / 100 : null;

    return { total, pass, fail, unchecked, maxDiff, avgDiff, threshold: defaultThreshold };
  }

  /**
   * Ensure meta.yml exists. Derives from available context if possible.
   * Returns true if meta was created or already existed, false if no source derivable.
   */
  ensureMeta(config: DesignbookConfig): boolean {
    if (existsSync(this._metaPath)) return true;

    // Try to derive reference source from scene definitions
    const source = this._deriveReferenceSource(config);
    if (!source) return false;

    // Get breakpoints from design-tokens.yml
    const breakpoints = this._getBreakpoints(config);
    if (breakpoints.length === 0) return false;

    // Derive regions from component structure
    const regions = this._deriveRegions(config);

    // Build meta
    const meta: StoryMetaData = {
      reference: {
        source,
        breakpoints: {},
      },
    };

    for (const bp of breakpoints) {
      const regionMap: Record<string, MetaRegion> = {};
      for (const region of regions) {
        regionMap[region.name] = {
          selector: region.selector,
        };
      }
      meta.reference!.breakpoints![bp] = {
        threshold: 3,
        regions: regionMap,
      };
    }

    mkdirSync(this.storyDir, { recursive: true });
    writeFileSync(this._metaPath, dumpYaml(meta, { lineWidth: -1 }), 'utf-8');

    // Reload
    this._meta = meta;
    this._allChecks = this._buildChecks();
    this.reference = {
      url: source.url,
      origin: source.origin,
      screenId: source.screenId,
      hasMarkup: source.hasMarkup,
    };

    return true;
  }

  // -------------------------------------------------------------------------
  // Serialization
  // -------------------------------------------------------------------------

  toJSON(filter?: { checksOpen?: boolean }): StoryMetaJSON {
    const checksFilter: ChecksFilter | undefined = filter?.checksOpen ? { open: true } : undefined;

    return {
      storyId: this.storyId,
      section: this.section,
      storyDir: this.storyDir,
      reference: this.reference,
      status: this.status,
      summary: this.summary,
      checks: this.checks(checksFilter),
      screenshots: this.screenshots(),
    };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private _buildChecks(): StoryMetaCheck[] {
    const checks: StoryMetaCheck[] = [];
    const breakpoints = this._meta.reference?.breakpoints;
    if (!breakpoints) return checks;

    const sourceUrl = this._meta.reference?.source?.url;
    const hasMarkup = this._meta.reference?.source?.hasMarkup;
    const checkResults = this._meta.reference?.checks ?? {};
    const screenshotsDir = resolve(this.storyDir, 'screenshots');

    // Markup checks first (ordered before screenshot checks)
    if (hasMarkup) {
      for (const [bp, bpConfig] of Object.entries(breakpoints)) {
        const bpThreshold = bpConfig.threshold ?? 3;
        const key = `${bp}--markup`;
        const checkResult = checkResults[key];
        checks.push({
          storyId: this.storyId,
          type: 'markup',
          breakpoint: bp,
          region: 'markup',
          status: checkResult?.status,
          result: checkResult?.result,
          diff: checkResult?.diff,
          issues: checkResult?.issues,
          threshold: bpThreshold,
          current: { screenshot: '', markup: '' },
          reference: { url: sourceUrl, markup: sourceUrl },
        });
      }
    }

    // Screenshot checks
    for (const [bp, bpConfig] of Object.entries(breakpoints)) {
      const regions = bpConfig.regions ?? {};
      const bpThreshold = bpConfig.threshold ?? 3;

      for (const [regionName, regionConfig] of Object.entries(regions)) {
        const key = `${bp}--${regionName}`;
        const checkResult = checkResults[key];
        const fileSlug = `${key}.png`;
        const refScreenshot = resolve(screenshotsDir, 'reference', fileSlug);
        const curScreenshot = resolve(screenshotsDir, 'current', fileSlug);

        checks.push({
          storyId: this.storyId,
          type: 'screenshot',
          breakpoint: bp,
          region: regionName,
          selector: regionConfig.selector,
          status: checkResult?.status,
          result: checkResult?.result,
          diff: checkResult?.diff,
          issues: checkResult?.issues,
          threshold: regionConfig.threshold ?? bpThreshold,
          current: {
            screenshot: curScreenshot,
            markup: '',
          },
          reference: {
            screenshot: existsSync(refScreenshot) ? refScreenshot : undefined,
            url: sourceUrl,
            markup: hasMarkup ? sourceUrl : undefined,
          },
        });
      }
    }

    return checks;
  }

  private _scanScreenshots(): StoryMetaScreenshot[] {
    const shots: StoryMetaScreenshot[] = [];
    const screenshotsDir = resolve(this.storyDir, 'screenshots');
    const sourceUrl = this._meta.reference?.source?.url;

    for (const type of ['reference', 'current'] as const) {
      const dir = resolve(screenshotsDir, type);
      if (!existsSync(dir)) continue;

      const files = readdirSync(dir).filter((f) => f.endsWith('.png'));
      for (const file of files) {
        const name = basename(file, '.png');
        const [breakpoint, ...regionParts] = name.split('--');
        const region = regionParts.join('--');
        if (!breakpoint || !region) continue;

        shots.push({
          storyId: this.storyId,
          breakpoint,
          region,
          type,
          path: resolve(dir, file),
          url: type === 'reference' ? sourceUrl : undefined,
        });
      }
    }

    return shots;
  }

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
    // Fallback for scenes files without group (legacy): use id
    const prefix = allScenes.id ?? 'unknown';
    return `${sanitize(prefix)}--${sanitize(sceneName)}`;
  }

  private static _deriveSection(storyId: string): string {
    // storyId format: "group--sceneName" or "group-subgroup--sceneName"
    // section is everything before the last "--"
    const idx = storyId.indexOf('--');
    return idx > 0 ? storyId.substring(0, idx) : storyId;
  }

  private _mergeMeta(seed: Partial<StoryMetaData>): void {
    if (seed.reference) {
      if (!this._meta.reference) this._meta.reference = {};
      if (seed.reference.source) {
        this._meta.reference.source = { ...this._meta.reference.source, ...seed.reference.source };
        this.reference = {
          url: this._meta.reference.source.url,
          origin: this._meta.reference.source.origin,
          screenId: this._meta.reference.source.screenId,
          hasMarkup: this._meta.reference.source.hasMarkup,
        };
      }
      if (seed.reference.breakpoints) {
        this._meta.reference.breakpoints = {
          ...this._meta.reference.breakpoints,
          ...seed.reference.breakpoints,
        };
      }
    }
    // Persist
    writeFileSync(this._metaPath, dumpYaml(this._meta, { lineWidth: -1 }), 'utf-8');
    this._allChecks = this._buildChecks();
  }

  private _deriveReferenceSource(config: DesignbookConfig): MetaSource | null {
    // Look for scene reference in scenes files
    const storiesDir = resolve(config.data, 'stories');
    if (!existsSync(storiesDir)) return null;

    // Try to find the scene definition that created this story
    // by searching scenes.yml files for a matching scene name
    const sceneName = this.storyId.split('--').pop();
    if (!sceneName) return null;

    const sceneFiles = glob.sync(resolve(config.data, '**', '*.scenes.yml'));
    for (const filePath of sceneFiles) {
      const content = readFileSync(filePath, 'utf-8');
      const parsed = parseYaml(content) as {
        scenes?: Array<{ name: string; reference?: { url?: string; type?: string; screens?: Record<string, string> } }>;
      };
      const scenes = parsed.scenes ?? [];
      const scene = scenes.find((s) => s.name === sceneName);
      if (scene?.reference?.url) {
        return {
          url: scene.reference.url,
          origin: scene.reference.type ?? 'manual',
        };
      }
    }

    return null;
  }

  private _getBreakpoints(config: DesignbookConfig): string[] {
    const tokensPath = resolve(config.data, 'design-system', 'design-tokens.yml');
    if (!existsSync(tokensPath)) return [];

    const content = readFileSync(tokensPath, 'utf-8');
    const tokens = parseYaml(content) as {
      breakpoints?: Record<string, unknown>;
      semantic?: { breakpoints?: Record<string, unknown> };
    };

    // Check top-level first, then semantic.breakpoints
    const bpObj = tokens.breakpoints ?? tokens.semantic?.breakpoints;
    if (!bpObj) return [];

    // Filter out DTCG extensions keys ($extensions)
    return Object.keys(bpObj).filter((k) => !k.startsWith('$'));
  }

  private _deriveRegions(_config: DesignbookConfig): Array<{ name: string; selector: string }> {
    // Default: single full-page region. Shell scenes (header/footer) are
    // configured explicitly by the intake task via --create --json.
    return [{ name: 'full', selector: '' }];
  }
}
