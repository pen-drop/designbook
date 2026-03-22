## 1. CLI `screenshot` command

- [x] 1.1 Add `screenshot` command to CLI (`cli.ts`) — accepts `--scene <group>:<name>`. Resolves scene file path from identifier. (`--component` deferred to separate change.)
- [x] 1.2 Scene resolution: `--scene design-system:shell` → `design-system/design-system.scenes.yml` → scene `shell`. `--scene galerie:product-detail` → `sections/galerie/galerie.section.scenes.yml` → scene `product-detail`.
- [x] 1.3 ~~Component resolution~~ — deferred to separate change.
- [x] 1.4 Resolve `story_id` from Storybook `index.json` — reuse `findStoriesForFile` logic from `storybook.ts`.
- [x] 1.5 Run Playwright screenshot — `$STORYBOOK_URL/iframe.html?id=<story_id>&viewMode=story`, full-page, viewport 2560x1600, wait 3000ms. Output to `screenshots/<name>.png` next to the source file.
- [x] 1.6 Support omitting name — `--scene galerie` screenshots all scenes.
- [x] 1.7 Add `--reference` flag — read `reference` from source YAML, resolve by type (stitch → MCP download, image → curl), save as `screenshots/<name>.reference.png`. Error if no `reference` field.
- [x] 1.8 Add `--diff` flag (implies `--reference`) — run `odiff` pixel-diff between screenshot and reference, save as `screenshots/<name>.diff.png`. Output JSON to stdout: `{ "mismatch": <percent>, "pixels": <count>, "dimensions": { "storybook": [...], "reference": [...] } }`.
- [x] 1.9 Add `odiff-bin` as dependency to `storybook-addon-designbook`.

## 2. Screenshot directory convention

- [x] 2.1 Screenshots live in `screenshots/` next to the source file. Scenes: `sections/galerie/screenshots/`. Components: `components/header/screenshots/`.
- [x] 2.2 Naming: `<scene-name>.png`, `<scene-name>.reference.png`, `<scene-name>.diff.png`. For components: `<story-name>.png` etc.

## 3. Scene reference field

- [x] 3.1 Update `designbook-design-screen/tasks/intake.md` — after scene names are confirmed, check `guidelines.yml` for `design_file`/`mcp`. If present, call MCP to list screens and ask user to select a reference per scene.
- [x] 3.2 Update `designbook-scenes/tasks/create-section-scene.md` — write `reference` field to scene YAML when present in params.
- [x] 3.3 Update `designbook-scenes/tasks/create-shell-scene.md` — write `reference` field to shell scene YAML when present in params.
- [x] 3.4 Update `designbook-design-shell/tasks/intake.md` — add reference question for shell scene when guidelines have a design source.

## 4. Visual diff uses CLI

- [x] 4.1 Update `designbook-test/tasks/visual-diff.md` — replace manual Playwright + curl calls with `designbook screenshot --scene <group>:<name> --diff`. AI reads the three PNGs + JSON output for comparison report.
- [x] 4.2 Remove `stitch_screen`, `story_id`, and `label` from visual-diff required params.

## 5. Validation

- [x] 5.1 Scene validation already tolerates unknown fields — `reference` passes without errors (verified: existing scene files with `reference` field validate successfully).
