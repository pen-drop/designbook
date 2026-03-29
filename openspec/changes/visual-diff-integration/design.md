## Context

Design workflows (design-shell, design-screen, design-component) produce Storybook scenes from `*.scenes.yml` files. Each scene can optionally carry a `reference` block pointing to a design tool screen (Stitch, Figma, URL). The existing `design-test` workflow runs visual-diff as a standalone workflow with `git-worktree` engine — this is separate from the design workflows themselves.

The screenshot CLI (`_debo screenshot --scene X`) uses Playwright CLI (`playwright screenshot`) to capture full-page PNGs at 2560x1600. It outputs JSON with `screenshotPath` but no metadata about the scene content or design tokens.

Provider skills follow the pattern established by `designbook-css-*` skills: framework-specific logic in separate skill directories, loaded by convention based on config values.

## Goals / Non-Goals

**Goals:**
- Visual comparison runs automatically after every design workflow when a reference exists
- Core visual-diff logic (screenshot, compare, report) lives in `designbook` skill — reusable across providers
- Reference resolution delegates to provider skills based on `scene.reference.type`
- Screenshots include structured metadata (scene definition, design tokens, component list) for richer AI context
- `guidelines.yml` configurable: viewports, visual_diff defaults

**Non-Goals:**
- Figma support (future — only Stitch provider for now)
- Pixel-level diff tooling (Playwright API migration needed — separate change)
- Computed CSS styles extraction (requires Playwright API, not CLI — separate change)
- Responsive multi-viewport screenshots (requires CLI changes — separate change, guidelines.yml schema is forward-compatible)

## Decisions

### Decision 1: Shared visual-diff task, not workflow-specific copies

The `visual-diff` task lives at `designbook/design/tasks/visual-diff.md` (no workflow suffix). All three design workflows reference it via `test: [visual-diff]` in their stage declarations.

**Alternative**: Separate `visual-diff--design-shell.md`, `visual-diff--design-screen.md` etc.
**Why rejected**: The logic is identical — screenshot scene, resolve reference, compare. Scene-specific params come from the workflow plan, not the task file.

### Decision 2: Reference type drives provider skill selection

The `visual-diff` task reads `scene.reference.type` from the scene file and loads `resolve-reference` task from `designbook-{type}` skill. For `type: stitch` → `designbook-stitch/tasks/resolve-reference.md`.

**Alternative**: Config in `guidelines.yml` → `design_tool.type` determines provider globally.
**Why rejected**: Per-scene reference type is more flexible (mixed sources possible) and the data already exists in scene files.

**Fallback**: `type: url` is handled by core directly (WebFetch) — no provider skill needed.

### Decision 3: Task-level skip when no reference exists

The `visual-diff` task reads the scene file. If no `reference` block exists, it calls `workflow done` with `status: skipped` and a message. No new skip mechanism needed at the workflow engine level.

**Alternative**: Plan-level skip (don't create visual-diff tasks when no reference detected).
**Why rejected**: References may be added between plan and execution time. Task-level skip is simpler and more resilient.

### Decision 4: Metadata collected as text context, not additional images

The visual-diff task collects scene definition (components used, entities, slots), design tokens summary (colors, fonts, spacing values), and guidelines principles as text. This is passed alongside the screenshot and reference images for AI comparison. Text tokens are negligible cost vs. image tokens.

**Alternative**: Multiple annotated screenshots, overlay grids.
**Why rejected**: Adds complexity and image token cost. Text metadata gives the AI structured data it can reason about more precisely.

### Decision 5: designbook-stitch as new addon skill

Follows the established pattern: `designbook-css-tailwind`, `designbook-css-daisyui`, `designbook-drupal`. New skill at `.agents/skills/designbook-stitch/` with tasks for reference resolution and screen listing.

**Alternative**: Stitch logic inline in core visual-diff task.
**Why rejected**: Violates provider separation. When Figma support is added, the same pattern applies.

### Decision 6: Remove standalone design-test workflow

The `design-test` workflow and its `visual-diff--design-test.md` task file are removed. Visual-diff is now a test stage within each design workflow.

**Alternative**: Keep design-test as a manual re-run option.
**Why rejected**: Users can re-run the test stage of any design workflow. A separate workflow adds confusion about which one to use.

## Risks / Trade-offs

- **[Stitch MCP availability]** → The visual-diff test stage depends on Stitch MCP being configured. If MCP is down or misconfigured, the test stage fails. Mitigation: task-level skip with clear error message, non-blocking for workflow completion.
- **[AI comparison quality]** → Multimodal vision comparison is approximate, not pixel-perfect. Mitigation: structured metadata (exact token values) supplements visual comparison. Pixel-diff is a future enhancement.
- **[design-test removal]** → Users accustomed to `debo design-test` lose that command. Mitigation: clear migration note; visual-diff runs automatically now, which is better UX.
