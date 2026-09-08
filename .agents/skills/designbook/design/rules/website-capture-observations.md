---
name: website-capture-observations
trigger:
  steps: [observe-website]
---

# Observe the selected website source

Explore and measure the selected URL with `_debo extract <url> --out <staging-dir>`.
Query `observations.json` and `captured.json` on disk. Those dumps are staging
inputs, not the shared extract.

Capture each selected subject/view/state into its declared PNG path with
`_debo capture screenshot --url <url> --selector <css-locator> --width <px>
--out <path> [--steps <json>] [--consent-selector <sel>]`. Empty selector is
the full page. `--steps` reaches a non-rest state. Dismiss consent through
`--consent-selector` before the shot. Confirm the intended subject content in
the resulting image.

Translate actual nodes, measured values, asset identities and observed
interactions into the shared schema. Preserve native CSS locators on observed
nodes. Record each used font as a `fonts[].family` identity: the `@font-face`
family name, or the first unquoted CSS family token. `font_families` entries
are those same identities. Staging dumps may list computed CSS stacks;
translate them into those identities before publication. Download required
image files and each non-system font's `@font-face` `src` binaries into the
declared capture asset outputs. PNG assets and screenshots use `capture-image`;
fonts, SVG and JPEG assets use `capture-file` with their real format extensions.
Preserve each downloaded file's format and extension: renaming a PNG to a
generic extension to bypass image validation is invalid evidence. Record
unavailable required observations explicitly; a nonzero selector count alone
does not establish subject identity.

## Prepare bounded observations before publication

Build each selected subject/view/state sample from the relevant observed hierarchy,
layout, typography, content, interactions and exact dependencies. Keep browser DOM
exports, complete computed-style maps and stylesheets in separate on-disk staging
files; use them to derive the observations rather than embedding their full payload
in a package field. Preserve the measured values needed to reproduce the selected
subject. Component architecture and target markup remain the planner's decisions.

Check the projected package sizes, including shared dependencies, against the
[bounded observation contract](../resources/reference-packages.md)
while preparing the capture outputs. If a selected sample is too large, refine the
observed projection while preserving the fixed selected scope. If that scope must
be split, create a new extraction definition rather than changing a running one.
Preserve required evidence on disk and retain its source associations; arbitrary
truncation cannot make an incomplete observation usable. Submit the prepared
observations through the declared workflow outputs only after this check.

## Capture the selected subject and state

Frame each screenshot around the selected subject and the visible elements that
belong to its current state. For a menu, search panel or dialog rendered outside
the subject's DOM subtree, identify the associated overlay explicitly and include
its visible bounds with the subject. Preserve the real layout, clipping and
occlusion in the source; unrelated page sections are not additional capture scope.

`_debo capture screenshot` isolates the selector at the view width. Choose the
selector so the subject and any associated overlay are in that capture. A full
page (empty selector) is appropriate only when the selected subject or its
actual state overlay occupies that area. Opening a header menu alone does not
justify including unrelated main content beneath it. Inspect the resulting
image before submitting it: the selected subject, requested state and relevant
overlay must be visible, and the capture association and recorded dimensions
must describe that image. A missing subject or state is a capture failure, not
a full-page fallback.
