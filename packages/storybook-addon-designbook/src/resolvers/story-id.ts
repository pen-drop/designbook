import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ParamResolver, ResolverContext, ResolverResult } from './types.js';

/**
 * List story IDs by reading directory names from `<dataDir>/stories/`.
 */
function listStoryIds(dataDir: string): string[] {
  const storiesDir = join(dataDir, 'stories');
  if (!existsSync(storiesDir)) return [];
  return readdirSync(storiesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

export const storyIdResolver: ParamResolver = {
  name: 'story_id',

  resolve(
    input: string,
    _config: Record<string, unknown>,
    context: ResolverContext,
  ): ResolverResult {
    if (!input) {
      return {
        resolved: false,
        input,
        error: 'Empty story_id input',
      };
    }

    const storyIds = listStoryIds(context.config.data);

    // Exact match
    if (storyIds.includes(input)) {
      return { resolved: true, value: input, input };
    }

    // Substring match (case-insensitive)
    const lowerInput = input.toLowerCase();
    const matches = storyIds.filter((id) =>
      id.toLowerCase().includes(lowerInput),
    );

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

    // Multiple matches — ambiguous
    const candidates = matches
      .sort()
      .map((id) => ({ label: id, value: id, source: 'story' }));

    return {
      resolved: false,
      input,
      error: `Ambiguous story_id "${input}" — ${matches.length} matches`,
      candidates,
    };
  },
};
