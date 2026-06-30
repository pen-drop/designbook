# Sync-to e2e Eval — Design

**Date:** 2026-06-30
**Status:** Approved design, ready for implementation planning

## Summary

`sync-to` (schema-driven Drupal config export) is **agent-driven**: per Drupal config
name, the AI authors a `.jsonata` against the prepare-fetched schema. That non-determinism
makes a pass/fail CI gate the wrong tool. Instead this builds an **eval** that measures
how well the AI authors schema-conforming, importable config — agent-in-loop, scored —
by **reusing the `debo-test` research loop**: focused sync cases scored by a composite
sync-correctness metric, run as train + held-out val.

## Goal

Measure + improve the AI's sync-to generation quality with a repeatable (scored, not
binary) eval that runs the real chain against a live ddev Drupal: prepare-fetched schema
→ AI-authored jsonata → validate → `cim` → live config.

## Non-Goals

- **Not a deterministic CI gate.** sync-to is agent-driven; this is an eval/score in the
  `debo-test` research loop, local, not a CI pass/fail.
- **No new harness.** Reuse `debo-test` (workspace provision, subagent driver, score/audit/
  friction log, train/val gate, iteration loop) — add only cases + a metric + the summary
  fields the metric reads.
- **No round-trip semantic check yet** — sync-from (Plan-2 reverse) isn't built; semantic
  is existence-only for now.

## Architecture

Reuse the `debo-test` research loop verbatim. A sync eval is a set of **debo-test cases**;
each case's `prompt` drives `sync-to` for that case's data model via the loop's subagent
driver; the loop scores via `workflow summary --metric <jsonata> --json` and gates keep/
discard on the held-out val set. The Drupal-layout workspace + `start-drupal-workspace`
(ddev + `config_inspector` + the `designbook_config_schema` helper) are the live target.

## Components

### Suite = `drupal-web`, drastically reduced in place

The sync eval needs **real data-mapping** — sample data + the view-mapping/entity-mapping
JSONata — which synthetic mini-slices lack but `drupal-web` already has. So the suite is
**`drupal-web`, with its data-model drastically reduced in place** to a minimal REAL slice
that carries BOTH mapping paths the engine has: the **entity-mapping** (field-map view-mode
on a real bundle, with sample data) AND the **view-mapping** (a `views.view` rendering
entities in a view-mode). `drupal-web` becomes the lean reference suite for everything
(sync eval + the adapted design cases).

- **Surviving slice (explicit — no plan-time spike needed):**
  - **design-entity (signage)** — the `paragraph.signage` / `paragraph.signage_item`
    bundles + their fields, the two existing `entity-mapping/paragraph.signage*.full.jsonata`
    (field-map full), and the existing sample data
    (`designbook/data/paragraph.signage*.yml`). This is the real entity-mapping island that
    already exists — kept verbatim.
  - **`node.landing_page`** — slimmed to a **teaser** view-mode (only the fields the teaser
    renders), its field-map display, + sample data for the teaser.
  - **`node.article`** (page) hosting a **`views.view`** that lists `landing_page` entities
    in the **teaser** view-mode — this is the **view-mapping path** (the view + its
    view-mapping JSONata), which the signage slice alone does not cover.
  - **`config.image_style.ratio_16_9` / `ratio_4_3` / `ratio_1_1`** — referenced by the
    displays.
- **To author (does not exist yet):** the `node.article` bundle, the `views.view` listing
  (landing_page teaser) + its view-mapping JSONata, the `landing_page` teaser view-mode +
  field-map display, and sample data for both.
- **Drop:** `banner_typ2` / `content_teaser` paragraphs, the `landing_page_types` taxonomy,
  unused media, the rest of the `landing_page` field sprawl (keep only teaser fields), and
  any sections/screens not needed.
- **Adapt the existing `drupal-web` design cases** to the reduced model (cases referencing
  removed bundles/sections are slimmed or dropped). This is a real side-effect of the
  in-place reduction and is part of the work.

### Fixtures — sync cases over the reduced real model

Each case = `fixtures/drupal-web/cases/sync-*.yaml`, targeting a slice of the REDUCED
drupal-web data-model (real bundle/fields/view, not synthetic):

- `sync-paragraph` — the signage paragraphs + their entity-mapping (field-map full) →
  `paragraph.paragraph_type.signage{,_item}` + `field.storage.paragraph.*` +
  `field.field.paragraph.signage*.*` + `core.entity_view_display.paragraph.signage*.full`.
- `sync-node` — the node bundles + displays → `node.type.landing_page` + `node.type.article`
  + `field.storage.node.*` + `field.field.node.*` + `core.entity_view_mode.node.teaser` +
  `core.entity_view_display.node.landing_page.teaser`.
- `sync-view` — the article's listing view (landing_page teasers) + its view-mapping →
  `views.view.<article_listing>`. **This is the view-mapping path the signage slice lacks.**
- `sync-image-style` — the referenced `image.style.ratio_16_9` / `ratio_4_3` / `ratio_1_1`.

