import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { StorybookDaemon, fetchJson } from '../storybook.js';
import { StoryMeta } from '../story-entity.js';
import type { DesignbookConfig } from '../config.js';
import type { ResolverResult } from './types.js';

export type StoryResolution =
  | { ok: true; storyId: string; daemon: StorybookDaemon }
  | { ok: false; result: ResolverResult };

/**
 * List story IDs by reading directory names from `<dataDir>/stories/`.
 */
export function listStoryIds(dataDir: string): string[] {
  const storiesDir = join(dataDir, 'stories');
  if (!existsSync(storiesDir)) return [];
  return readdirSync(storiesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/**
 * Split a story query into lowercase search terms; a candidate story id matches when it
 * contains EVERY term as a substring. A scene ref uses `:` (`group:name`): every part must be
 * a substring, otherwise every story sharing a scene name would match. A term-less input
 * (`shell`, `landing`) stays a single substring — unchanged behaviour.
 */
function searchTerms(input: string): string[] {
  const lower = input.toLowerCase();
  return input.includes(':') ? lower.split(':').filter(Boolean) : [lower];
}

/**
 * Reconstruct the Storybook entity-story id for a backend view-display config id.
 *
 * A config id is exactly `<entity_type>.<bundle>.<view_mode>`; its entity story lives under
 * the group `Entities/<entity_type>/<bundle>` with story name `<view_mode>`, which Storybook
 * sanitises to `entities-<entity_type>-<bundle>--<view_mode>` (lowercase, each non-alphanumeric
 * run → `-`). Reconstructing that id and matching it EXACTLY is what disambiguates sibling
 * bundles whose machine name is a prefix of another — `paragraph.signage.full` must map to
 * `entities-paragraph-signage--full`, never also to `entities-paragraph-signage-item--full`
 * (a per-term substring match collides on `signage` ⊂ `signage-item`).
 *
 * Returns null for anything that is not a 3-segment dotted id (scene ids, `group:name` refs,
 * already-sanitised story ids), so those keep the term-matching path unchanged.
 */
function configIdToStoryId(input: string): string | null {
  const parts = input.split('.');
  if (parts.length !== 3 || parts.some((p) => p === '')) return null;
  const sanitize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  const [entityType, bundle, viewMode] = parts.map(sanitize);
  if (!entityType || !bundle || !viewMode) return null;
  return `entities-${entityType}-${bundle}--${viewMode}`;
}

/**
 * Match a user-provided string against the list of story IDs.
 * Returns a ResolverResult whose `value` (when resolved) is the matched story ID.
 */
export function matchStoryId(input: string, dataDir: string): ResolverResult {
  if (!input) {
    return { resolved: false, input, error: 'Empty story input' };
  }

  const storyIds = listStoryIds(dataDir);

  // Exact match
  if (storyIds.includes(input)) {
    return { resolved: true, value: input, input };
  }

  // Backend config id (`<et>.<bundle>.<view_mode>`) → reconstruct the exact entity story id,
  // so sibling bundles (signage vs signage_item) never collide the way a substring match would.
  const configStoryId = configIdToStoryId(input);
  if (configStoryId && storyIds.includes(configStoryId)) {
    return { resolved: true, value: configStoryId, input };
  }

  // Term match (case-insensitive): every term must be a substring of the candidate id.
  const terms = searchTerms(input);
  const matches = storyIds.filter((id) => {
    const lowerId = id.toLowerCase();
    return terms.every((term) => lowerId.includes(term));
  });

  if (matches.length === 1) {
    return { resolved: true, value: matches[0], input };
  }

  if (matches.length === 0) {
    return {
      resolved: false,
      input,
      error: `No story found matching "${input}"`,
      candidates: [],
    };
  }

  const candidates = matches.sort().map((id) => ({ label: id, value: id, source: 'story' }));
  return {
    resolved: false,
    input,
    error: `Ambiguous story "${input}" — ${matches.length} matches`,
    candidates,
  };
}

/**
 * Match input against story IDs from Storybook's live /index.json.
 * When a unique match is found, creates the story directory and meta.yml via loadOrCreate.
 */
async function matchStoryIdFromIndex(
  input: string,
  daemon: StorybookDaemon,
  config: DesignbookConfig,
): Promise<ResolverResult> {
  const origin = daemon.url;
  if (!origin) {
    return {
      resolved: false,
      input,
      error: 'Storybook URL unavailable — daemon reports running but has no port',
    };
  }

  try {
    const index = (await fetchJson(`${origin}/index.json`)) as { entries?: Record<string, unknown> } | null;
    if (!index?.entries) {
      return {
        resolved: false,
        input,
        error: `No story found matching "${input}" in Storybook /index.json`,
        candidates: [],
      };
    }

    const liveIds = Object.keys(index.entries);

    if (liveIds.includes(input)) {
      StoryMeta.loadOrCreate(config, input);
      return { resolved: true, value: input, input };
    }

    // Backend config id (`<et>.<bundle>.<view_mode>`) → reconstruct the exact entity story id
    // and match it precisely, so sibling bundles (signage vs signage_item) never collide.
    const configStoryId = configIdToStoryId(input);
    if (configStoryId && liveIds.includes(configStoryId)) {
      StoryMeta.loadOrCreate(config, configStoryId);
      return { resolved: true, value: configStoryId, input };
    }

    // Build search terms (see searchTerms): every part must be a substring of the matching
    // story id — otherwise every story that merely shares a scene name would match (e.g.
    // "shell" matches both scene and shell-component stories in the live index).
    const terms = searchTerms(input);
    const matches = liveIds.filter((id) => {
      const lowerId = id.toLowerCase();
      return terms.every((term) => lowerId.includes(term));
    });

    if (matches.length === 1) {
      StoryMeta.loadOrCreate(config, matches[0]!);
      return { resolved: true, value: matches[0]!, input };
    }

    if (matches.length === 0) {
      return {
        resolved: false,
        input,
        error: `No story found matching "${input}" in Storybook /index.json`,
        candidates: [],
      };
    }

    const candidates = matches.sort().map((id) => ({ label: id, value: id, source: 'storybook' }));
    return {
      resolved: false,
      input,
      error: `Ambiguous story "${input}" — ${matches.length} matches in /index.json`,
      candidates,
    };
  } catch (err) {
    return {
      resolved: false,
      input,
      error: `Could not reach Storybook /index.json at ${origin}: ${(err as Error).message}`,
    };
  }
}

/**
 * Verify that a story ID is present in Storybook's live /index.json.
 * Returns `null` on success; returns a failure ResolverResult on any error.
 */
export async function verifyStoryIndexed(storyId: string, daemon: StorybookDaemon): Promise<ResolverResult | null> {
  const origin = daemon.url;
  if (!origin) {
    return {
      resolved: false,
      input: storyId,
      error: 'Storybook URL unavailable — daemon reports running but has no port',
    };
  }
  try {
    const index = (await fetchJson(`${origin}/index.json`)) as { entries?: Record<string, unknown> } | null;
    if (!index || typeof index !== 'object' || !index.entries || !(storyId in index.entries)) {
      return {
        resolved: false,
        input: storyId,
        error: `Story "${storyId}" is not in Storybook's /index.json — restart with "npx storybook-addon-designbook storybook start --force" or check designbook/storybook.log for compilation errors`,
      };
    }
    return null;
  } catch (err) {
    return {
      resolved: false,
      input: storyId,
      error: `Could not reach Storybook /index.json at ${origin}: ${(err as Error).message}`,
    };
  }
}

/**
 * Full resolution pipeline: match input → verify Storybook running → verify indexed.
 * Falls back to querying /index.json when the local stories/ directory has no match,
 * implicitly creating the story directory and meta.yml if a unique match is found.
 */
export async function resolveRunningIndexedStory(input: string, config: DesignbookConfig): Promise<StoryResolution> {
  const dataDir = config.data;

  const daemon = new StorybookDaemon(dataDir);
  const status = daemon.status();
  if (!status.running) {
    return {
      ok: false,
      result: {
        resolved: false,
        input,
        error:
          'Storybook is not running — start it with "npx storybook-addon-designbook storybook start" before resolving story_id',
      },
    };
  }

  // Try local stories/ directory first
  const localMatch = matchStoryId(input, dataDir);
  if (localMatch.resolved && typeof localMatch.value === 'string') {
    const indexError = await verifyStoryIndexed(localMatch.value, daemon);
    if (indexError) return { ok: false, result: indexError };
    return { ok: true, storyId: localMatch.value, daemon };
  }

  // Ambiguous local match — return candidates without querying live index
  if (localMatch.candidates && localMatch.candidates.length > 0) {
    return { ok: false, result: localMatch };
  }

  // Fallback: query live /index.json and implicitly create story entity if found
  const liveMatch = await matchStoryIdFromIndex(input, daemon, config);
  if (!liveMatch.resolved || typeof liveMatch.value !== 'string') {
    return { ok: false, result: liveMatch };
  }

  return { ok: true, storyId: liveMatch.value, daemon };
}
