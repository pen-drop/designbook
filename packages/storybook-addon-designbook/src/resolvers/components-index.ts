import type { ParamResolver, ResolverContext, ResolverResult } from './types.js';
import { StorybookDaemon, fetchJson } from '../storybook.js';
import { resolveStoryPattern, type StoryPattern } from '../config/story-patterns.js';

export interface ComponentInventoryEntry {
  /** `<namespace>:<component-name>` — stable component identifier. */
  id: string;
  /** Verbatim `importPath` from Storybook `/index.json`. */
  import_path: string;
  /** First matching story id (stable iteration order). */
  story_id: string;
}

function loadOverride(config: Record<string, unknown>): StoryPattern | undefined {
  const raw = config['component.story_filter.import_path_pattern'];
  const group = config['component.story_filter.component_name_group'];
  if (typeof raw !== 'string') return undefined;
  return {
    import_path_pattern: new RegExp(raw),
    component_name_group: typeof group === 'number' ? group : 1,
  };
}

export const componentsIndexResolver: ParamResolver = {
  name: 'components_index',

  async resolve(_input: string, _config: Record<string, unknown>, context: ResolverContext): Promise<ResolverResult> {
    const config = context.config as unknown as Record<string, unknown>;
    const framework = String(config['frameworks.component'] ?? '');
    const namespace = String(config['component.namespace'] ?? '');

    let pattern: StoryPattern;
    try {
      pattern = resolveStoryPattern(framework, loadOverride(config));
    } catch (err) {
      return { resolved: false, input: '', error: (err as Error).message };
    }

    const daemon = new StorybookDaemon(String(config['data'] ?? ''));
    const status = daemon.status();
    if (!status.running || !daemon.url) {
      return {
        resolved: false,
        input: '',
        error: 'Storybook is not running — start it with "_debo storybook start" before resolving components_index',
      };
    }

    let index: { entries?: Record<string, { importPath?: string; type?: string }> } | null;
    try {
      index = (await fetchJson(`${daemon.url}/index.json`)) as typeof index;
    } catch (err) {
      return {
        resolved: false,
        input: '',
        error: `Could not reach Storybook /index.json at ${daemon.url}: ${(err as Error).message}`,
      };
    }

    const entries = index?.entries ?? {};
    const byComponent = new Map<string, ComponentInventoryEntry>();

    for (const [storyId, entry] of Object.entries(entries)) {
      const importPath = entry?.importPath;
      if (typeof importPath !== 'string') continue;
      const match = importPath.match(pattern.import_path_pattern);
      if (!match) continue;
      const name = match[pattern.component_name_group];
      if (!name) continue;
      const id = `${namespace}:${name}`;
      if (byComponent.has(id)) continue;
      byComponent.set(id, { id, import_path: importPath, story_id: storyId });
    }

    return { resolved: true, input: '', value: Array.from(byComponent.values()) };
  },
};
