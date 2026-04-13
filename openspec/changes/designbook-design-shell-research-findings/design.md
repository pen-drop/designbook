## Context

A research audit of 25 skill files revealed four categories of structural problems in the `design-shell` workflow: (1) layout components missing `{% block %}` wrappers cause slot content to silently disappear in Storybook when `{% embed %}` is used; (2) the core `scenes-constraints.md` rule encodes Drupal entity format and Tailwind `@source` reasoning that belong in integration skills; (3) the `compare-markup` stage iterates 6x over scene data to produce one scene-level comparison — redundant with screenshot comparison; (4) tasks lack an inspection step, so rendering failures are only caught late in the workflow. Blueprint files also duplicate constraints already enforced by dedicated rule files, creating maintenance divergence.

Affected skill files: ~15 files across `designbook/`, `designbook-drupal/`, `designbook-css-tailwind/`.

## Goals / Non-Goals

**Goals:**

- Fix slot rendering in layout components by establishing a `{% block %}` wrapping convention enforced in both a rule and blueprints
- Remove domain violations from core rules by splitting `scenes-constraints.md` into core + integration-owned fragments
- Remove the `compare-markup` stage from `design-shell.md` and `design-screen.md`
- Add a mandatory inspection step to `create-component` and `polish` tasks
- Increase atomic component extraction in `intake--design-shell` so buttons, badges, icons, and search fields are identified as components rather than encoded as inline HTML
- Add mandatory Storybook restart to `setup-compare` to ensure compiled state matches generated files
- Rename `outtake--design-screen.md` to `outtake--design.md` to match actual scope
- Remove redundant constraint language from blueprints (`grid.md`, `container.md`, `header.md`)

**Non-Goals:**

- No CLI or addon TypeScript changes
- No new workflow stages — only removal and task-level enrichment
- No changes to the underlying scene YAML format consumed by the Storybook addon
- No redesign of the 4-level skill model itself

## Decisions

### 1. `{% block %}` convention: rule + blueprint, not blueprint alone

The `{% block %}` requirement for layout components (container, section, grid) is enforced in two places: added to `sdc-conventions.md` as a hard rule, and reflected in the container/section blueprints as example markup. Blueprints are overridable starting points — encoding this only in blueprints means a project that swaps the blueprint loses the enforcement. Because `{% embed %}` compatibility depends on `{% block %}` presence, this is a correctness requirement, not a style preference, and belongs in a rule.

Alternative considered: blueprint-only. Rejected because blueprints carry advisory authority, not constraint authority.

### 2. `scenes-constraints.md` split strategy

The core file retains: inline-styles-only requirement, duck-typing format, `$content` variable rules, and format-agnostic `when: always` constraints. Two new integration-owned fragments are created:

- `designbook-drupal/rules/scenes-constraints.md`: entity format, image node representation, listing scene structure. `when: design-shell, design-screen` (Drupal contexts).
- `designbook-css-tailwind/rules/scenes-constraints.md`: rationale for why inline styles are required when Tailwind is active (JIT purging). `when: design-shell, design-screen` (Tailwind contexts).

Each fragment uses `when:` conditions scoped to the workflow stages where it applies. This preserves the single-source-of-truth principle per skill boundary while eliminating domain violations in core.

### 3. Removing `compare-markup` stage

The `compare-markup` stage is removed from `design-shell.md` and `design-screen.md`. Screenshot comparison already catches structural rendering issues. The `each: checks` loop in the current implementation produces 6 iterations for a single scene-level concern, adding latency with no unique signal.

If DOM-level data becomes valuable in the future (e.g., for accessibility or selector-level diffing), it can be introduced as an optional enrichment step inside `compare-screenshots`, not as a standalone stage with its own workflow slot.

### 4. Inspection step in `polish` and `create-component`

Both tasks gain a mandatory "read what exists" phase before any file modifications:

- `create-component`: read existing components that will be embedded or included; check Storybook renders the component after generation before declaring done.
- `polish`: read component files, scene YAML, and open the Storybook URL; only then apply fixes.

This converts a "generate and hope" pattern into a "inspect, then act" pattern. Rendering failures surfaced during inspection are treated as blockers, not post-hoc discoveries.

### 5. Intake component extraction criteria

