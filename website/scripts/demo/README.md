# Designbook explainer film

The landing page film is a silent, 60-second English explainer: 1920 × 1080, 30 fps,
H.264. It follows the recipe project from an empty Designbook to a mapped Storybook
screen and ends with the request to sync it to Drupal; no Drupal screen is shown. All Storybook
pictures are real captures from the `drupal-recipe` fixture. The film is an edited explanation, not a recording of elapsed
build time.

The approved storyline, scene by scene, is in [STORYLINE.md](STORYLINE.md).

## Sources

- `film.html` — deterministic timeline; `window.setTime(t)` is a pure function of `t`.
- `render.mjs` — asserts the timeline, renders 1800 frames and encodes the MP4 and
  poster into `docs/assets/logo/demo/`.
- `capture.mjs` — captures every Storybook view from a workspace at the matching stage, the
  data model geometry (`screenshots/model-graph.json`) and the sidebar rows of the finished screen
  (`screenshots/tree/`, real order in `screenshots/tree.json`).
- `reference-regions.json` — scan highlight boxes in `reference.png` pixels.
- Recipe captures and the measured row/area pairs are read from
  `docs/media/intro-video/recipe/` (`screenshots/`, `pairs.json`), not copied.

## Rebuild

Run from the repository root with dependencies installed, a Playwright Chromium
browser and `ffmpeg` on PATH. Every chapter is captured from a `drupal-recipe` workspace at the
stage it shows. The unused sections layer is removed so the sidebar holds only the Designbook
folders and, once extracted, the reference:

```bash
ws() { ./scripts/setup-workspace.sh drupal-recipe --into /tmp/db-$1 && ./scripts/setup-test.sh drupal-recipe $2 --into /tmp/db-$1; }
ws start 01-reference        # empty workspace (no reference)
ws vision 03-data-model      # + reference + vision
ws model 04-tokens           # + data model
ws tokens 05-shell           # + tokens
ws final verify-screen       # finished screen
for w in vision model tokens; do rm -rf /tmp/db-$w/web/themes/custom/test_integration_drupal/designbook/sections; done
# in each workspace's web/themes/custom/test_integration_drupal:
npx storybook-addon-designbook storybook start --force

START_URL=http://localhost:<start> node website/scripts/demo/capture.mjs
cp fixtures/drupal-recipe/vision/designbook/vision.yml /tmp/db-start/web/themes/custom/test_integration_drupal/designbook/
VISION_URL=http://localhost:<start> REFERENCE_URL=http://localhost:<vision> MODEL_URL=http://localhost:<model> \
  TOKENS_URL=http://localhost:<tokens> FINAL_URL=http://localhost:<final> node website/scripts/demo/capture.mjs

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
