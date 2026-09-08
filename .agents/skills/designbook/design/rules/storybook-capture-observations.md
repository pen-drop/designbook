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

Explore and measure each story iframe with `_debo extract <story-url> --out
<staging-dir>`. Query `observations.json` and `captured.json` on disk. Those
dumps are staging inputs, not the shared extract.

Capture each selected subject/view/state into its declared PNG path with
`_debo capture screenshot --url <story-url> --selector <css-locator> --width
<px> --out <path> [--steps <json>]`. The full story subject uses selector
`#storybook-root`, not an empty selector and not a viewport shot of the
Storybook chrome. `--steps` reaches a non-rest state. Confirm the intended
subject content in the resulting image.

Translate actual nodes, measured values, asset identities and observed
interactions into the shared schema. Preserve native CSS locators. Submit
the shared observation shape with the role selected by intake: `actual`
when verifying a design implementation, or `reference` when checking a
backend render against Storybook. Node IDs always describe the observed
Storybook DOM. Record explicit subject/view/state correspondences in the
verification plan. Record each used font as a `fonts[].family` identity: the
`@font-face` family name, or the first unquoted CSS family token.
`font_families` entries are those same identities. Staging dumps may list
computed CSS stacks; translate them into those identities before publication.
Download required image files and each non-system font's `@font-face` `src`
binaries into the declared capture asset outputs. PNG assets and screenshots
use `capture-image`; fonts, SVG and JPEG assets use `capture-file` with their
real format extensions. Record unavailable required observations explicitly;
a nonzero selector count alone does not establish subject identity.

Keep browser DOM exports in on-disk staging files and derive the shared
observations from them. Check projected package sizes against the
[bounded observation contract](../resources/reference-packages.md)
before submitting.

## Capture the selected subject and state

`_debo capture screenshot` isolates the selector at the view width. Choose
the selector so the subject and any associated overlay are in that capture.
Inspect the resulting image before submitting it: the selected subject,
requested state and relevant overlay must be visible, and the capture
association and recorded dimensions must describe that image. A missing
subject or state is a capture failure, not a full-page fallback.
