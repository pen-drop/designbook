---
name: designbook:design:config-type-entity-view-display
trigger:
  domain: config-verify
---

# Config Type: entity_view_display

The `entity_view_display` config-type mapping for `config-verify`. Backend-neutral: it states
how the config identifies its story and comparison subject; the concrete backend selector and
render command are supplied by the backend integration, never here.

## Config identity

An `entity_view_display` config is identified by `<entity_type>.<bundle>.<view_mode>` (e.g.
`node.article.default`). Those three segments are the mapping key.

## Story mapping (reference side)

The config maps to the Storybook **entity story** for the same `<entity_type>`, `<bundle>`,
and `<view_mode>` — the story whose comparison subject id is
`entity-<entity_type>-<bundle>-<view_mode>`. That story's render is the frozen reference
baseline. When `story_id` resolution does not land on that story, the config does not map to
an existing story and the run cannot proceed — surface it rather than comparing against an
unrelated story.

## Comparison subject and selectors

The comparison subject is the single rendered entity — one `Element` whose `id` is
`entity-<entity_type>-<bundle>-<view_mode>`.

- **reference (Storybook) side** — `reference_selector` is `#storybook-root`: the story
  renders the entity in isolation, so the isolated story root is the subject.
- **candidate (backend) side** — `selector` isolates the same single entity subtree in the
  backend render (which is a full page containing site chrome around the entity). The concrete
  selector is supplied by the backend integration; when it matches nothing the capture falls
  back to full-page, which will diff against the isolated baseline and surface as a deviation.

The two sides isolate the same subject with different selectors so the screenshots share
dimensions and the diff measures the entity render, not the surrounding page chrome.
