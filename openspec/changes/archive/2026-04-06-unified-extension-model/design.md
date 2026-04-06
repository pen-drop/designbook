## Context

The designbook skill system has three artifact types with divergent extension patterns:

- **Tasks**: Resolved 1:1 by filename matching step name. No override mechanism. Extensions must use `when` conditions to provide alternative task files, but only one can match per step.
- **Rules**: Purely additive — all matching rules load. No override or priority.
- **Blueprints**: Deduplicated by `type+name`, highest `priority` wins. This is the only artifact type with a working override mechanism.

The visual comparison pipeline (`screenshot → resolve-reference → visual-compare → polish`) relies on MCP DevTools for browser inspection, which is complex to set up and unreliable. `playwright-cli` is already installed and provides session management, eval, snapshot, and interaction capabilities — but the current architecture cannot support multiple tasks per step needed for the extensible inspect pipeline.

## Goals / Non-Goals

**Goals:**
- Unified extension model: `name`, `as`, `priority`, `when` work identically across tasks, rules, and blueprints
- Multiple tasks per step with priority ordering
- Integration skills can override or extend any artifact without modifying core files
- Namespaced artifact identifiers prevent collisions between skills
- Replace MCP DevTools with playwright-cli for browser inspection
- Simplified visual comparison pipeline: `screenshot → inspect → compare → polish`

**Non-Goals:**
- Alter/middleware patterns (Drupal hook_alter, Express middleware) — too complex, not needed
- Runtime service registry (OSGi) — static resolution at `workflow create` time is sufficient
- Parallel task execution within a step — tasks in the same step run sequentially by priority
- Backward-incompatible changes to existing frontmatter — all new fields are additive

## Decisions

### Decision 1: `name` as universal artifact identity

Every artifact (task, rule, blueprint) has a `name` field in frontmatter following the convention `<skill>:<concern>:<artifact>`.

```yaml
# .agents/skills/designbook/design/tasks/screenshot-reference.md
name: designbook:design:screenshot-reference
```

**Short-name resolution**: Within the same skill, the skill prefix can be omitted. `as: design:screenshot-reference` resolves to `designbook:design:screenshot-reference` when written in a `designbook` skill file.

**Blueprint backward compatibility**: Existing `type: component, name: section` becomes implicit `name: <skill>:blueprints:component/section`. No migration needed — the CLI derives the namespaced name from `type+name` if no explicit `name` is set.

**Alternative considered**: Using filename as implicit name. Rejected because filenames are not globally unique across skills and don't encode the skill namespace.

### Decision 2: `as` for targeted override

Any artifact can declare `as: <name>` to override another artifact. The artifact with the highest `priority` among all providers of the same name wins.

```yaml
# Extension overrides a core task
name: designbook-stitch:design:screenshot-stitch
as: designbook:design:screenshot-reference
priority: 30
```

Resolution rules:
1. Collect all artifacts matching the step's `when` conditions
2. Group by effective name (own `name` for standalone, target `name` for `as` overrides)
3. Within each group, highest `priority` wins
4. Remaining artifacts execute in priority order

**No `as`** = additive (new artifact, runs alongside others).
**With `as`** = override (replaces the named artifact if priority is higher).

**Alternative considered**: Separate `service` field for declaring overridability. Rejected — adds a concept without adding capability. Any named artifact is inherently overridable via `as`.

### Decision 3: Rules become overridable too

Currently rules are always additive. With the unified model, a rule can declare `as` to override another rule. This is useful when an integration needs to replace a core constraint entirely (e.g., a different browser automation approach).

Rules without `as` remain additive (the common case). The `as` mechanism is opt-in.

### Decision 4: `workflow create` resolves multi-task steps

The CLI's task resolution in `workflow create` expands to:

1. For each step, glob all `tasks/*.md` files across all active skills
2. Filter by `when` conditions (same as today)
3. Apply `name`/`as` deduplication (new)
4. Sort by `priority` (new)
5. Store ordered task list per step in `tasks.yml`

The `step_resolved` output in the create response gains a `tasks` array per step instead of a single `task_file`.

### Decision 5: Namespace convention `<skill>:<concern>:<artifact>`

```
designbook:design:screenshot-storybook
│          │      └── artifact name
│          └── concern directory (design, tokens, css-generate, etc.)
│
└── skill directory name
```

This mirrors the filesystem layout: `.agents/skills/<skill>/<concern>/tasks/<artifact>.md`

For skills without concern subdirectories (flat structure), the concern segment is omitted: `designbook-stitch:stitch-inspect`.

### Decision 6: Simplified visual comparison pipeline

The 5-step test pipeline collapses to 4 steps:

| Step | Purpose | Core Tasks | Extension Tasks |
|------|---------|-----------|-----------------|
| `screenshot` | Capture images | `ensure-storybook` (prio 5), `screenshot-storybook` (prio 10), `screenshot-reference` (prio 20, service) | `screenshot-stitch` (as: screenshot-reference, prio 30) |
| `inspect` | Extract structured data | `inspect-storybook` (prio 10) | `inspect-reference` (prio 20), `inspect-stitch` (prio 30) |
| `compare` | AI evaluates all data | `compare` (prio 50) | — |
| `polish` | Fix loop | `polish` (prio 50) | — |

### Decision 7: playwright-cli as browser inspection tool

`playwright-cli` provides session-based browser automation without MCP:

```bash
npx playwright-cli -s=vc open <url>        # Open session
npx playwright-cli -s=vc eval <js>          # Run JS
npx playwright-cli -s=vc snapshot           # DOM tree
npx playwright-cli -s=vc screenshot         # Capture
npx playwright-cli -s=vc click <ref>        # Interact
npx playwright-cli -s=vc close              # Cleanup
```

Sessions persist across Bash calls (`-s=<name>`). The `inspect-storybook` task opens a session, extracts CSS custom properties, computed styles, font loading status, and console errors. The `compare` task can make additional queries against the same session.

Shared rules (`playwright-session`, `screenshot-storage`, `inspect-format`) encode the HOW, tasks declare the WHAT.

## Risks / Trade-offs

- **[Complexity]** Multi-task resolution adds complexity to `workflow create`. → Mitigation: Resolution is purely additive to the existing single-task logic. If no `priority` or `as` fields exist, behavior is identical to today.
- **[Name collisions]** Namespace typos could cause silent override failures. → Mitigation: CLI warns when `as` targets a name that doesn't exist in the resolved set.
- **[playwright-cli stability]** External dependency for browser inspection. → Mitigation: Already installed and tested. The `inspect` step is optional — workflows degrade gracefully without it.
- **[Migration]** Existing blueprints use `type+name` not explicit `name`. → Mitigation: CLI auto-derives namespaced name from `type+name`. No file changes required.

## Open Questions

- Should `workflow create` output a warning when multiple tasks match a step but none declare `priority`? (Execution order would be undefined.)
- Should the `inspect-format` rule define a strict JSON schema for inspect output files, or leave it freeform for flexibility?
