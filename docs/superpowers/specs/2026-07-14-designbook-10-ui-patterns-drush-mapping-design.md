# DESIGNBOOK-10 — `designbook_ui_patterns` submodule: drush UI Patterns 2 source mapping

**Ticket:** DESIGNBOOK-10 (gaia_feature)
**Goal:** Move the deterministic Drupal-registry half of the UI Patterns 2 data-mapping out of the
static `ui-patterns.md` blueprint into a drush command that queries UI Patterns 2's live
PropType/source registry, so UI Patterns becomes the source of truth and the blueprint keeps only
scene-intent rules. Same benefit `config-validate` gets from `config-schema`.

## Problem

`.agents/skills/designbook-drupal/data-mapping/blueprints/ui-patterns.md` re-encodes UI Patterns 2
source-resolution as static prose: a `source_id` table (`boolean → checkbox`, enum `string → select`,
non-enum `string → textfield`, `$ref ui-patterns://url → url`, `attributes`, `token`) and hand-written
`entity_field` / `field_property` config templates. This drifts against UI Patterns' actual
PropType/source logic on every UIP update and forces the agent to hand-derive the `{source_id, source}`
config block.

The mapping splits in two halves:

- **Scene-intent** (literal vs `$fields.<field>` vs `[token]` vs attributes; which field; which
  prop-property) — lives in the ComponentNode/scene; only the agent knows it. **Stays in the blueprint.**
- **Drupal-registry** (SDC prop type → `source_id`; does the component declare variants; the
  `entity_field` `derivable_context` + `ui_patterns_source:*` / `field_property:*` leaf; which source
  plugins are valid for a field type) — deterministic, introspectable from UIP's own plugin managers.
  **Moves into a drush command.**

## Verified facts (live UI Patterns 2.x install, `core_version_requirement: ^10.3.4 || ^11`)

Verified against a real 2.x checkout (`web/modules/contrib/ui_patterns`), resolving the two
open questions the briefing deferred to spec.

**Services** (`ui_patterns.services.yml`):
- `plugin.manager.ui_patterns_source` → `Drupal\ui_patterns\SourcePluginManager`
- `plugin.manager.ui_patterns_prop_type` → `Drupal\ui_patterns\PropTypePluginManager`
- core `plugin.manager.sdc` — **decorated** by `Drupal\ui_patterns\ComponentPluginManager`, so an SDC
  component definition read through it carries resolved prop types and the magic `variant` prop.

**Registry APIs** (the mapping is fully introspectable — no static table needed):
- `PropTypePluginManager::guessFromSchema(array $propSchema): ?PropTypeInterface` — an SDC prop's
  declared schema → its UIP prop type.
- `SourcePluginManager::getPropTypeDefault(string $propTypeId, array $contexts = [], array $tagFilter = []): ?string`
  — a prop type → the default `source_id` (this is the registry-driven replacement for the static
  `boolean→checkbox / enum→select / string→textfield / url→url` table).
- `SourcePluginManager::getDefinitionsForPropType(string $propTypeId, ?array $contexts = [], array $tagFilter = []): array`
  — all valid sources for a prop type; with a **field context** it returns the `entity_field` /
  `field_property` source definitions valid for that field type.

**Prop types** (`src/Plugin/UiPatterns/PropType/`): `boolean`, `string`, `enum`, `enum_list`,
`enum_set`, `number`, `url`, `attributes`, `slot`, `variant`, `links`, `list`, `identifier`, `unknown`.

**Source plugin ids** (`src/Plugin/UiPatterns/Source/`, `#[Source(id: …)]`) — match the blueprint's
static table exactly, which is why introspection can replace it: `checkbox`, `select`, `textfield`,
`url`, `token`, `attributes`, `entity_field`, `field_property`, `component`.

**Variants** (`ComponentPluginManager::buildVariantProp`): when the SDC declares `variants:`, the
decorated definition injects a magic `variant` prop of prop type `variant` whose enum is the variant
ids. So `variant_id` is deterministic: `null` when the component declares no `variants:`; a derived /
`select` `{source_id, source}` block (resolved via the `variant` prop type) when it does. **UI Patterns
already exposes variant resolution — nothing must be hand-templated for it.**

## Architecture

Per the agreed dev-location decision, the code spans two repos.

### drupal.org module MR — the submodule (AC-1..4)

The `designbook` module now lives at `git.drupalcode.org/project/designbook` (branch `1.x`), consumed
by the fixture as composer `drupal/designbook: dev-1.x`. The submodule is authored in a local clone of
that repo, branched off `1.x`, and lands via a drupal.org MR.

- **`designbook_ui_patterns/designbook_ui_patterns.info.yml`** — `type: module`, `package: Development`,
  `core_version_requirement: ^10 || ^11`, `dependencies: [ui_patterns:ui_patterns, core:sdc]`. Enables via
  `drush pm:enable designbook_ui_patterns` (AC-1).
