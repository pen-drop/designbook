---
trigger:
  domain: [data-model]
filter:
  backend: drupal
---

# Rule: How a Scene Block Is Typed — and When It Cannot Be

## Which node this rule types

This rule types the **block** nodes of a page; it never decides which node is the main content.
Which nodes are blocks comes from the scene kind:

- A **screen scene** (built by `design-screen`) names exactly one route-bearing **main content**
  (an entity or a View); **every other node in the `content` slot is a block** (see the core
  screen-scene constraints). The main content is never a block.
- A **page-content scene** synced by `sync-to` (a Layout-Builder / `page_layout` page, where the
  page node is **implicit** — its display carries the blocks) is not gated by the screen-scene
  constraints, so no main-content node is designated. There **every** node in the `content` slot is
  a block placed into the page's sections.

Either way, once a node is a block, its type is read **from the data model** — never from a
per-node judgement and never from a family hint. The data model is the source; the scene points at
what it declares.

## The decision

For each block node, in this order (first match wins, so two runs never diverge):

- The data model carries a **`block_plugin` entry** for it → **`block_plugin`** (a plugin
  placement: a `views_block` — e.g. a View rendered as a block — an exposed-filter block, a
  user-login block, a placed content block, or any contrib/custom block plugin). This wins even
  when a `block_content` bundle also backs it: the bundle *defines* the content once, the
  `block_plugin` entry *places* it (see `block_plugin.md` — content blocks as plugins).
- Otherwise its bundle is a **`block_content` bundle** → **`block_content`** (a content block: a
  bundle with fields, editorially maintained).
- Otherwise it is a **component node** (`component:`) with no block backing → **no separate
  block**: an inline component in the page's layout/`page_layout` config.

**Matching a node to its entry.** A block node names what it renders (a `component:`, or an
`entity: <type>.<bundle>` / `entity: view.<id>` address); it maps to the **one** `block_plugin`
entry (or `block_content` bundle) that places/backs exactly that plugin, component, or view. If the
model offers **no** matching entry, or **more than one**, the block is undeterminable — reported,
not guessed (below). The match is by what the entry places, never by proximity or ordering, so two
runs agree.

## `suggests` stays a hint

The `component_by_family` suggestions in `block_plugin.md` are a discovery signal only. They never
decide the block type, and an explicit data-model declaration always wins. A family hint is not a
substitute for the declaration.

## An undeterminable block is reported, not guessed

An **entity** block node (`entity: <type>.<bundle>`) becomes a block only through the data model: a
`block_plugin` entry names it, or its bundle is a `block_content` bundle. If **neither** types it,
the block is undeterminable — the run **reports the node and stops for that unit** rather than
guessing (silently choosing a content vs. plugin block). The fix is to make the data model declare
how that entity becomes a block; the source, not the sync, decides. Guessing here would let two runs
over one scene produce different config.
