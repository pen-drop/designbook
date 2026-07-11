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
 * Idempotency: the engine re-runs param resolvers on every stage transition,
 * seeding `input` from the param's current value — which, on reruns, is this
 * resolver's own previous output (a URL). An input that is already an http(s)
 * URL therefore passes through unchanged so the command is not re-run.
 */
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

    const cmd = command.replaceAll('{config_id}', input);

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
