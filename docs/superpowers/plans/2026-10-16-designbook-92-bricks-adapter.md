# DESIGNBOOK-92 Bricks adapter — working plan

> No confirmed spec/plan/test IDs. Scope is the parent adapter contract (ADAPT-01–05) plus AC-1–AC-4. Rulings are provisional.

**Goal:** Thin Bricks adapter over `ComponentRegistry`: one element per `ui()` component, schema-derived controls, one nestable region per named slot, `render()` through Timber, scene writer into `_bricks_page_content_2`, tokens on `bricks/builder/color_palette`. Supported Bricks: **2.0+**.

**Not in this pass:** live Bricks editor (commercial licence absent). PHP assertions cover registration, controls, slots, writer, palette. Live AC-1–AC-3 remain blocked until a licensed Bricks 2.x package is on the WordPress fixture.

## Task 1 — Controls, page JSON, palette (pure PHP)

RED test `sync/templates/plugin/tests/bricks-adapter-test.php`, then `src/BricksAdapter.php`.

## Task 2 — Register + render through the registry (stub `\Bricks\Element`)

Same test file: `Adapter::register` uses only `ui()`; `ComponentElement::render()` calls `ComponentRegistry::render()`.

## Task 3 — Skill wiring

- Rule: supported Bricks 2.0+, adapter-interface-only.
- Copy `BricksAdapter.php` as unit `plugin.<ns>_content.bricks`.
- Plugin bootstrap requires it.
- Scene unit `layout.<scene>` + bricks layout blueprint.
- Index the files from `designbook-wordpress/SKILL.md`.

## Task 4 — Checks

- `php` assertion script via `docker run php:8.3-cli`
- `pnpm check`
- `debo-test` scene run deferred: no licensed Bricks, no scene in wordpress-recipe yet.
