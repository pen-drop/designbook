import type { ParamResolver, ResolverContext, ResolverResult } from './types.js';
import { resolveRunningIndexedStory } from './story-match.js';

export const storyIdResolver: ParamResolver = {
  name: 'story_id',

  async resolve(input: string, _config: Record<string, unknown>, context: ResolverContext): Promise<ResolverResult> {
    const outcome = await resolveRunningIndexedStory(input, context.config.data);
    if (!outcome.ok) return outcome.result;
    return { resolved: true, value: outcome.storyId, input };
  },
};
