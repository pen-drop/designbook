---
trigger:
  domain: [data-model]
filter:
  backend: drupal
---

# Rule: How a Scene Block Is Typed — and When It Cannot Be

## Which node this rule types

The core screen-scene constraints already decide **which** node is a block: a screen scene names
exactly one route-bearing **main content** (an entity or a View), and **every other node in the
page `content` slot is a block** — beiwerk beside the main content. This rule does the *Drupal*
half: it types each of those block nodes. It never re-decides which node is the main content; the
main content is never a block.

The type is read **from the data model** — never from a per-node judgement and never from a family
hint. The data model is the source; the scene points at what it declares.

## The decision

For each block node beside the main content:

- Its bundle is a **`block_content` bundle** → **`block_content`** (a content block: a bundle with
  fields, editorially maintained).
- The data model carries a **`block_plugin` entry** for it → **`block_plugin`** (a plugin
  placement: a `views_block` — e.g. a View rendered beside the main content — an exposed-filter
  block, a user-login block, a placed content block, or any contrib/custom block plugin).
- It is a **component node** (`component:`) with no block backing → **no separate block**: an
  inline component in the page's layout/`page_layout` config.

## `suggests` stays a hint

The `component_by_family` suggestions in `block_plugin.md` are a discovery signal only. They never
decide the block type, and an explicit data-model declaration always wins. A family hint is not a
substitute for the declaration.

## An undeterminable block is reported, not guessed

A beiwerk **entity** node (`entity: <type>.<bundle>`) becomes a block only through the data model:
its bundle is a `block_content` bundle, or a `block_plugin` entry names it. If **neither** types it,
the block is undeterminable — the run **reports the node and stops for that unit** rather than
guessing (silently choosing a content vs. plugin block). The fix is to make the data model declare
how that entity becomes a block; the source, not the sync, decides. Guessing here would let two runs
over one scene produce different config.
