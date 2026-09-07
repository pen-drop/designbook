---
name: website-capture-observations
trigger:
  steps: [observe-website]
filter:
  extensions: [website]
---

# Observe the selected website source

Use available browser tools to inspect the selected URL and exact native CSS
locators. Execute the selected states and viewport dimensions, confirming the
intended subject content before capturing each screenshot. Existing extraction
and browser capture CLI tools are source-access accelerators; their raw dumps are
staging inputs, not the shared extract. Translate actual nodes, measured values,
asset identities and observed interactions into the shared schema. Preserve native
CSS locators on observed nodes. Download required image and non-system font files
into the declared capture asset outputs. PNG assets and screenshots use
`capture-image`; fonts, SVG and JPEG assets use `capture-file` with their real
format extensions. Preserve each downloaded file's format and extension: renaming
a PNG to a generic extension to bypass image validation is invalid evidence. Record unavailable required observations
explicitly; a nonzero selector count alone does not establish subject identity.

## Prepare bounded observations before publication

Build each selected subject/view/state sample from the relevant observed hierarchy,
layout, typography, content, interactions and exact dependencies. Keep browser DOM
exports, complete computed-style maps and stylesheets in separate on-disk staging
files; use them to derive the observations rather than embedding their full payload
in a package field. Preserve the measured values needed to reproduce the selected
subject. Component architecture and target markup remain the planner's decisions.

Check the projected package sizes, including shared dependencies, against the
[bounded observation contract](../../designbook/design/resources/reference-packages.md)
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

Use the browser tool's element capture or a clip based on those observed bounds.
A full viewport is appropriate only when the selected subject or its actual
state overlay occupies that area. Opening a header menu alone does not justify
including unrelated main content beneath it. Inspect the resulting image before
submitting it: the selected subject, requested state and relevant overlay must be
visible, and the capture association and recorded dimensions must describe that
image. A missing subject or state is a capture failure, not a full-page fallback.
