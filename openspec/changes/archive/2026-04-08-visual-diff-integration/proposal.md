## Why

Design workflows (design-shell, design-screen, design-component) create Storybook scenes but have no automated visual validation. The existing `design-test` workflow is a separate manual step that users must remember to run. Visual comparison should run automatically as a `test` stage after every design workflow, using screenshots at all configured breakpoints.

## What Changes

- Add `test: [screenshot, resolve-reference, visual-compare, polish]` stage to design-shell, design-screen, and design-component workflows
- Create core tasks in `designbook/design/tasks/`: `screenshot.md` (Playwright, breakpoints from design-tokens), `resolve-reference.md` (handles URL/image directly, reads rules for special types like Stitch), `visual-compare.md` (AI comparison), `polish.md` (fix loop)
- Reference resolution for special types (Stitch) via rules from extension skills — core handles `url` and `image` types natively (including screenshotting websites at all breakpoints)
- Extension skills contribute only rules, no tasks: `designbook-stitch` (Stitch MCP reference resolution + intake screen selection), `designbook-devtools` (computed styles, DOM, a11y via Chrome DevTools MCP)
- Extend scene schema: `reference.screens` supports per-breakpoint references mapped to breakpoint token keys
- Replace `_debo screenshot` CLI with `_debo resolve-url` (returns Storybook iframe URL)
- Remove standalone `design-test` workflow

## Capabilities

### New Capabilities
- `visual-diff-test-stage`: Core test stage with steps screenshot → resolve-reference → visual-compare → polish. Screenshots at all breakpoints from design-tokens.yml. References per breakpoint. AI comparison with structured reporting. Fix loop in polish step.
- `visual-diff-url-reference`: Core resolve-reference handles `type: url` natively — screenshots websites at all breakpoints via Playwright for side-by-side comparison with Storybook scenes.
- `stitch-reference-provider`: designbook-stitch extension providing rules for Stitch MCP reference resolution and intake screen selection
- `devtools-context-provider`: designbook-devtools extension providing rules for Chrome DevTools MCP context enrichment (computed styles, DOM, a11y, console errors)

### Modified Capabilities
_(none)_

## Impact

- **Skills**: Two new extension skills (designbook-stitch, designbook-devtools — rules only); new core tasks in designbook/design/
- **CLI**: `resolve-url` replaces `screenshot`; `screenshot.ts` deleted
- **Schema**: scenes.yml `reference` gains `screens` object for per-breakpoint references; breakpoints read from design-tokens.yml
- **Workflows**: design-shell, design-screen, design-component gain test stage; design-test workflow removed