- **Drush command class** (Drush attribute commands + `AutowireTrait`, mirroring the existing
  `ConfigSchemaCommands`), autowiring `plugin.manager.sdc`, `plugin.manager.ui_patterns_source`,
  `plugin.manager.ui_patterns_prop_type`. Two commands:

  - **A single command** `designbook:ui-pattern <component_id> --props=<json ComponentNode props/slots>`
    → the **whole** `ui_patterns` block in **one call** (no per-prop loop): `component_id`,
    `variant_id`, `props{}`, `slots{}`. JSON on stdout, exit 0. Covers AC-2/AC-3/AC-4 — each is read off
    this one output. The `--props` JSON carries the caller's per-prop **scene-intent hint**:
    - `{"field": "<et>:<bundle>:<field>[:<property>]"}` → `entity_field` block: `derivable_context:
      field:<et>:<bundle>:<field>` plus the leaf `source_id` chosen from the field type via
      `getDefinitionsForPropType` with the field context (`field_property:*` leaf when a `:property` is
      given). (AC-3)
    - `{"literal": <value>}` (or a bare scalar shorthand) → scalar source: SDC prop schema →
      `guessFromSchema` → prop type → `getPropTypeDefault` → `source_id` (`checkbox` / `select` /
      `textfield` / `url`), `source: {value: <value>}`. (AC-2)
    - `{"token": "[…]"}` → `source_id: token`; the implicit `attributes` prop → `source_id: attributes`.
    - `variant_id` → `null` when the SDC declares no `variants:`, a derived `variant` block otherwise. (AC-4)
- **README** documents the single command (input / output / exit) alongside the existing
  `config-schema` / `config-validate` entries.

**One command, not two.** A per-prop `ui-pattern-prop` was considered and dropped (YAGNI): it forces
the agent into a call-per-prop loop, while the whole-block command emits every prop in one call. Fewer
commands, fewer loops.

**Responsibility split** (core stays backend-neutral): the command emits only the deterministic
registry-derived structure. The caller supplies the scene-intent inputs (literal / `$fields.<field>` /
`[token]` / which field / which property) inside `--props`; the command never guesses intent.

### monorepo MR — DESIGNBOOK-10 branch

- **AC-5 blueprint thinning** — `ui-patterns.md`: delete the static `source_id` table (the `props`
  bullets) and the `entity_field` / `field_property` config templates; replace with a reference to the
  single drush command (name, `--props` intent-hint input, output shape). Keep only the scene-intent
  rules: literal vs `$fields.<field>` vs `[token]` vs attributes, which field, which prop-property, and
  the `component_id` derivation. The generic reference shape example stays as an illustration of the
  command's output.
- **`backend_cmd` command entry** — add `ui_pattern_cmd` to the `backend_cmd` block in
  `designbook-config.md` (data-only command string, `ddev drush designbook:ui-pattern`), mirroring
  `schema_cmd` / `validate_cmd`, so the command is discoverable as data and no drush knowledge enters
  core.
- **Fixture wiring (test)** — add `drupal/ui_patterns: ^2` to
  `packages/integrations/drupal-fixture/composer.json` (regenerate lock); add / reuse an SDC component
  in the `test_integration_drupal` theme that declares `variants:` plus props of type boolean, enum
  `string`, non-enum `string`, and `$ref ui-patterns://url`, and a mapped field, to exercise
  AC-2/AC-3/AC-4.
- **`start-drupal-workspace.sh`** — `pm:enable ui_patterns designbook_ui_patterns` alongside the
  existing `designbook` enable.
- **Spec / plan docs.**

## Verification

Per the fixture-test decision: live drush verification through `debo-test` against the fixture (never
ad-hoc), from a **plain checkout, not a worktree** (WORKFLOW.md coding note — the setup scripts run
`git reset --hard` / `git clean -fd`). Pick / author the `debo-test` suite+case whose fixture exercises
the Drupal `ui_patterns` data-mapping. From a **single** `designbook:ui-pattern … --props=<json>` call,
assert on its output:

- a literal-intent prop → correct scalar `{source_id, source}` (each of boolean/enum/string/url);
- a `{"field": "<et>:<bundle>:<field>[:<prop>]"}`-intent prop → the full `entity_field` block with the
  field-type-derived leaf `source_id`;
- `variant_id` → `null` for a no-variant component, a derived `variant` block for the variant component;
- the complete `ui_patterns` block (`component_id`, `variant_id`, `props{}`, `slots{}`) in one call.

Because the fixture consumes `drupal/designbook: dev-1.x`, testing the submodule **before** the
drupal.org MR merges requires pointing the fixture composer at the MR branch (or a local path/VCS
override in the workspace, uncommitted). This coordination step is called out in the plan.

## Scope / non-goals

- No migration or backwards-compat code (CLAUDE.md); the blueprint is rewritten to the new shape, not
  upgraded.
- No scene-intent logic in the command — intent stays with the agent/blueprint.
- Slot resolution beyond emitting the `slots{}` structure (inline nested-component sources) is out of
  scope; the command emits `{}` / the caller-supplied slot sources, matching current blueprint behaviour.

## Acceptance criteria (from ticket)

- **AC-1** — `designbook_ui_patterns` submodule exists; enables via `drush pm:enable`, depends on
  `ui_patterns` (2.x) + core `sdc`.
- **AC-2** — the command's output carries the scalar `{source_id, source}` for each prop, derived from
  the SDC prop type via the UIP PropType/source registry (not a static table).
- **AC-3** — a `{"field": "<et>:<bundle>:<field>[:<property>]"}` prop-intent hint yields the full
  `entity_field` block, leaf `source_id` chosen from the field type via the source registry.
- **AC-4** — command emits `variant_id` (`null` with no `variants:`, derived block otherwise) and the
  complete `ui_patterns` block for a full ComponentNode props/slots input.
- **AC-5** — `ui-patterns.md` thinned: registry mapping references the drush command; only scene-intent
  prose remains.
