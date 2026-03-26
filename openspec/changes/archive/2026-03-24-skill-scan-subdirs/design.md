## Context

`workflow-resolve.ts` is the CLI plan-resolution engine. It scans skill directories to find task files and rule files at workflow-create time. Both `matchRuleFiles` (section 2.3) and `resolveTaskFile` (section 2.1, generic stage path) currently use `readdirSync` on a single directory level — they cannot see files nested in subdirectories.

The Drupal-specific skills (`designbook-data-model-drupal`, `designbook-scenes-drupal`, `designbook-sample-data-drupal`) have started adding rule files that logically belong to template-specific subdirectory groups (e.g., `rules/layout-builder.md`, `rules/canvas.md`). While these are currently flat, the intent is to allow subdirectory organization as rule sets grow.

Node.js `readdirSync` does not recurse; a recursive walk is needed.

## Goals / Non-Goals

**Goals:**
- `matchRuleFiles` uses a single glob from `agentsDir`: `.agents/skills/**/rules/*.md`
- `resolveTaskFile` (generic stage) uses a single glob from `agentsDir`: `.agents/skills/**/tasks/<stage>.md`
- `rules/` and `tasks/` are always leaf containers — nesting happens *above* them, never within
- Named stage resolution (`skill:task`) continues to resolve directly without scanning
- Existing flat structures (`skillRoot/rules/*.md`) remain fully compatible — the glob covers them too

**Non-Goals:**
- Changing `when` condition logic or frontmatter parsing
- Changing the public TypeScript interfaces (`ResolvedTask`, `ResolvedPlan`, etc.)
- Handling symlinks or circular directory structures

## Decisions

### Decision: Replace per-skill iteration with a single glob from `agentsDir`

**Chosen**: Replace the "iterate over skill dirs → find rules/" pattern with a single glob call: `glob('skills/**/rules/*.md', { cwd: agentsDir })` and `glob('skills/**/tasks/<stage>.md', { cwd: agentsDir })`.

**Rationale**: Simpler than a recursive helper — one glob replaces both the outer skill-dir loop and the inner directory scan. The glob engine (Node.js built-in `fs.glob` or equivalent) handles the traversal. `rules/` and `tasks/` are always leaf containers so the pattern is exact: one wildcard segment above them (`**/`) covers any depth of subdirectory structure within a skill.

## Risks / Trade-offs

- **Deeper nesting increases scan time** → Mitigated: skill directories are local and small; performance impact is negligible.
- **Accidental file inclusion** (e.g., `README.md` inside a `rules/` directory) → Mitigation: existing `when` frontmatter filtering handles files without valid conditions. Authors must be aware that all `.md` files directly inside any `rules/` directory are candidates. This is existing behavior for flat structures and is unchanged. Files outside `rules/` or `tasks/` directories are never picked up.

## Migration Plan

- Drop-in replacement: no schema changes, no config changes, no CLI flag changes.
- Existing skill directories with flat `rules/*.md` continue to work identically.
- No migration needed for consumers.
