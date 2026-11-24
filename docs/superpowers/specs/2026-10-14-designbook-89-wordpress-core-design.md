# WordPress integration core (`designbook-wordpress`) — design

Date: 2026-10-14 · Status: confirmed · Epic with builder sub-tickets (Gutenberg, Elementor, Bricks)

## Goal

Designbook supports `backend: wordpress`. Components are written once as plain Twig. Storybook
renders them through Twing, and WordPress renders the same files through Timber. The data model
becomes custom post types, taxonomies, attachments and ACF field groups. Design tokens become
`theme.json`. "Sync to WordPress" **generates code** (a plugin and a theme) instead of importing
config, and a separate seed workflow creates the sample content via WP-CLI in DDEV. Builder
adapters plug into a defined interface. The builders themselves are out of scope here.

## Decisions

| Topic | Decision |
|---|---|
| Cut | One ticket in four phases (P1–P4), each phase independently verifiable |
| Fields | Generate ACF API code (`acf_add_local_field_group`). The target runtime is **Secure Custom Fields** (SCF), which is free and includes repeater and gallery; ACF Pro works too |
| Component framework | New `frameworks.component: twig`, built like `vue`: Designbook stories plus Twig templates rendered by **Twing**. No `storybook-addon-sdc`, and no Drupal `Attribute`/`create_attribute` |
| Twig framework content | Lives in `designbook-wordpress/components/` (`filter: frameworks.component: twig`). The addon-side Twing rendering stays backend-neutral |
| Props/slots | Sidecar file `<name>.schema.yml` next to `<name>.twig` |
| Generated code | Plugin `<ns>-content` holds the content model and the registry; theme `<ns>` holds the presentation and is also the Storybook project |
| Sync | The core `sync-to` workflow is made **backend-neutral**; Drupal specifics move into `designbook-drupal` |
| Sample content | New neutral core workflow `seed-content`; the integration supplies the task |
| Reference fixture | New debo-test suite `wordpress-recipe`, mirroring `drupal-recipe` |

## Out of scope

- Builder implementations (Gutenberg, Elementor, Bricks) and the WordPress **scene branch** of
  `sync-to`, meaning page layouts in a builder's storage format. Those belong to the sub-tickets;
  this ticket defines only their interface.
- Divi, WPBakery, Avada, classic PHP themes, and headless setups (REST/WPGraphQL).
- View modes other than `full` for WordPress entity rendering.
- A Drupal `seed` task (the step stays empty for Drupal).

## Architecture

### Core changes (backend-neutral)

**C1 — Component framework `twig` (addon)**
- `install/schemas.yml`: add `twig` to the `frameworks.component` enum.
- `shared/config/story-patterns.ts`: add `twig` → `^\./components/([^/]+)/\1\.twig$`.
- `addon/preset.ts`: add a `twig` branch next to `vue`, consisting of:
  - an import resolver `ns:name` → `components/<name>/<name>.twig`;
  - a `wrapImport` that renders the template with Twing (props plus pre-rendered slot HTML as
    context);
  - indexing of standalone component stories `components/*/*.story.yml`.
- The default HTML-string built-in components are reused.
- `twing` becomes an optional peer dependency, like `vue`.
- The Twing loader resolves the namespace `<ns>` to `components/`, so `{% include '@<ns>/card/card.twig' %}`
  resolves identically under Twing and Timber.

**C2 — Neutral `sync-to`**
- Workflow title becomes "Sync to backend", and the descriptions drop Drupal vocabulary.
- `ConfigNameUnit` becomes `SyncUnit`:
  - `name` is a unit id, a dot-separated lowercase string;
  - `path` is the output file relative to the sync target directory, with any extension;
  - plus the existing `entity_type`, `bundle`, `field_name`, `config_key`, `def` and `build_form`.
- `config_sync_dir` becomes `sync_target_dir`. Its value comes from `designbook.config.yml`, and
  the Drupal docroot fallback logic leaves `tools/resolvers/config-sync-dir.ts`. The Drupal config
  blueprint supplies the value instead.
- `transform`:
  - result path `{{ sync_target_dir }}/{{ unit.path }}`;
  - `prepare`/`schema_cmd` becomes optional, so a backend without typed-config schemas generates
    from the blueprint alone;
  - a string result is written raw. This already holds in `cli/plan.ts`, so PHP output needs no
    engine change.
- `resolve-filter`:
  - the core states only WHAT: expand the filter into the backend's units, then apply the
    existence filter (`exists_cmd <unit.name>`);
  - the Drupal expansion (`<et>.type.<bundle>`, `field.storage.*`, `field.field.*`, view/form-mode
    units, and the taxonomy/paragraph/image_style exceptions) moves verbatim into a
    `designbook-drupal` rule with `trigger: steps: [sync-to:resolve-filter]` and
    `filter: backend: drupal`.
