import type { ParamResolver, ResolverContext, ResolverResult } from './types.js';

function toKebab(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Storybook sanitises a section scene's story title `Designbook/Sections/<Name>/Scenes`
// into the id `designbook-sections-<name>-scenes` (plus `--<variant>`); the design-system
// shell becomes `designbook-design-system-scenes`. The `story_id` resolver returns these
// sanitised ids (no slashes), so reverse them back to the section id here.
const SECTION_STORY_ID = /^designbook-sections-(.+?)-scenes$/;
const DESIGN_SYSTEM_STORY_ID = /^designbook-design-system-scenes$/;

function normaliseToSectionId(input: string): { id: string } | null {
  const [withoutVariant = input] = input.split('--');

  // Sanitised Storybook story id (no path separators).
  if (!withoutVariant.includes('/')) {
    if (DESIGN_SYSTEM_STORY_ID.test(withoutVariant)) {
      return { id: 'shell' };
    }
    const storyMatch = SECTION_STORY_ID.exec(withoutVariant);
    if (storyMatch?.[1]) {
      return { id: storyMatch[1] };
    }
  }

  const segments = withoutVariant
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  // Storybook story-id shape: at least two segments ("Group/Path").
  if (segments.length >= 2) {
    if (segments[0] === 'Designbook' && segments[1] === 'Design System') {
      return { id: 'shell' };
    }
    // The `?? ''` fallbacks satisfy TS `noUncheckedIndexedAccess`; the preceding
    // length checks guarantee the indexed access is safe at runtime.
    const last = segments[segments.length - 1] ?? '';
    const id = toKebab(last);
    return id ? { id } : null;
  }

  // Single-segment: treat as a direct id ("shell" or a kebab section id).
  const first = segments[0] ?? '';
  if (first === 'shell') {
    return { id: 'shell' };
  }
  const id = toKebab(first);
  return id ? { id } : null;
}

export const scenePathResolver: ParamResolver = {
  name: 'scene_path',

  resolve(input: string, _config: Record<string, unknown>, _context: ResolverContext): ResolverResult {
    if (!input || !input.trim()) {
      return { resolved: false, input, error: 'scene id is required' };
    }

    const normalised = normaliseToSectionId(input);
    if (!normalised) {
      return { resolved: false, input, error: `cannot derive scene path from: ${input}` };
    }

    if (normalised.id === 'shell') {
      return { resolved: true, value: 'design-system/design-system.scenes.yml', input };
    }

    return {
      resolved: true,
      value: `sections/${normalised.id}/${normalised.id}.section.scenes.yml`,
      input,
    };
  },
};
