# Designbook explainer film

The landing page film is a silent, 60-second English explainer: 1920 × 1080, 30 fps,
H.264. It follows the recipe project from an empty Designbook to a mapped Storybook
screen. All Storybook pictures are real captures from the `drupal-recipe` fixture.
The final Drupal Canvas page is an **illustration** and carries a visible
`Illustration` tag. The film is an edited explanation, not a recording of elapsed
build time.

| Time | Chapter title | Picture | Chat prompt |
|---|---|---|---|
| 0–5 s | — | Logo with "another design tool"; "NOT" drops in front of it | — |
| 5–15 s | Explain your vision | Empty Vision page, then the real vision. The source word rotates Figma → Stitch → URL and locks on Figma | `I want to migrate my project. The design is in Figma.` |
| 15–23 s | Data model | Empty Data Model page, then the recipe graph builds node by node | `Build the data model based on the screen.` |
| 23–30 s | Tokens | Empty Tokens page, then a wipe reveals the real token page | `Build the tokens based on the screen.` |
| 30–36 s | Import your screen | A scan line passes the Figma reference; five regions light up | `Design the recipe screen and show the result.` |
| 36–49 s | Import your screen | Sidebar rows and screen areas appear together, with outline and connector | — |
| 49–56 s | Sync to Drupal | Drupal Canvas page mockup with an `Illustration` tag | `Sync the recipe screen to Drupal.` |
| 56–60 s | — | End card "NOT another design tool." | — |

## Sources

- `film.html` — deterministic timeline; `window.setTime(t)` is a pure function of `t`.
- `render.mjs` — asserts the timeline, renders 1800 frames and encodes the MP4 and
  poster into `docs/assets/logo/demo/`.
- `capture-empty.mjs` — captures the real empty states into `screenshots/`.
- `reference-regions.json` — scan highlight boxes in `reference.png` pixels.
- Recipe captures and the measured row/area pairs are read from
  `docs/media/intro-video/recipe/` (`screenshots/`, `pairs.json`), not copied.

## Rebuild

Run from the repository root with dependencies installed, a Playwright Chromium
browser and `ffmpeg` on PATH. The empty states need a reference-stage workspace:

```bash
./scripts/setup-workspace.sh drupal-recipe --into /tmp/designbook-empty
./scripts/setup-test.sh drupal-recipe 02-vision --into /tmp/designbook-empty
(cd /tmp/designbook-empty/web/themes/custom/test_integration_drupal && npx storybook-addon-designbook storybook start --force)
STORYBOOK_URL=http://localhost:<port> node website/scripts/demo/capture-empty.mjs

node website/scripts/demo/render.mjs
ffprobe -v error -show_entries format=duration:stream=width,height,codec_type -of compact docs/assets/logo/demo/designbook-demo.mp4
ffmpeg -v error -i docs/assets/logo/demo/designbook-demo.mp4 -f null -
pnpm --filter website build
```

## Rights

- All Storybook captures come from this repository's `drupal-recipe` fixture.
- The Designbook logo is the project's own.
- No third-party logos. Tool names (Figma, Stitch) appear only as plain text in the
  chat prompt. No fonts beyond those the site already ships.
- The reference frame comes from the Figma Community file
  [[FREE] Cooking & Recipes Blog Template](https://www.figma.com/community/file/1331351586208563684/free-cooking-recipes-blog-template)
  by Ilia Bortnikov (@88design), duplicated as file `jNxa1mBeUyh2eoAQrjcvhd`.
  The community page states: "Licensed under CC BY 4.0"
  ([licence](https://creativecommons.org/licenses/by/4.0/)), verified 2026-10-13.
  CC BY 4.0 requires attribution; the landing page credits the template below the film.
- The Drupal Canvas shot is an illustration, not a capture of a running Drupal site.
