import type { DesignbookConfig } from '../config.js';

export interface Candidate {
  label: string;
  value: string;
  source: string;
}

export interface ResolverResult {
  resolved: boolean;
  value?: string | unknown[];
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
  resolve(
    input: string,
    config: Record<string, unknown>,
    context: ResolverContext,
  ): ResolverResult | Promise<ResolverResult>;
}
