import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { StorybookDaemon } from '../storybook.js';
import { fetchJson } from '../storybook.js';
import type { ResolverResult } from './types.js';

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

  // Substring match (case-insensitive)
  const lowerInput = input.toLowerCase();
  const matches = storyIds.filter((id) => id.toLowerCase().includes(lowerInput));

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
 * Verify that a story ID is present in Storybook's live /index.json.
 * Returns `null` on success; returns a failure ResolverResult on any error.
 *
 * The daemon must already report `running: true` with a port — callers should
 * check daemon.status() first so they can return the more specific
 * "Storybook is not running" error.
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
        error: `Story "${storyId}" is not in Storybook's /index.json — restart with "_debo storybook start --force" or check designbook/storybook.log for compilation errors`,
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
