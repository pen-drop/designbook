---
type: entity-type
name: block_plugin
priority: 10
trigger:
  domain: data-model
filter:
  backend: drupal
extends:
  DataModel:
    properties:
      config:
        properties:
          block_plugin:
            type: object
            additionalProperties:
              $ref: ../schemas.yml#/BlockPlugin
suggests:
  component_by_family:
    description: >
      Soft per-family starting component for a block_plugin entry. The schema keeps
      `component` required, so the explicit entry always wins over these hints — they
      are a discovery signal only, never merged into validation.
    properties:
      views_block:
        default: block
        description: A view rendered as a block.
      views_exposed_filter_block:
        default: filter
        description: The exposed-filter form of a view's display.
      user_login_block:
        default: login-form
        description: The core user-login form.
      block_content:
        default: block
        description: A reusable content block placed as a plugin.
---

# Entity Type: block_plugin

A `block_plugin` entry is a named plugin-block instance — a block that reaches a page
as a **Block** rather than through a route. It is the home for every plugin block that
has **no** `block_content` backing (`views_block`, `views_exposed_filter_block`,
`user_login_block`, `system_menu_block`, and any contrib/custom block plugin) and it
also accepts a content block referenced by its plugin form (`block_content:<uuid>`). Its
`plugin` ID identifies the Drupal block plugin: it is what the render `component` is
chosen for, and it is the key Drupal resolves the block's own `settings` schema against
when the config is applied to a site.

```yaml
entity_type: block_plugin
section: config
```

The static per-entry shape — the `plugin` ID form, the render `component`, the render
`layout`, and the providing `module` — is the hard contract carried by the `BlockPlugin`
type in this directory's `schemas.yml`, injected into `config.block_plugin` by this
blueprint's `extends:`. Author entries against that type; this body describes only the
surrounding intent, export behaviour, the authoring-time vs. runtime split, dependencies,
and non-goals.

## Authoring-time vs. runtime

The Drupal block-plugin space is open, and Drupal resolves each block's `settings` schema
dynamically per plugin (`block.settings.[%parent.plugin]`). What can be checked while
authoring — without a site — is only the *shape* of an entry; its plugin-specific
`settings` stay free-form here. Everything that needs the actual Drupal install is
deferred to when the modelled config is exported and applied to a live target (the
`config-verify` round-trip), where Drupal's own config schema resolves:

- whether the named `plugin` actually exists on the target,
- whether `settings` matches Drupal's real `block.settings.<plugin>`,
- whether a referenced view carries its exposed-filter block (see Dependencies).

A hand-maintained enumeration of a few plugin families is deliberately **not** used: it
would reject every legitimate contrib/custom plugin and drift from the installed Drupal.

## Render component

Every entry names the SDC that renders the block. The `component_by_family` suggestions
in this blueprint's frontmatter offer a per-family starting point for discovery, but the
entry must still name its own component and that explicit choice always wins — there is
no hidden plugin-to-component lookup at export time.

## Drupal Config Export Pattern

A `block_plugin` entry emits **no** `block.block.*` placement entity of its own. Placement
stays owned by the page that hosts the block:

- On the Canvas path, the `canvas_page` `component_tree` node references the entry.
- On the Layout Builder path, the `layout_builder__layout` tree node references the entry.

The hosting tree node carries the plugin ID and the block settings; the `block_plugin`
entry is the reusable definition those nodes point at by its key. Nothing about the block
is exported twice.

## Dependencies

- **Exposed filters.** A `views_exposed_filter_block:*` entry depends on the view display
  it exposes having its exposed-filter block turned on. That flag lives with the view
  (`views.view.*`) and stays owned there — the entry only declares a dependency on the
  view key, and a `--with-deps` export pulls the referenced view alongside the block. The
  flag is never re-modelled on the block entry.
- **Providing module.** A core-provided plugin (e.g. views, user, block_content, system)
  needs no module entry. A block from a non-core provider must name its providing `module`;
  a non-core plugin left without one is a `config-verify` failure, not a silently empty block.

## Content blocks as plugins

A reusable content block is referenced here by its `block_content:<uuid>` plugin value.
The block-content bundle, its fields, and its view modes stay defined once as content in
`block_content.md` — a `block_plugin` entry never re-declares them, it only points at the
placed block.

## Non-goals

- **Entity form displays are out of scope.** A form that reaches a page through a route
  rather than as a block belongs to `form_modes` (DESIGNBOOK-31), not here.
- **No widget-to-SDC mapping.** A `block_plugin` entry carries no `widgets:` field; the
  widget-to-SDC mapping stays the single responsibility of `components/blueprints/form.md`.