- `SyncResult` becomes `{ summary, applied, ok (const true) }`. `ExportSummary` becomes neutral
  (`unit_names`, `count`, `presenter_templates`, `uncovered_units`, `page_url`).
- The Drupal `backend_cmd` / `sync_target_dir` values in the `designbook-config` blueprint and in
  the drupal fixtures are updated to the new names. Old artifacts are disposable, so no migration
  code is written.

**C3 — Workflow `seed-content` (core)**
- Inputs: the data model and the sample data (`$DESIGNBOOK_DATA/data/*.yml`), with an optional
  `filter` param.
- One stage with step `seed`. The core declares the step, and an integration task with a backend
  filter supplies it (the precedent is `compile-css`).
- Result `SeedResult`: `{ created, updated, ok }`.

**C4 — Token export step**
- The tokens/css-generate workflow gets a step `export-tokens` that only integrations supply.

**C5 — Filter hygiene**
- Every `designbook-drupal` task/rule/blueprint without a backend or framework filter gets
  `filter: backend: drupal` (backend content) or `filter: frameworks.component: sdc` (SDC
  component content).
- Today these load in any project where the skill is installed. Affected:
  - component blueprints icon, button, link, logo, header, footer, page, pager, form,
    navigation, container, grid, section;
  - data-mapping field-map, canvas, layout-builder, ui-patterns, image-fields, field-cardinality.

**C6 — Test scripts**
- `scripts/setup-workspace.sh` and `scripts/setup-test.sh` get a `wordpress` branch.
- New `scripts/start-wordpress-workspace.sh` (ddev start, DB import, own project name).

### Integration skill `designbook-wordpress`

All content carries `filter: backend: wordpress`; component content carries
`filter: frameworks.component: twig`.

| Area | Content |
|---|---|
| `install/` | `detect-wordpress` rule (`wp-config.php` / `wp-includes/`, or composer `roots/wordpress`); `find-theme`; `designbook-config` blueprint (`backend: wordpress`, `frameworks.component: twig`, `backend_cmd` with `ddev wp …`, `sync_target_dir`); `storybook-setup` blueprint (Twing) |
| `data-model/` | Entity-type blueprints `post` (CPTs plus built-in post/page), `term` (taxonomies), `attachment` (media library). `field-types` blueprint maps to ACF types: text, textarea, wysiwyg, image, gallery, link, relationship, taxonomy, repeater. Rules: post-type key ≤ 20 chars, taxonomy key ≤ 32 chars, no reserved names (`post`, `type`, `author`, …); multi-value fields use repeater/gallery/relationship |
| `components/` | `schemas.yml` (`TwigComponent`, `TwigComponentSchema`, `TwigStory`, `TwigStoryNode`), task `write-component`, rules for plain Twig: one root element, classes as props, no `attributes` object, component refs `ns:name` |
| `sync/` | Unit-expansion rule (data model → `SyncUnit`s) and one blueprint per unit kind |
| `tokens/` | Task `export-tokens` → `theme.json` |
| `seed/` | Task `seed` via WP-CLI. Idempotent through a `_designbook_id` post/term meta: an existing record is updated, never duplicated |
| `shell/` | Rule: header and footer are template parts that render the shell components |

#### Component shape

```
components/card/
├── card.twig                 plain Twig; renders under Twing (Storybook) and Timber (WordPress)
├── card.schema.yml           props (JSON Schema) and named slots
└── card.default.story.yml    Designbook story
```

```yaml
# card.schema.yml
name: Card
props:
  type: object
  properties:
    title:   { type: string, title: Title }
    variant: { type: string, enum: [default, featured], default: default }
    href:    { type: string, format: uri }
  required: [title]
slots:
  media:   { title: Media }
  content: { title: Content }
```

#### Generated code

```
wp-content/plugins/<ns>-content/
├── <ns>-content.php                  plugin header; loads the files below
├── composer.json                     requires timber/timber
├── post-types/<bundle>.php           register_post_type()
├── taxonomies/<bundle>.php           register_taxonomy()
├── fields/<bundle>.php               acf_add_local_field_group()
└── src/ComponentRegistry.php         adapter interface

wp-content/themes/<ns>/               also the Storybook project
├── style.css, functions.php          theme header; Timber init; Twig namespace <ns> → components/
├── theme.json                        from design tokens
├── components/<name>/…               see "Component shape"
├── views/single-<bundle>.twig        post fields → component props (from the entity mapping, view mode full)
├── views/parts/{header,footer}.twig  shell
└── index.php, single.php, …          thin Timber controllers
```

The sync units for the recipe example are:

| Unit | Output file |
|---|---|
| `post_type.recipe` | `post-types/recipe.php` |
| `taxonomy.recipe_category` | `taxonomies/recipe_category.php` |
| `field_group.recipe` | `fields/recipe.php` |
| `view.recipe.full` | `views/single-recipe.twig` |

