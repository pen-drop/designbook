## Context

CSS generation currently works via a 3-step workflow: `intake → generate-jsonata → generate-css`. Framework skills (`designbook-css-tailwind`, `designbook-css-daisyui`) provide `tasks/generate-jsonata.md` with hardcoded JSONata templates. The `generate-css.md` task contains hardcoded Google Fonts download logic (Step 5). The workflow resolver picks exactly one task per step (highest specificity wins) and computes `depends_on` from stage ordering.

### Current file ownership

| File | Owner | Problem |
|------|-------|---------|
| `designbook-css-tailwind/tasks/generate-jsonata.md` | Framework skill | Execution logic + JSONata templates hardcoded |
| `designbook-css-tailwind/tasks/create-tokens.md` | Framework skill | OK — stays |
| `designbook-css-daisyui/tasks/generate-jsonata.md` | Framework skill | Same — execution in framework |
| `designbook/css-generate/tasks/generate-css.md` | Orchestrator | Google Fonts download hardcoded in Step 5 |

## Goals / Non-Goals

**Goals:**
- Framework CSS skills contain only declarative rules (naming + css-mapping)
- CSS generation logic lives centrally in `designbook/css-generate`
- Font loading is pluggable via `frameworks.fonts` config + font skill contributing a task
- Multiple skills can contribute tasks to the same workflow step
- Stage ordering defines execution order — no `depends_on`
- Creating a new CSS framework skill requires only rule files

**Non-Goals:**
- Changing the token format or W3C Design Token schema
- Supporting non-CSS output (CSS-in-JS, Tailwind v3 config)
- Adding new font providers (just enabling the pattern)
- Changing the JSONata tooling (`jsonata-w`)

## Decisions

### Decision 1: css-mapping.md as rule convention

Framework skills declare token-group-to-CSS mappings via a rule file named `css-mapping.md`.

**Format:**
```yaml
---
when:
  steps: [generate-jsonata, generate-css]
  frameworks.css: tailwind
---
```

Body contains a `groups:` YAML block:

```yaml
groups:
  color:          { prefix: color,          wrap: "@theme" }
  radius:         { prefix: radius,         wrap: "@theme" }
  shadow:         { prefix: shadow,         wrap: "@theme" }
  layout-width:   { prefix: container,      wrap: "@theme" }
  layout-spacing: { prefix: layout-spacing, wrap: "@theme" }
  typography:     { prefix: font,           wrap: "@theme" }
```

**Why:** Filename convention is simple, rule `when` conditions ensure correct mapping per framework.

### Decision 2: generate-jsonata becomes generic

The `generate-jsonata` task moves from framework skills into `designbook/css-generate/tasks/`. It reads the `css-mapping` rule, iterates token groups, and generates one JSONata template per present token group. No `when` condition — universal.

### Decision 3: Multiple tasks per step

`resolveTaskFile` returns ALL matching task files instead of picking highest specificity. Tasks within the same step run in parallel (same stage = parallel execution).

This enables the font skill to contribute a task to `generate-jsonata` alongside the generic CSS task:

```
generate-jsonata step:
  Task 1: css-generate/tasks/generate-jsonata.md    (when: — universal)
  Task 2: fonts-google/tasks/generate-jsonata.md     (when: frameworks.fonts: google-fonts)
```

Both generate .jsonata templates. Then `generate-css` executes ALL of them.

**Why over separate `generate-fonts` step:** Simpler workflow definition. The font skill is just another contributor to the same step. No special step syntax needed.

**Specificity handling:** When multiple tasks match, ALL run. If a skill wants to OVERRIDE (not ADD), it should use a named step (`skill:step` format) which resolves directly. The generic glob-based resolution always returns all matches.

### Decision 4: Font provider via frameworks.fonts config

```yaml
# designbook.config.yml
frameworks:
  css: tailwind
  fonts: google-fonts
```

Font skills use `when: frameworks.fonts: <provider>`. No config = no font task = no font loading. The font skill reads the `css-mapping` rule to find font-related groups (typography with `prefix: font`), then reads those tokens from `design-tokens.yml`.

### Decision 5: depends_on removed — stages define order

Stages already define execution order. All tasks in step N wait for all tasks in step N-1. Per-task `depends_on` is redundant and removed from `ResolvedTask`.

Impact on `resolveWorkflowPlan`: `computeDependsOn` function removed. The DAG orchestrator uses stage ordering directly.

### Decision 6: Skip steps with no matching tasks

`resolveTaskFile` returns empty array (no matches) instead of throwing. Callers skip that step. Debug log emitted.

**Risk:** Typo in step name silently skips. Mitigated by debug logging.

## Risks / Trade-offs

- **[Multiple tasks: who owns output files?]** → When two tasks for the same step both generate files, they must not collide. Convention: each task generates files with distinct names (e.g. `color.jsonata` vs `google-fonts.jsonata`). No enforcement — skill authors must coordinate.
- **[Silent skip on typos]** → Debug log on skip. Workflow summary shows which steps ran.
- **[DaisyUI `@plugin` syntax]** → The `wrap` field handles this: `wrap: '@plugin "daisyui/theme"'` with optional `meta`.
