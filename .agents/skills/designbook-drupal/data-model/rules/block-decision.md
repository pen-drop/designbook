---
trigger:
  domain: [data-model]
filter:
  backend: drupal
---

# Rule: When a Scene Node Becomes a Block — and Which Type

Whether a scene node becomes a Drupal block, and which kind, is decided **from the data model** —
never from a per-node judgement and never from a family hint. The data model is the source; the
scene points at what it declares.

## The decision

For a node the scene places beside or within the page's main content:

- The data model declares a **`block_content` bundle** for it → **`block_content`** (a content
  block: a bundle with fields, editorially maintained).
- The data model carries a **`block_plugin` entry** for it → **`block_plugin`** (a plugin
  placement: a `views_block`, exposed-filter block, user-login block, a placed content block, or
  any contrib/custom block plugin).
- The node has **neither** a `block_content` bundle nor a `block_plugin` entry and sits inline in
  the layout → **no block**: it is an inline component in the page's layout/`page_layout` config.

## `suggests` stays a hint

The `component_by_family` suggestions in `block_plugin.md` are a discovery signal only. They never
decide whether a node is a block or which type it is, and an explicit data-model declaration always
wins. A family hint is not a substitute for the declaration.

## An undeterminable node is reported, not guessed

If a node must be a block (the scene places it as one) but the data model determines **neither**
type — no `block_content` bundle and no `block_plugin` entry — the run **reports the node and
stops for that unit**; it does not pick a type. The fix is to make the data model unambiguous
(declare the bundle or the entry), because the source, not the sync, decides. Guessing a block
type here would let two runs over one scene produce different config.
