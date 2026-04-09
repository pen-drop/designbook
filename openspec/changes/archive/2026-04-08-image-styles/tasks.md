## 1. Built-in Component System

- [x] 1.1 Create `built-in-components.ts` module in `src/renderer/` exporting a registry (`Record<string, ComponentModule>`) with `designbook:placeholder` render function
- [x] 1.2 Update `csf-prep.ts` to check `componentId.startsWith('designbook:')` and emit inline render functions from the built-in registry instead of calling `resolveImportPath`
- [x] 1.3 Add unit tests for built-in component resolution in csf-prep (verify no external import generated, verify inline render function emitted)
- [x] 1.4 Add unit test that `designbook:placeholder` renders visible HTML with message prop

## 2. Image Style Definition

- [x] 2.1 Extend `DataModel` type in `src/renderer/types.ts` with optional `image_styles` field (record of style name → `{ aspect_ratio: string, breakpoints?: Record<string, { width: number, aspect_ratio?: string }> }`)
- [x] 2.2 Add `parseAspectRatio(ratio: string): { w: number, h: number }` utility function with validation (rejects non `W:H` format)
- [x] 2.3 Add unit tests for aspect ratio parsing (valid formats, invalid formats)

## 3. Image Provider

- [x] 3.1 Create `src/renderer/image-providers/` directory with provider interface type (`(width: number, height: number) => string`)
- [x] 3.2 Implement `picsum` provider: returns `https://picsum.photos/id/{randomId}/{width}/{height}`
- [x] 3.3 Add `createProvider(config)` factory function that returns the matching provider function based on `config.image_provider.type` (default: picsum)
- [x] 3.4 Add unit tests for picsum provider (URL format, varying IDs)

## 4. Image Style Builder

- [x] 4.1 Extend `BuildContext` in `types.ts` with optional `config` field
- [x] 4.2 Load designbook config in `scene-module-builder.ts` and pass it into `BuildContext`
- [x] 4.3 Create `src/renderer/builders/image-style-builder.ts` implementing `SceneNodeBuilder` — `appliesTo` matches `type: "image"`, `build` resolves image style + provider
- [x] 4.4 Register `imageStyleBuilder` in `scene-module-builder.ts` alongside existing built-in builders
- [x] 4.5 Add unit tests: builder matches/rejects correct node types
- [x] 4.6 Add unit tests: provider mode (no src) — outputs `designbook:image` ComponentNode with sources array and fallback
- [x] 4.7 Add unit tests: CSS mode (with src) — outputs `designbook:image` ComponentNode with style props
- [x] 4.8 Add unit test: unknown image style → `designbook:placeholder` with error message

## 5. designbook:image Built-in Component

- [x] 5.1 Add `designbook:image` to the built-in component registry — render function handling both provider mode (`<picture>`) and CSS mode (`<img>` with inline styles)
- [x] 5.2 Implement responsive CSS style rendering (scoped `<style>` block with media queries for CSS mode)
- [x] 5.3 Add unit tests: picture element output with multiple sources
- [x] 5.4 Add unit tests: single img with CSS aspect-ratio
- [x] 5.5 Add unit tests: responsive CSS style block output

## 6. Image Provider Configuration

- [x] 6.1 Add `image_provider` key support to designbook config loading (default `{ type: "picsum" }`)
- [x] 6.2 Add `DESIGNBOOK_IMAGE_PROVIDER` to the environment helper output if applicable

## 7. Sample Data Rule Update

- [x] 7.1 Update `.agents/skills/designbook-drupal/sample-data/rules/image.md` — output `{ alt, src? }` objects instead of `<img>` HTML tags
- [x] 7.2 Remove dimension/hint-based aspect ratio logic from the sample data rule (aspect ratios are now in image styles, not in data)

## 8. Verification

- [x] 8.1 Run `./scripts/setup-workspace.sh drupal` from the worktree root to create a test workspace
- [x] 8.2 Run `pnpm run dev` inside the workspace and verify image rendering in Storybook
- [x] 8.3 Run `pnpm check` to verify typecheck, lint, and all tests pass