The plugin and theme bootstrap files are units of their own.

The WordPress `backend_cmd` values:

| Command | Behavior |
|---|---|
| `import` | Runs `ddev composer install` (plugin dir), `ddev wp plugin activate <ns>-content`, `ddev wp theme activate <ns>` and `ddev wp rewrite flush` |
| `exists_cmd` | Exits 0 when the unit's output file already exists, so re-runs are idempotent |

#### Adapter interface (AC-5)

**PHP side** (generated plugin):

```php
$registry->all();                          // id => ComponentDefinition{id, name, props, slots}
$registry->render($id, $props, $slots);    // Timber::compile('@<ns>/<id>/<id>.twig', …)
do_action('designbook/register_components', $registry);
```

| Contract | Core provides | Adapter does |
|---|---|---|
| Registration | the hook plus the component list | registers a block, widget or element per component |
| Props → controls | props as JSON Schema (`type`, `enum`, `format`, `default`, `required`) | maps them to editor controls |
| Slots → nesting | named slots with titles | maps them to InnerBlocks, containers or children |
| Render | `render()`, always through Timber and the same Twig as Storybook | calls `render()` |

**Skill side (writer):**
- Each builder is a value on the existing `template`/`build_form` axis
  (`entity_mapping.templates`: `gutenberg`, `elementor`, `bricks`).
- Its adapter ships a data-mapping blueprint matched on that value. The blueprint writes a scene's
  component tree into the builder's storage format:
  - Gutenberg: block markup in `post_content`;
  - Elementor: `_elementor_data`;
  - Bricks: `_bricks_page_content_2`.
- A `designbook-wordpress` rule documents this writer contract: the unit fields it receives and
  what it must emit.

## Error handling

- `sync` and `seed` capture the command output. A non-zero exit keeps the output as evidence and
  blocks the task; it is never reported as success (`ok: const true`).
- A unit without a covering blueprint stays a reported `uncovered_units` entry, as today.
- `seed` with a sample record referencing an unknown term or attachment reports that record and
  stops it. It never invents a target.

## Phases and verification

| Phase | Scope | ACs | Functional evidence |
|---|---|---|---|
| P1 Foundation | C5, C6, `packages/integrations/wordpress-fixture` (DDEV `type: wordpress`, SCF, Timber via Composer, DB dump), `packages/integrations/test-integration-wordpress`, skill skeleton, `install/`, `data-model/` | AC-1, AC-6 | `debo-test run wordpress-recipe data-model`: the data model holds post/term/attachment bundles with ACF field types and validates |
| P2 Components & tokens | C1, `components/`, C4, `export-tokens` | AC-2, AC-3 | Addon vitest for the twig resolver, wrapper and story pattern; `debo-test run wordpress-recipe design-component` (twig + schema + story render in Storybook without WordPress); `debo-test run wordpress-recipe tokens` (`theme.json` validates against `https://schemas.wp.org/trunk/theme.json`) |
| P3 Adapter interface | `ComponentRegistry`, hook, writer rule | AC-5 | PHP test in the fixture: the registry finds the components, a test adapter on the hook receives every definition, and `render()` output matches a Storybook snapshot of the default story |
| P4 Sync & seed | C2, C3, WordPress `sync/` and `seed/` | AC-4, AC-6 | See below |

P4 evidence comes from two runs:
- `debo-test run wordpress-recipe sync`. Afterwards each of these exits 0 in DDEV:
  - `wp plugin is-active <ns>-content`
  - `wp theme is-active <ns>`
  - `wp post-type get recipe`
  - `wp eval 'exit(acf_get_field_group("group_recipe") ? 0 : 1);'`
- `debo-test run wordpress-recipe seed-content`:
  - `wp post list --post_type=recipe` lists the sample recipes;
  - `/recipe/<slug>/` answers HTTP 200 and contains the card markup.

**Regression (required):**
- `debo-test run drupal-web` on its `sync-*` cases (C2, C5);
- one `drupal-web` design-component case (SDC unchanged);
- one `vue-web` case (preset branch unchanged).

**AC-6 check:**
- `grep -riE 'wordpress|acf|timber|\bwp ' .agents/skills/designbook packages/storybook-addon-designbook/src`
  returns no hits;
- after C2, `grep -rE 'drush|cim_ok|config_sync_dir'` over the same paths returns no hits, except
  for a listed and justified exception set.

**Project checks:** `pnpm check` before every commit.

**Environment:**
- The DDEV host is shared with other projects. The WordPress fixture uses its own project name, and
  any `ddev poweroff` is coordinated with the owner first.
- Review actors are cw (owner) and the fixture's local WP admin, which the fixture provisions and
  `resolve-environment` verifies during coding.
