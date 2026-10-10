# Astra version

`intro.mp4`: 15.000 seconds, 1280 × 720, H.264, 30 fps, 450 frames, no audio stream.

The film uses genuine screenshots from the running Designbook Storybook at `http://localhost:37541`. No product DOM or fixture records were changed. `boxes.json` records actual Playwright bounding boxes for every highlighted component, sidebar entry, mapping item and data-model row.

- 0–2.4 s: website-only framing pulls back to reveal Storybook.
- 2.4–5.7 s: `saas-hero`, `saas-button`, and `saas-pricing-card` pulse together with their actual sidebar entries. The complete website capture scrolls within the measured iframe rectangle; components are never extracted or rearranged.
- 5–8 s: camera pushes toward the Free pricing card, then visibly switches to the separate `Entities / node / Pricing Plan / card` story. This is a story switch: the Canvas page contains inline components, not pricing entity references.
- 8–12.2 s: the actual Structure panel opens; a light path follows the entity to its resolved pricing-card component, then emphasizes `price` and `slot: price`.
- 12.2–14 s: Foundation’s actual Data Model → Pricing plan detail comes into view; the camera focuses the `field_price` row.
- 14–15 s: completely static hold with the field highlighted. No title cards, agent logs or full-screen flashes.

The fixture mapping `node.pricing_plan.card.jsonata` reads `field_price` and maps it to the `price` slot via `$replace(field_price, "$", "&#36;")`. Structure currently displays resolved slot names as its Data Source labels, so the video truthfully shows `price` there. The final actual model row shows `field_price`, type `string`, title `Price`, required, with its currency example description.

## Reproduce

From the repository root, with the existing Playwright integration dependency and system ffmpeg installed:

```sh
node docs/media/intro-video/astra/render.mjs
```

The renderer serves its own directory on a temporary loopback port, reads only relative screenshot/metadata paths, renders deterministic frames, and writes `intro.mp4`, `poster.png`, and six review frames. It asserts no browser script errors, all images decoded, the four real screenshot scenes exist, and pixel-identical output at 14 and 14.9 seconds. Rendering does not require Storybook to be running.

`capture.mjs` records the real UI and bounding boxes when the original fixture Storybook is available. The screenshot captures are already included; they are the fixed reproducible render input. `frames/` currently contains frames extracted from the final encoded MP4 at 0, 4, 7, 10, 13 and 14.5 seconds.

## Verification

- ffprobe: exactly 15.000000 seconds, 450 frames, 30/1 fps, H.264, 1280 × 720; no audio stream.
- Full ffmpeg decode completed without errors.
- Visually inspected encoded frames at 0, 4, 7, 10, 13 and 14.5 seconds: genuine website, visible component sidebar, standalone pricing entity, Structure mapping, real data model, readable final `field_price` detail.
- Renderer’s deterministic final-second image equality assertion passed.
- Node syntax checks passed for renderer and capture script.

Skipped repository-wide `pnpm check`: only this isolated media variant was added; no application code or commit was made. Risk: recapturing depends on the original fixture and Storybook UI version; rendering the included screenshots is self-contained.
