## Context

Design workflows produce Storybook scenes from `*.scenes.yml` files. Each scene can carry a `reference` block. The project uses a plugin architecture: `designbook` core defines workflows and tasks, extension skills contribute rules.

Breakpoints are already defined in `design-tokens.yml` as the `breakpoints` token group (e.g. sm: 640px, md: 768px, lg: 1024px, xl: 1280px). Screenshots should use these breakpoints for responsive comparison.

The existing `_debo screenshot` CLI command wraps Playwright CLI with scene-to-storyId resolution logic. The Playwright call itself is a single `execSync`. The resolution logic (scene ref → scenes.yml → Storybook index → story ID → iframe URL) is the valuable part.

## Goals / Non-Goals

**Goals:**
- Test stage runs automatically after every design workflow
- Core tasks handle screenshots (Playwright), URL/image references, AI comparison, and fix loops
- Extension skills contribute only rules — no tasks in extensions
- Screenshots at all breakpoints from design-tokens.yml
- References per breakpoint in scene schema
- `type: url` references are screenshotted at all breakpoints (for rebuilding existing websites)

**Non-Goals:**
- Figma support (future extension skill)
- Pixel-level diff (future enhancement)
- Bidirectional Stitch sync (separate change)

## Decisions

### Decision 1: Four core tasks, extensions contribute rules only

```
designbook/design/tasks/
  screenshot.md         → Playwright screenshots at all breakpoints
  resolve-reference.md  → URL/image direct, reads rules for special types
  visual-compare.md     → AI comparison with all collected context
  polish.md             → Fix loop: fix → re-screenshot → re-compare

designbook-stitch/rules/
  stitch-reference.md   → "For type stitch: use mcp__stitch__get_screen"
  stitch-intake.md      → "During intake: offer screen selection"

designbook-devtools/rules/
  devtools-context.md   → "Additionally: evaluate_script, take_snapshot, etc."
```

Extension skills never have tasks. Core tasks read matched rules and follow their instructions — same pattern as `generate-jsonata` reading `css-mapping` rules.

### Decision 2: Breakpoints from design-tokens.yml, not guidelines.yml

Screenshot viewports are derived from the `breakpoints` token group in `design-tokens.yml`. No separate viewport configuration needed. The `screenshot` task reads breakpoints and captures one screenshot per breakpoint plus a desktop default (2560x1600).

Optional filter in `guidelines.yml`:
```yaml
visual_diff:
  breakpoints: [sm, xl]  # only these; default: all
```

### Decision 3: Per-breakpoint references in scene schema

The `reference` block in scenes.yml gains a `screens` object mapping breakpoint keys to reference URLs:

```yaml
# Single reference (backward compatible):
reference:
  type: stitch
  url: stitch://project/screen-123

# Per-breakpoint references (keys must match breakpoint names from design-tokens.yml):
reference:
  type: stitch
  screens:
    xl: stitch://project/screen-desktop
    sm: stitch://project/screen-mobile
    md: stitch://project/screen-tablet
```

Fallback: if a breakpoint has no specific reference, use the largest defined breakpoint. If no `screens` object, use `url` for all breakpoints.

### Decision 10: Core intake asks for references when design source is configured

When `guidelines.yml` contains a `design_reference` or `references` entry, the core intake step (in design-shell, design-screen, and design-component workflows) asks the user to provide a reference for each scene or component. This is a core responsibility, not extension-specific.

The intake step:
1. Reads `guidelines.yml` → checks for `design_reference` or `references`
2. If present: asks the user for a reference per scene/component, with optional per-breakpoint `screens` mapping
3. The reference `type` defaults to the type from the guideline's design source (e.g. `design_reference.type`)
4. Extension rules (like stitch-intake) can enhance the selection UX (e.g. listing screens via MCP) but are not required for the question to be asked

If `guidelines.yml` has no design source configured, the intake skips the reference question.

