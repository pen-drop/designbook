---
trigger:
  steps: [write-component, map-entity, create-sample-data]
  domain: [components, data-mapping, sample-data]
---

# Story and Sample Images Are Local, Committed Assets

A component story or sample-data record renders in a headless preview (Storybook)
with no access to a live backend. An image `src` pointing at a production/staging
URL, a CDN, or a backend-internal file path (e.g. a Drupal `public://` or
`/sites/default/files/…` style path) 404s there, depends on an external host being
reachable, and does not reflect how the real backend actually renders the field.

## The rule

1. **Render path stays the same as production.** A story or sample record still
   emits an ImageNode/EntityNode through the project's normal image-rendering path
   (see the backend integration's own image-field rule). Only the `src` value
   changes for preview purposes — never hardcode an `<img>` tag to work around a
   broken image path.

2. **`src` in a story or sample record is a LOCAL, committed asset.** Download the
   real reference image once into the project's static asset directory (the
   directory the preview server serves at its root), and reference it with a
   root-relative local path. Never an absolute/external URL, never a
   backend-internal storage path, never an invented filename that does not exist
   on disk.

3. **When no real content asset exists yet**, use the project's shared placeholder
   image mechanism instead of inventing a new per-file external URL (a public
   placeholder-image service, a random CDN link, etc.). A project typically already
   has an image-provider fallback for this case — reach for it before adding a new
   external dependency.

## Responsive support with a single downloaded original

- A single downloaded original still supports per-breakpoint aspect-ratio
  responsiveness when the image-rendering path derives it from style/breakpoint
  configuration rather than from the file itself.
- Multi-resolution `srcset` generally requires multiple source files. If a case
  genuinely needs it, download several sizes into the asset directory and build the
  `srcset` explicitly — this is an opt-in extension, not the default expectation for
  every image.

## Checks

| ID | Severity | What to verify | Where |
|---|---|---|---|
| LIMG-01 | error | No image `src` in any story/sample-data file is an absolute/external URL, a CDN link, or a backend-internal storage path | story files, sample-data files |
| LIMG-02 | error | Every image still renders through the project's normal image-rendering node (ImageNode/EntityNode) — no hardcoded `<img>` added to work around a broken path | component markup + mapping |
| LIMG-03 | warning | Story/sample `src` values point at a committed local asset that exists on disk under the preview server's static root | static asset directory |
| LIMG-04 | warning | A missing real content asset uses the project's shared placeholder mechanism rather than a newly invented external URL | story files, sample-data files |
