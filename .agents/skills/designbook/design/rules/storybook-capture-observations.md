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

One dump records one state. Explore each story iframe with `_debo reference
save --reference <revision-dir> --url <story-url> --state <name> --session
anonymous [--steps <json>]`; stdout is the catalogue JSON and the command writes
`extract--<state>.json`. A rendered story has no stored session, so every state
is observed as `anonymous`.

Capture each selected subject/view/state with `_debo reference capture-image
--reference <revision-dir> --path <view>--<subject>--<state>.png --url
<story-url> --selector <css-locator> --width <px> --session anonymous
[--steps <json>]`. The full
story subject uses selector `#storybook-root`, not an empty selector and not a
viewport shot of the Storybook chrome. `--steps` reaches a non-rest state.
Confirm the intended subject via `_debo reference image` plus visual
inspection.

Preserve native CSS locators. Submit the shared observation shape with the role
selected by intake: `actual` when verifying a design implementation, or
`reference` when checking a backend render against Storybook. Node IDs always
describe the observed Storybook DOM. Record explicit subject/view/state
correspondences in the verification plan. Font identities are `@font-face`
family names, or the first unquoted CSS family token; the catalogue's
`font_faces` carries their binary URLs. Download required image files and each
non-system font's binaries into the declared capture asset outputs with
`_debo reference capture-file --reference <revision-dir> --path
assets/<basename> --url <absolute-http-url> --session anonymous`. Screenshots
use `capture-image`.
Record unavailable required observations explicitly; a nonzero selector count
alone does not establish subject identity.

The CLI projects observations from the per-state dumps, `meta.yml` and PNG
files; `meta.yml` carries each state's session. Check projected package sizes
with `reference query` after publication against the [bounded observation
contract](../resources/reference-packages.md).

## Read the extract, not the story

`_debo reference inspect --reference <revision-dir> --state <name> --locator
<css>` resolves one locator against an unpublished dump and reports its subtree,
contained images and font families. Confirm every selected locator in each
selected state before freezing the capture block: `subject.found` is true and
the returned subject and subtree establish the intended identity. Follow the
[intake resolution sequence](../../skills/extract-reference/resources/intake.md)
when a correction changes the revision directory. `playwright-cli` covers one purpose here — diagnosing
a capture that produced nothing — and that use is named with its purpose in the
intake.

## Capture the selected subject and state

`reference capture-image` isolates the selector at the view width. Choose
the selector so the subject and any associated overlay are in that capture.
Inspect the resulting image: the selected subject, requested state and relevant
overlay must be visible. A missing subject or state is a capture failure, not
a full-page fallback.