Note: `design_reference` in guidelines should ideally be renamed to something more generic (it can be a website, not just a file) — but that's a separate change to the guidelines spec.

### Decision 8: Component references are framework-skill responsibility

Components don't have `*.scenes.yml` files — they're defined in framework-specific formats (e.g. `.component.yml` for Drupal, `.stories.tsx` for React). The reference schema (type, url, title, screens) is identical to scenes, but **where and how** it's stored is determined by the framework skill.

Core defines:
- The semantic reference schema (type, url, title, screens with breakpoint mapping)
- The `resolve-reference` task that reads references
- The `design-component:intake` step that asks the user for references

Framework skills contribute rules that:
- **Intake rule**: store the reference in the framework-specific component file format
- **Resolve rule**: read the reference from the framework-specific component file format and return the normalized schema to the core task

```
# Example: Drupal skill stores reference in .component.yml
# (actual storage format is up to the framework skill)
thirdPartySettings:
  designbook:
    reference:
      type: stitch
      screens:
        xl: stitch://project/screen-desktop
        sm: stitch://project/screen-mobile

# Example: React skill might store in .stories.tsx parameters
# parameters: { designbook: { reference: { ... } } }
```

This keeps core generic while each framework skill owns its storage format.

### Decision 4: URL references are screenshotted at breakpoints

When `reference.type` is `url` and the URL is a website (not an image file), the `resolve-reference` task screenshots the URL at each breakpoint using Playwright — identical to how the `screenshot` task screenshots Storybook. This produces matching screenshot pairs for comparison.

```
reference:
  type: url
  url: https://example.com/product     → screenshot at each breakpoint

reference:
  type: url
  url: https://example.com/mockup.png  → fetch image directly (single reference)
```

### Decision 9: Screenshot storage by story ID

Screenshots are stored under `designbook/screenshots/{storyId}/` with separate subdirectories for Storybook captures and resolved references:

```
designbook/screenshots/
  {storyId}/
    storybook/          # Storybook screenshots (actual)
      sm.png
      xl.png
    reference/          # Resolved reference images (expected)
      sm.png
      xl.png
```

- `{storyId}` is the Storybook story ID — works for scenes, components, and variants uniformly
- Breakpoint names from `design-tokens.yml` are used as filenames
- The `screenshot` task writes to `storybook/`, the `resolve-reference` task writes to `reference/`
- The `visual-compare` task reads both directories and matches by breakpoint filename
- Files are overwritten on each run (not versioned)

### Decision 5: _debo resolve-url replaces _debo screenshot

The existing `_debo screenshot` is split:
- `resolveScene()` + `resolveStoryId()` → new `_debo resolve-url` command (core CLI)
- `takeScreenshot()` → deleted (Playwright calls move to task instructions)

`_debo resolve-url --scene design-system:shell` returns the Storybook iframe URL. Tasks call Playwright CLI directly.

### Decision 6: Polish step handles fix loop

The `polish` task reads the visual-compare report. If issues exist, it:
1. Fixes the code (edits components/scenes/CSS)
2. Re-screenshots via Playwright (knows the URL from resolve-url)
3. Re-compares against reference
4. Loops until satisfied or max iterations reached

Polish uses Playwright directly for re-screenshots — no need to re-run the formal screenshot step.

### Decision 7: Remove standalone design-test workflow

`design-test` workflow and `visual-diff--design-test.md` task are removed. Visual comparison is now integrated as test stage in each design workflow.

## Risks / Trade-offs

- **[No breakpoints defined]** → Screenshot task falls back to a single default viewport (2560x1600). Compare still works.
- **[No reference for some breakpoints]** → Falls back to the largest defined breakpoint reference or skips comparison for that breakpoint.
- **[Polish loop divergence]** → Max iteration limit prevents infinite loops. Report shows what was fixed vs. what remains.
- **[URL reference site changes]** → External website may change between runs. Mitigation: screenshots are timestamped, user can re-run.