Each case is independently runnable + mixable as train + held-out val (the existing
train/val split). Exact config names are pinned by the reduced model authored above.

### Eval lives IN the case fixture

Each `sync-*.yaml` is self-contained — the eval is data in the fixture, not separate:
- `fixtures:` — the reduced data-model slice + sample data (layered).
- `prompt:` — run `/debo sync-to`.
- `assert:` — JS over `output` (sync-to workflow completed).
- **`expected_config:`** (NEW field) — the list of Drupal config names this case must
  produce; the existence-rate + validate scoring measure against it.
- `metric:` / `direction: max` — the composite score JSONata.

### Composite metric (per case → one number, `direction: max`)

The loop optimizes ONE metric value, so the three components fold into one score:

- **`validate_pass_rate`** (gradient) — passing config-name units / total units. A unit
  passes when its generated config satisfies the prepare-fetched schema + `validate_cmd`.
- **cim gate** — `drush config:import --partial` exit 0.
- **`existence_rate`** (semantic) — after cim, the fraction of the case's expected config
  names that are now active in Drupal (`drush config:get <name>` succeeds), i.e. the AI's
  output actually landed as live config.

Fold (proposed, weights tunable in the case yaml):
```
base  = 0.6 * validate_pass_rate + 0.4 * existence_rate        # 0..100 gradient
score = cim_ok ? base : 0.5 * base                              # cim failure halves, not zeroes — keep the gradient
```
A non-zero floor on cim failure preserves a usable gradient (the loop still sees partial
progress). `metric` is the JSONata selecting `score` from the workflow summary; `direction:
max`.

### What sync-to must expose (the eval surface)

- **Per-unit validate outcomes in the summary.** `outtake` aggregates each config-name
  unit's `valid` flag + error → `passing_units` / `total_units` (→ `validate_pass_rate`),
  alongside the cim result and the existence-check, so the metric JSONata can read them
  from `workflow summary --json`.
- **Non-gating eval mode.** Normally a failed unit validation gates the workflow (stops).
  The eval needs the gradient → an eval mode (e.g. a `sync-to` param `gate: soft` / `eval:
  true`) records each unit's pass/fail and CONTINUES, so the summary captures pass/total
  across ALL units instead of aborting on the first invalid. (The default production run
  stays hard-gating.)
- **Existence check.** After cim, verify each name in the case's `expected_config` is active
  — via existing drush (`config:get`/`config:status`) or a thin command alongside
  `designbook_config_schema`. `existence_rate` = present / `expected_config`-count, into the
  summary.

### Where it runs

`debo-test research <suite> <case> --val-cases <others>` — local, agent-in-loop. Not CI.
`--baseline-only` for a single measurement (no optimization loop).

## Error / edge handling

- A unit whose generation fails validation lowers `validate_pass_rate` (recorded, not a
  crash) under the eval mode.
- `cim` failure → the cim-gate halves the score (penalty, not crash); the drush output is
  captured for the audit.
- A driver crash / `needs_user` is the loop's existing crash path (treated as the worst
  score for that case).

## Testing (the eval's own validity)

- A baseline run on a known-good case should score high.
- A deliberately-broken skill prose (e.g. a blueprint pattern that omits a required key)
  should score LOWER — proving the metric discriminates (the loop's gradient is real).
- Confirm the train/val gate rejects a change that helps train but hurts held-out val.

## Decision Log

- **Primary goal:** AI-generation-quality eval (scored), not a deterministic CI gate.
- **Harness:** reuse the `debo-test` research loop (cases + metric + summary fields).
- **Suite:** `drupal-web`, **reduced in place** to a minimal REAL slice that carries BOTH
  mapping paths — NOT a synthetic `drupal-sync` suite (synthetic slices lack real
  data-mapping). Surviving slice (explicit, no spike): **design-entity signage paragraphs**
  (existing entity-mapping + sample data, kept verbatim) + **`node.landing_page`** (teaser
  view-mode) + **`node.article`** hosting a **`views.view`** that lists landing_page teasers
  (the view-mapping path) + the `ratio_*` image styles. The article + view + landing_page
  teaser display + sample data are authored; banner/content_teaser/taxonomy/media/landing_page
  field-sprawl/sections are dropped. drupal-web becomes the lean reference suite; its design
  cases are adapted to the reduced model.
- **Fixtures:** sync cases (`sync-paragraph`/`sync-node`/`sync-view`/`sync-image-style`) over
  the reduced real model, run as train + held-out val — not one big fixture.
- **Eval lives in the case fixture:** each `sync-*.yaml` carries an `expected_config:` list
  (the Drupal config names it must produce); validate + existence score against it.
- **Metric:** composite — `validate_pass_rate` (gradient) + cim gate + `existence_rate`
  (semantic, existence-only), folded to one `direction: max` score with a non-zero cim-fail
  floor.
- **Semantic = existence-only** now (config name active post-cim); deep-diff / sync-from
  round-trip deferred (sync-from is a future plan).
- **sync-to changes:** summary exposes per-unit validate outcomes + cim + existence; an
  eval (soft-gate) mode so the run completes and yields the gradient.
