---
name: website-capture-observations
trigger:
  steps: [observe-website]
---

# Observe the selected website source

Explore the selected URL with `_debo reference save --reference <revision-dir>
--url <url> [--breakpoints sm,xl]`. Stdout is the catalogue JSON (landmarks,
interactive, forms, images, fonts). The command writes the source dump into the
revision directory.

Capture each selected subject/view/state with `_debo reference capture-image
--reference <revision-dir> --path <view>--<subject>--<state>.png --url <url>
--selector <css-locator> --width <px> [--steps <json>] [--consent-selector
<sel>]`. Empty selector is the full page. `--steps` reaches a non-rest state.
Dismiss consent through `--consent-selector` before the shot. Confirm the
intended subject in the image via `_debo reference image --reference
<revision-dir> --path <png>` plus visual inspection.

Native CSS locators stay on observed nodes. Font identities are `@font-face`
family names, or the first unquoted CSS family token. Download required image
files and each non-system font's `@font-face` `src` binaries into the declared
capture asset outputs. PNG assets and screenshots use `capture-image`; fonts,
SVG and JPEG assets use `capture-file` with their real format extensions.
Preserve each downloaded file's format and extension. Record unavailable
required observations explicitly; a nonzero selector count alone does not
establish subject identity.

## Prepare bounded observations before publication

The CLI projects observations from the dump, `meta.yml` and PNG files. Author
`meta.yml` with the selected subjects, locators, views and states. Check
projected package sizes with `reference query` after publication against the
[bounded observation contract](../resources/reference-packages.md). If a
selected sample is too large, refine the observed projection while preserving
the fixed selected scope. If that scope must be split, create a new extraction
definition rather than changing a running one.

## Capture the selected subject and state

Frame each screenshot around the selected subject and the visible elements that
belong to its current state. For a menu, search panel or dialog rendered outside
the subject's DOM subtree, identify the associated overlay explicitly and include
its visible bounds with the subject. Preserve the real layout, clipping and
occlusion in the source; unrelated page sections are not additional capture scope.

`reference capture-image` isolates the selector at the view width. Choose the
selector so the subject and any associated overlay are in that capture. A full
page (empty selector) is appropriate only when the selected subject or its
actual state overlay occupies that area. Opening a header menu alone does not
justify including unrelated main content beneath it. Inspect the resulting
image: the selected subject, requested state and relevant overlay must be
visible. A missing subject or state is a capture failure, not a full-page
fallback.
