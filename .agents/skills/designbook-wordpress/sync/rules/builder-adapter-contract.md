---
trigger:
  steps: [sync-to:intake, sync-to:transform]
filter:
  backend: wordpress
---

# Rule: Builder Adapter Contract

A layout builder (Gutenberg, Elementor, Bricks, …) is a thin adapter over the components the
generated plugin registers. The plugin owns the component list and rendering; an adapter owns
only its editor representation and its storage format.

| ID | Constraint |
|---|---|
| ADAPT-01 | An adapter registers its blocks, widgets or elements from the `designbook/register_components` action's `ComponentRegistry`; it reads component definitions only through `all()` / `get()`. |
| ADAPT-02 | Editor controls derive from each definition's `props` JSON Schema: `enum` → select, `boolean` → toggle, `format: uri` → URL, `string` → text, `number`/`integer` → number; `default` and `required` carry over. |
| ADAPT-03 | Each named slot maps to exactly one nested region (InnerBlocks area, container, child list) labelled with the slot `title`. |
| ADAPT-04 | Frontend output renders through `ComponentRegistry::render($id, $props, $slots)` with the slot regions pre-rendered to HTML, so WordPress and Storybook render the same Twig. |
| ADAPT-05 | A builder is a value of the view-mode `template` / `build_form` axis (`entity_mapping.templates`); its data-mapping blueprint is matched by that value and writes a scene's component tree as one sync unit `layout.<scene>` whose `path` is a PHP seed script run by `backend_cmd.seed_cmd`. The script stores the tree in the builder's own format (Gutenberg block markup in `post_content`, Elementor `_elementor_data`, Bricks `_bricks_page_content_2`) and upserts the page by its `_designbook_id` meta. |
