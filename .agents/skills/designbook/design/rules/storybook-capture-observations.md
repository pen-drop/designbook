---
name: storybook-capture-observations
trigger:
  steps: [observe-storybook]
---

# Observe the selected storybook source

Use the exact selected story iframe URLs after the required build and index
refresh. Confirm each story exists with `_debo storybook check <story-url>`.
A missing story, error page or unrelated element cannot establish visual
success.

Explore each story iframe with `_debo reference save --reference
<revision-dir> --url <story-url>`. Stdout is the catalogue JSON. The command
writes the source dump into the revision directory.

Capture each selected subject/view/state with `_debo reference capture-image
--reference <revision-dir> --path <view>--<subject>--<state>.png --url
<story-url> --selector <css-locator> --width <px> [--steps <json>]`. The full
story subject uses selector `#storybook-root`, not an empty selector and not a
viewport shot of the Storybook chrome. `--steps` reaches a non-rest state.
Confirm the intended subject via `_debo reference image` plus visual
inspection.

Preserve native CSS locators. Submit the shared observation shape with the role
selected by intake: `actual` when verifying a design implementation, or
`reference` when checking a backend render against Storybook. Node IDs always
describe the observed Storybook DOM. Record explicit subject/view/state
correspondences in the verification plan. Font identities are `@font-face`
family names, or the first unquoted CSS family token. Download required image
files and each non-system font's `@font-face` `src` binaries into the declared
capture asset outputs. PNG assets and screenshots use `capture-image`; fonts,
SVG and JPEG assets use `capture-file` with their real format extensions.
Record unavailable required observations explicitly; a nonzero selector count
alone does not establish subject identity.

The CLI projects observations from the dump, `meta.yml` and PNG files. Check
projected package sizes with `reference query` after publication against the
[bounded observation contract](../resources/reference-packages.md).

## Capture the selected subject and state

`reference capture-image` isolates the selector at the view width. Choose
the selector so the subject and any associated overlay are in that capture.
Inspect the resulting image: the selected subject, requested state and relevant
overlay must be visible. A missing subject or state is a capture failure, not
a full-page fallback.
