import type { ParamResolver, ResolverContext, ResolverResult } from './types.js';
import { StorybookDaemon } from '../storybook.js';
import { storyIdResolver } from './story-id.js';

export const storyUrlResolver: ParamResolver = {
  name: 'story_url',

  async resolve(
    input: string,
    config: Record<string, unknown>,
    context: ResolverContext,
  ): Promise<ResolverResult> {
    const idResult = await storyIdResolver.resolve(input, config, context);
    if (!idResult.resolved || !idResult.value) return idResult;

    const daemon = new StorybookDaemon(context.config.data);
    const url = daemon.iframeUrl(idResult.value);
    if (!url) {
      return {
        resolved: false,
        input: idResult.value,
        error: 'Storybook URL unavailable — daemon reports running but has no port',
      };
    }

    return { resolved: true, value: url, input };
  },
};
