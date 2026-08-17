---
name: designbook:design:sync-verify-subject-mapping
trigger:
  domain: sync-verify
---

# Sync-Verify Subject Mapping

How a `sync-verify` story maps to its Storybook reference story and its comparison subject,
per `kind`. Backend-neutral: this states which subjects are compared and each side's
selector; the concrete backend selector, preview route, and render command are supplied by
the backend integration, never here.

## kind inference (story group → kind)

`kind` is inferred from the story's Storybook group:

- `Entities/*` ⇒ **`config`** — an isolated single render.
- `Designbook/Sections/*/Scenes` or `Designbook/Design System` ⇒ **`scene`** — a whole page.

`view`/`shell` stories are also scene-kind (whole-page renders); the dispatch accepts them
without special-casing (their fixtures are out of scope). When inference is ambiguous or the
resolved `story_id` does not land on a story of the inferred kind, surface it rather than
comparing against an unrelated story.

## `kind: config` — isolated single render

The subject is a single rendered entity — one `Element` whose `id` is
`entity-<entity_type>-<bundle>-<view_mode>`. The config maps to the Storybook **entity
story** for the same `<entity_type>`, `<bundle>`, `<view_mode>` (subject id
`entity-<entity_type>-<bundle>-<view_mode>`); that story's render is the reference.

The presence of a `selector` selects the sub-mode:

### config-entity (selector present)

- **reference (Storybook) side** — `reference_selector` is `#storybook-root`: the story
  renders the entity in isolation.
- **candidate (backend) side** — `selector` isolates the same single entity subtree in the
  backend render (a full canonical page containing site chrome around the entity). The
  concrete selector is supplied by the backend integration; when it matches nothing the
  capture falls back to full-page, which will diff against the isolated baseline and surface
  as a deviation.

### entity-view-mapping (selector empty)

- **candidate (backend) side** — the designbook module's **preview route** renders the
  single entity in the view mode in isolation, so no isolation selector is needed: leave
  `selector` empty. The backend integration supplies the preview-route URL as the render
  command.
- **reference (Storybook) side** — `reference_selector` is `#storybook-root`: the isolated
  entity story.

Both sub-modes isolate the same subject so the screenshots share dimensions and the diff
measures the entity render, not surrounding page chrome.

## `kind: scene` — whole page, full-page capture

The subject is the whole page — one `Element` whose `id` is `scene-<scene_id>`. The scene
story maps through the same `story_id` resolver (`sources: [scenes]`); the candidate is the
**real URL of the page that `sync-to` synced** for that scene (never a preview route, never
an isolated entity render).

- **No isolation selector on either side.** Leave both `selector` and `reference_selector`
  empty so the candidate is captured **full-page** and compared against the scene story,
  which renders the same whole page (shell, header, content, footer). The empty-selector
  full-page path already exists in capture.
