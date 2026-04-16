## Context

The `design-shell` workflow produces a page component (header, content, footer) by running three stages: intake → component → scene. During a `--research` audit, several issues surfaced:

1. **Container build-order failure**: Header, footer, and newsletter embed the container component via `{% embed %}`. Container is an infrastructure component invisible in the design reference — it must be explicitly included and built first. Currently, the intake task has a hardcoded instruction ("container MUST always be included") which doesn't scale and doesn't enforce build order.

2. **Wrong Storybook URL**: Tasks accessed Storybook using `$DESIGNBOOK_URL` from config (a static default), but the actual running instance uses a dynamic port assigned by `_debo storybook start`. The correct URL is only available via `_debo storybook status`.

3. **Stale loading scopes**: Several rules and blueprints are loaded in stages where they're irrelevant, wasting AI context window.

4. **Broken data flow**: The `reference` parameter from intake has no path to the scene creation task.

## Goals / Non-Goals

**Goals:**
- Blueprint `embeds:` field declares embed dependencies in frontmatter — structural, scannable, machine-readable
- Intake tasks auto-resolve embed dependency graph and sort build order (leaves first)
- All Storybook URL access goes through `_debo storybook status`
- Clean loading scopes: rules/blueprints only load where relevant
- `reference` data flows from intake to scene creation

**Non-Goals:**
- CLI code changes (all fixes are in skill files)
- Recursive deep dependency resolution (one level of `embeds:` is sufficient — components don't embed chains)
- Changing the `storybook start` port allocation mechanism
- Changing the workflow engine's task expansion logic

## Decisions

### 1. `embeds:` as blueprint frontmatter field

Add an `embeds:` array to blueprint YAML frontmatter listing component names that this blueprint uses via `{% embed %}`.

```yaml
---
type: component
name: header
embeds:
  - container
when:
  steps: [design-shell:intake]
---
```

**Why over alternatives:**
- **vs. auto-detection from blueprint prose**: Fragile — depends on AI parsing natural language ("Wraps content in a `container` component"). Non-deterministic.
- **vs. hardcoded list in intake task**: Doesn't scale. Each new embedding pattern requires editing the intake task.
- **vs. `requires:` field**: `embeds:` is more specific — it describes the Twig `{% embed %}` relationship, not a generic dependency. This matters because embed creates a template-level coupling (the embedded template must be registered in Twig before the embedder can compile).

### 2. Dependency resolution in intake task text (not CLI)

The intake task instructions describe the resolution algorithm:
1. After proposing visible components, load blueprints for each
2. Collect all `embeds:` entries
3. Add missing components to the plan
4. Sort: components with no embeds first, then dependents

This stays in the task file (Part 1 skill), not in CLI code (Part 2). The workflow engine already passes blueprint frontmatter — the intake task just needs instructions to read it.

**Why:** Avoids CLI changes. The 4-level model says tasks declare WHAT — the dependency resolution is part of "what components to build", not "how to build them".

### 3. `_debo storybook status` as single URL source

Every task and resource that accesses Storybook must call `_debo storybook status` and extract the `url` field from the JSON response. `$DESIGNBOOK_URL` from config is treated as a fallback only when no instance is running.

**Why:** The port is dynamic (auto-detected by `storybook start`). `storybook.json` is the source of truth. Using the config default led to screenshots on wrong ports during the design-shell run.

### 4. Narrow `when.steps` scopes

- `scenes-constraints.md` (drupal): Remove intake steps, keep only `design-shell:create-scene, design-screen:create-scene`
- `section.md`, `grid.md` blueprints: Remove `design-shell:intake` from `when.steps` — shell doesn't produce sections/grids
- These are additive `when.steps` changes, not removals — the files still load where they're needed

### 5. Wire `reference` through scene task params

The `create-scene--design-shell.md` task needs `reference` data to set the `reference:` field on the shell scene in `design-system.scenes.yml`. Currently the intake stores reference info but there's no `params:` path to scene creation.

Fix: The intake emits `reference` as part of its scene result (alongside `scene` name). The scene task's `reads:` already includes vision.md — add `$STORY_DIR/design-reference.md` as a read dependency so the reference URL is available.

## Risks / Trade-offs

- **[Risk] Blueprint authors forget `embeds:`** → Mitigation: The `sdc-conventions.md` rule can mention that any `{% embed %}` usage must have a matching `embeds:` entry in the blueprint frontmatter. Future research audits will catch gaps.
- **[Risk] One-level resolution misses transitive embeds** → Mitigation: In practice, infrastructure components (container) don't themselves embed other components. If this changes, the resolution can be deepened later.
- **[Trade-off] Task-level resolution vs. CLI-level**: Keeping resolution in task text means it depends on AI execution quality. But it avoids Part 2 code changes and is consistent with the 4-level model.
