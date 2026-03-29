## Why

Design workflows (design-shell, design-screen, design-component) create Storybook scenes but have no automated visual validation. The existing `design-test` workflow is a separate manual step that users must remember to run. Visual comparison should run automatically as a `test` stage after every design workflow — but only when a design reference exists in the scene file.

## What Changes

- Add `test: [visual-diff]` stage to design-shell, design-screen, and design-component workflows
- Create a shared `visual-diff` task in `designbook/design/tasks/` that handles: Storybook screenshots, reference resolution delegation, context collection (scene definition + design tokens + guidelines), and AI visual comparison
- Reference resolution is delegated based on `scene.reference.type` — the core task reads the type and loads the corresponding `resolve-reference` task from the provider skill (e.g. `designbook-stitch`)
- Create `designbook-stitch` skill with `resolve-reference` and `list-screens` tasks
- Extend `guidelines.yml` schema with `visual_diff` config (viewports, defaults)
- Extend `_debo screenshot` CLI to output structured metadata alongside PNGs
- Remove the standalone `design-test` workflow (replaced by inline test stage)

## Capabilities

### New Capabilities
- `visual-diff-task`: Shared visual-diff task that screenshots Storybook scenes, resolves references via provider skills, collects design context (tokens, scene definition, guidelines), and performs AI visual comparison with structured reporting
- `stitch-reference-provider`: designbook-stitch skill providing reference image resolution and screen listing via Stitch MCP
- `screenshot-metadata`: Enhanced screenshot CLI output with structured metadata (scene definition, design tokens summary, component list) for richer AI comparison context

### Modified Capabilities
- `css-generate-stages`: Workflow stage declarations — design-* workflows gain a `test` stage with `visual-diff` step
- `optional-workflow-steps`: Test stage skip behavior — visual-diff skips when no reference exists in the scene

## Impact

- **Skills**: New `designbook-stitch` skill directory; modified `designbook/design/` tasks and workflows
- **CLI**: `screenshot.ts` extended with metadata output
- **Schema**: `guidelines.yml` gains `visual_diff` section; `scenes.yml` reference types formalized
- **Workflows**: design-shell, design-screen, design-component gain test stage; design-test workflow removed
