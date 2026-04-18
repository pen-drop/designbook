export interface StoryPattern {
  import_path_pattern: RegExp;
  component_name_group: number;
}

/**
 * Default import-path patterns per `frameworks.component` value.
 * Extend this registry when adding support for a new component framework.
 */
export const DEFAULT_STORY_PATTERNS: Record<string, StoryPattern> = {
  sdc: {
    import_path_pattern: /^\.\/components\/([^/]+)\/\1\.component\.yml$/,
    component_name_group: 1,
  },
};

/**
 * Resolve the pattern to use for a given framework.
 * Precedence: user override → default registry → error with remediation.
 */
export function resolveStoryPattern(framework: string, override?: StoryPattern): StoryPattern {
  if (override) return override;
  const fromDefault = DEFAULT_STORY_PATTERNS[framework];
  if (fromDefault) return fromDefault;
  throw new Error(
    `No story filter for frameworks.component=${framework}. ` +
      `Set component.story_filter in designbook.config.yml or use a supported framework.`,
  );
}
