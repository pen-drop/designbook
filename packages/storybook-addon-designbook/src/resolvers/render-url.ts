import { execSync } from 'node:child_process';
import type { ParamResolver, ResolverContext, ResolverResult } from './types.js';

/**
 * Resolve the backend render URL for a supplied config id.
 *
 * Backend-neutral: the resolver runs whatever command string the project's
 * designbook config supplies as `renderUrlCommand`, substituting `{config_id}`
 * with the input (e.g. an entity-view-display id), and returns the printed URL.
 * It never mentions any specific backend — the Drupal integration supplies the
 * drush command via config; core adds no backend code.
 *
 * Defensive passthrough: the config-verify workflow seeds this param from the
 * config id (`from: config`), so `input` is normally a config id. Should a caller
 * ever seed it with an already-resolved http(s) URL, pass it through unchanged
 * rather than re-running the command.
 */

// A backend config id is a dotted machine name (e.g. `node.article.default`);
// reject anything outside that shape before interpolating it into a shell command.
const CONFIG_ID_SHAPE = /^[a-z0-9_.]+$/;
// A resolved Storybook story id (e.g. `entities-paragraph-signage--full`); same
// shell-safety guard as the config id before interpolating it into the command.
const STORY_ID_SHAPE = /^[a-z0-9_.-]+$/i;
export const renderUrlResolver: ParamResolver = {
  name: 'render_url',

  resolve(input: string, _config: Record<string, unknown>, context: ResolverContext): ResolverResult {
    if (/^https?:\/\//i.test(input)) {
      return { resolved: true, value: input, input };
    }

    const command = context.config?.renderUrlCommand;
    if (typeof command !== 'string' || command.trim() === '') {
      return {
        resolved: false,
        input,
        error: 'render_url: no render command configured (set `renderUrlCommand` in the designbook config)',
      };
    }

    if (!CONFIG_ID_SHAPE.test(input)) {
      return {
        resolved: false,
        input,
        error: `render_url: config id \`${input}\` has an unexpected shape (allowed: lowercase letters, digits, \`.\`, \`_\`)`,
      };
    }

    let cmd = command.replaceAll('{config_id}', input);

    // Optional `{story_id}` placeholder: lets the backend render URL reuse the SAME
    // story id the reference side already resolved (available on context.params because
    // `story_id` resolves before `render_url`), instead of hardcoding it. Backend-neutral
    // — core only substitutes the token; the project's command decides how to use it.
    if (cmd.includes('{story_id}')) {
      const storyId = context.params?.story_id;
      if (typeof storyId !== 'string' || !STORY_ID_SHAPE.test(storyId)) {
        return {
          resolved: false,
          input,
          error: `render_url: command references {story_id} but no valid story_id is resolved (got ${JSON.stringify(storyId)})`,
        };
      }
      cmd = cmd.replaceAll('{story_id}', storyId);
    }

    let stdout: string;
    try {
      stdout = execSync(cmd, { timeout: 30_000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      return { resolved: false, input, error: `render_url: command failed: ${(err as Error).message}` };
    }

    const url = stdout.trim();
    if (url === '') {
      return { resolved: false, input, error: `render_url: command produced no URL: \`${cmd}\`` };
    }

    return { resolved: true, value: url, input };
  },
};