`intake--design-shell.md` is updated to identify atomic UI elements — button, badge, icon, search field — as components to be created separately rather than encoded as inline HTML in scene `$content`. The container must also be listed as a shell component. Extraction applies when an element meets either condition: (a) it appears 2 or more times across the shell, or (b) it is interactive (receives user input or triggers navigation). Single-use decorative elements remain inline.

This raises the component count per shell but reduces inline HTML complexity in scene files and enables reuse across screens.

### 6. Storybook restart at `setup-compare`

`setup-compare.md` adds `_debo storybook start --force` as a mandatory step before any capture begins. Without this, the Storybook watcher may serve stale compiled output for recently generated or modified components. This is a hard step, not optional, because stale output makes screenshot comparison unreliable.

### 7. Blueprint constraint language cleanup

`grid.md`, `container.md`, and `header.md` blueprints remove `MUST`/`never` constraint language. That language implies authority the blueprint format does not carry — hard constraints belong in rule files (`layout-constraints.md`, `navigation.md`). Blueprints are updated to use advisory language: "recommended", "starting point", "example structure". This removes the maintenance problem of constraints defined in two places with different enforcement weight.

### 8. Outtake rename

`outtake--design-screen.md` is renamed to `outtake--design.md`. The task's actual scope covers design-shell, design-screen, and design-verify exits — the screen-specific name was a historical artifact. All workflow references are updated.

### 9. Title interpolation fix for structured params

`expandParams` in `workflow-resolve.ts` (line 658/664) calls `String(params[paramName])` unconditionally. When the param is an array or object (e.g., `scene` is `[{scene: "design-system:shell", storyId: "..."}]`), `String()` produces `[object Object]`.

Fix: Before calling `String()`, check if the value is an array or object. For arrays of objects with a `scene` or `storyId` field, extract the first element's meaningful string. For other structured values, use `JSON.stringify()` as fallback. This is a targeted fix in one function — no architectural change.

### 10. `component_design_hints` workflow param

During intake, the `extract-reference` rule produces a rich `design-reference.md` with structured sections (Fonts, Color Palette, Layout, Landmark Structure, Interactive Patterns). Currently this data stays in the markdown file and is only available to downstream tasks if they read and parse it.

Add a `design_hint` field to each component item in intake's `--params` output. The hint is scoped to the specific landmark — no global lookup needed:

```json
{
  "component": [
    {
      "component": "header",
      "slots": ["institutional", "logo", "navigation", "actions"],
      "group": "Shell",
      "design_hint": {
        "rows": [{"bg": "#ececec", "height": "60px"}, {"bg": "#fff", "height": "102px"}],
        "fonts": {"nav": "Reef 22px", "cta": "Reef 22px"},
        "interactive": [{"element": "nav_link", "color": "#00336a", "radius": "7px"}]
      }
    }
  ]
}
```

Because the workflow engine merges each component item into the task's params via `each: component` expansion (line 469: `{ ...params, ...item.params }`), `design_hint` is available directly on the create-component task's params — scoped to the correct landmark with no key lookup. Polish tasks access the same data via the global params merge.

## Risks / Trade-offs

**Rule loading from 3 sources after the split.** After splitting `scenes-constraints.md`, agents must load core + the active integration's fragment. If `when:` conditions are misconfigured, constraints silently fail to apply. Mitigation: verify `when:` values against the stage name strings used in workflow definitions (`design-shell`, `design-screen`) before shipping each fragment.

**Removing `compare-markup` removes a triage data source.** The DOM extraction produced by `compare-markup` was available as structured input for the triage task. After removal, triage relies entirely on screenshots. Mitigation: screenshot comparison already covers the same failure modes (missing content, wrong layout, invisible slots). DOM extraction can be re-added as an enrichment step inside `compare-screenshots` if a concrete need arises.

**More aggressive component extraction increases intake scope.** Extracting buttons, badges, and icons as components during intake will produce more components per shell session and may slow intake for simple designs. Mitigation: the 2-or-more / interactive threshold limits extraction to elements with real reuse potential. Single-use decorative elements remain inline.

**Inspection step adds latency to `create-component` and `polish`.** Reading files and checking Storybook before acting adds round-trips. Mitigation: the cost is bounded (one read pass, one browser check) and prevents the more expensive failure mode of generating files that silently break rendering, which requires a full re-run to detect.
