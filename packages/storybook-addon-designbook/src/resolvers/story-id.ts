import type { ParamResolver, ResolverContext, ResolverResult } from './types.js';
import { StorybookDaemon } from '../storybook.js';
import { matchStoryId, verifyStoryIndexed } from './story-match.js';

export const storyIdResolver: ParamResolver = {
  name: 'story_id',

  async resolve(
    input: string,
    _config: Record<string, unknown>,
    context: ResolverContext,
  ): Promise<ResolverResult> {
    const match = matchStoryId(input, context.config.data);
    if (!match.resolved || !match.value) {
      return match;
    }

    const daemon = new StorybookDaemon(context.config.data);
    const status = daemon.status();
    if (!status.running) {
      return {
        resolved: false,
        input: match.value,
        error: 'Storybook is not running — start it with "_debo storybook start" before resolving story_id',
      };
    }

    const indexError = await verifyStoryIndexed(match.value, daemon);
    if (indexError) return indexError;

    return match;
  },
};
