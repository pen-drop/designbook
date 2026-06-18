import type { DesignbookConfig } from '../config.js';

export interface Candidate {
  label: string;
  value: string;
  source: string;
}

export interface ResolverResult {
  resolved: boolean;
  value?: string | unknown[] | Record<string, unknown> | undefined;
  input: string;
  error?: string;
  candidates?: Candidate[];
}

export interface ResolverContext {
  config: DesignbookConfig;
  params: Record<string, unknown>;
}

export interface ParamResolver {
  name: string;
  /**
   * When `false`, this is a producer resolver: it generates its value from the
   * environment (e.g. the live Storybook index) rather than transforming an
   * input, so the registry runs it even when no input value and no `from:`
   * dependency are present. Defaults to `true` (skip when there is no input).
   */
  requiresInput?: boolean;
  resolve(
    input: string,
    config: Record<string, unknown>,
    context: ResolverContext,
  ): ResolverResult | Promise<ResolverResult>;
}
