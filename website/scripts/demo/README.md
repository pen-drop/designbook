# Designbook demo film

Two new 15-second versions and their sources are available in
[Intro video: Astra / Opus](../../../docs/media/intro-video/README.md), following the
[agreed storytelling](../../../docs/media/intro-video/STORYTELLING.md).
The instructions below describe the existing 22-second landing-page film;
selecting its replacement is a separate decision.

The 22-second silent film uses real captures from the Figma SaaS Canvas fixture.
Its animated highlights and connections map semantic design regions without slicing
the source image. Screenshots keep their full aspect ratio. This is explanatory
motion graphics, not a recording of elapsed
build time. The Claude image is a formatted reading view of the real run log.

Media lives in `docs/assets/logo/demo/`, the existing VitePress public asset root.
`film.html` contains the timeline; `render.mjs` captures deterministic frames and
encodes H.264 with fast-start playback. It also captures the poster at 15 seconds.

Rebuild from the repository root with repository/integration dependencies installed,
a Playwright Chromium browser installed and `ffmpeg` on PATH:

```bash
node website/scripts/demo/render.mjs
ffprobe -v error -show_entries format=duration,size docs/assets/logo/demo/designbook-demo.mp4
ffmpeg -v error -i docs/assets/logo/demo/designbook-demo.mp4 -f null -
pnpm --filter website build
```

Source: Figma SaaS Website UI Kit (Community), file ErxLeXHIKYIBLlu0L4HUCY,
hero node 28:1211. The output screenshots use the clean `drupal-figma/saas-canvas`
fixture. To refresh them, rebuild that fixture following its README, navigate to
its Tokens, Foundation → Data Model, and SaaS Demo → Landing / Structure views,
and capture them with the real browser. Never mock the product UI for these shots.
The gallery keeps the full-size captures available for inspection.
