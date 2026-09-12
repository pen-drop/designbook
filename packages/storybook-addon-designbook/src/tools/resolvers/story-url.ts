import type { ParamResolver, ResolverContext, ResolverResult } from './types.js';
import { resolveRunningIndexedStory } from './story-match.js';

export const storyUrlResolver: ParamResolver = {
  name: 'story_url',

  async resolve(input: string, _config: Record<string, unknown>, context: ResolverContext): Promise<ResolverResult> {
    const outcome = await resolveRunningIndexedStory(input, context.config);
    if (!outcome.ok) return outcome.result;

    // verifyStoryIndexed already confirmed the daemon has a port.
    const url = outcome.daemon.iframeUrl(outcome.storyId)!;
    return { resolved: true, value: url, input };
  },
};
