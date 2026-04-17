import type { ParamResolver, ResolverResult, ResolverContext } from './types.js';
import { storyIdResolver } from './story-id.js';
import { storyUrlResolver } from './story-url.js';
import { referenceFolderResolver } from './reference-folder.js';
import { breakpointsResolver } from './breakpoints.js';
import { scenePathResolver } from './scene-path.js';

interface ParamDeclaration {
  type?: string;
  resolve?: string;
  from?: string;
  [key: string]: unknown;
}

export interface ResolveParamsResult {
  allResolved: boolean;
  resolved: Record<string, ResolverResult>;
  unresolved: Record<string, ResolverResult>;
  params: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Registry                                                          */
/* ------------------------------------------------------------------ */

const resolvers = new Map<string, ParamResolver>();

function register(resolver: ParamResolver): void {
  resolvers.set(resolver.name, resolver);
}

register(storyIdResolver);
register(storyUrlResolver);
register(referenceFolderResolver);
register(breakpointsResolver);
register(scenePathResolver);

export const resolverRegistry = {
  get(name: string): ParamResolver | undefined {
    return resolvers.get(name);
  },
  register,
};

/* ------------------------------------------------------------------ */
/*  resolveParams                                                     */
/* ------------------------------------------------------------------ */

export async function resolveParams(
  schema: Record<string, ParamDeclaration>,
  context: ResolverContext,
): Promise<ResolveParamsResult> {
  const resolved: Record<string, ResolverResult> = {};
  const unresolved: Record<string, ResolverResult> = {};
  const outputParams: Record<string, unknown> = { ...context.params };

  // Split into independent (no from:) and dependent (has from:)
  const independent: string[] = [];
  const dependent: string[] = [];

  for (const key of Object.keys(schema)) {
    const decl = schema[key] as ParamDeclaration | undefined;
    if (!decl?.resolve) continue;
    if (decl.from) {
      dependent.push(key);
    } else {
      independent.push(key);
    }
  }

  function buildConfig(decl: ParamDeclaration): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(decl)) {
      if (k === 'type' || k === 'resolve') continue;
      config[k] = v;
    }
    return config;
  }

  async function runResolver(key: string): Promise<void> {
    const decl = schema[key];
    if (!decl?.resolve) return;
    const resolverName = decl.resolve;
    const resolver = resolvers.get(resolverName);
    if (!resolver) {
      unresolved[key] = {
        resolved: false,
        input: '',
        error: `Unknown resolver "${resolverName}"`,
      };
      return;
    }

    const input = outputParams[key];
    // Skip if no input and no from: dependency — nothing to resolve
    if (input === undefined && !decl.from) return;

    let effectiveInput: string;
    if (decl.from) {
      const fromValue = outputParams[decl.from];
      // Skip when both own input and the from-param value are empty
      if ((!input || input === '') && (!fromValue || fromValue === '')) return;
      // When own input is empty, pass the from-param value as input so the resolver
      // can use it directly (e.g. story_url resolver gets scene_id as input)
      effectiveInput =
        input !== undefined && input !== ''
          ? typeof input === 'string'
            ? input
            : String(input)
          : String(fromValue ?? '');
    } else {
      effectiveInput = typeof input === 'string' ? input : '';
    }

    const config = buildConfig(decl);
    const ctx: ResolverContext = {
      ...context,
      params: { ...outputParams },
    };

    const result = await resolver.resolve(effectiveInput, config, ctx);

    if (result.resolved) {
      resolved[key] = result;
      outputParams[key] = result.value;
    } else {
      unresolved[key] = result;
    }
  }

  // Run independent resolvers first
  for (const key of independent) {
    await runResolver(key);
  }

  // Run dependent resolvers (they see updated outputParams)
  for (const key of dependent) {
    await runResolver(key);
  }

  const allResolved = Object.keys(unresolved).length === 0;

  return { allResolved, resolved, unresolved, params: outputParams };
}
