# DESIGNBOOK-38 — Spec (v2 · redesign): kind-dispatched `sync-to` + `sync-verify`

**Task-Art:** `debo-test` (skill-authoring — designbook core workflows `sync-to` + `sync-verify`
and the `designbook-drupal` integration). · **Sub-work:** `work:docs`.
**Ziel-State nach spec:** `coding`. · **Scenario:** none (`scenario_required: false`).
**Gate (coding/review):** the `debo-test` case(s) that exercise all three render mechanisms (config's
two sub-modes + scene) against live Drupal.

> **This is v2.** v1 (committed `ed39a195`, live-validated in a first coding pass, PR #151) added
> `unit: scene` to `sync-to` and `config_type: scene` to `config-verify` as two parallel, loosely
> coupled additions. Review feedback reframed the design around a **single `kind` discriminator**
> shared by both workflows, and renamed `config-verify` → **`sync-verify`**. v2 supersedes v1; the
> validated scene logic is preserved but **relocated** into the new structure.

---

## 1. Problem framing

Everything designbook renders is a **Storybook story**. Three distinct kinds of story map to three
distinct ways of producing a *real backend render* to sync toward and verify against:

1. **entity-view-mapping** — a single entity rendered in a view mode via its JSONata→ComponentNode
   mapping. The **designbook Drupal module already provides** the render: the preview route
   `/designbook/preview/{entity_type}/{entity}/{view_mode}` (`PreviewController`). Isolated, no page.
2. **config-entity** — an `entity_view_display` config. Verified by rendering a representative entity
   on its **canonical page** and isolating the display's output with a **selector**. This is exactly
   today's `config-verify` behaviour.
3. **scene** (scene / section / shell / view) — a whole page composition. There is **no** backend page
   until one is built: `sync-to` must create it (config **+** content **+** layout), and verification
   is **full-page** (the real page URL vs the scene story) — no isolation selector, no preview route.

v1's mistake was treating the scene as a second `config_type`/`unit` bolted onto workflows whose only
prior kind was the config-entity. The kinds are a single axis; the workflows should branch on it once.

---

## 2. Design

### 2.1 The discriminator — `kind` (`config | scene`), inferred from the story group

Both workflows take a **story** and branch on a **binary top-level `kind`**, inferred from its
Storybook group. `config` covers everything that is an isolated single render; `scene` is a whole
page. Within `config`, a render **sub-mode** is chosen (the two sub-modes are the two existing,
working candidate mechanisms):

| story group | `kind` | sub-mode | verify candidate render |
|---|---|---|---|
| `Entities/*` (no selector) | **config** | entity-view-mapping | designbook module preview route, isolated |
| `Entities/*` **+ `selector`** | **config** | config-entity | entity canonical page, isolated by the selector |
| `Designbook/Sections/*/Scenes`, `Designbook/Design System` | **scene** | — | the real page **URL, full page** |

The top-level branch (`config` vs `scene`) is what `sync-to` and `sync-verify` dispatch on; the
`config` sub-mode is a thin choice within the config branch (selector present ⇒ config-entity, else
entity-view-mapping). All three render mechanisms must function (§4).

`view`/`shell` stories are scene-kind (they are whole-page renders); only their fixtures differ, and
they are out of this ticket's implementation scope (see §5) — the dispatch must accept them without
special-casing.

### 2.2 `sync-to` (build) — branches on `kind`

- **`config`:** export the entity's display config (incl. the ui-patterns mapping) — the existing
  `data-model` config-export path, filtered to the story's entity/bundle. No new mechanics. (Same for
  both config sub-modes — the sub-mode only affects the *verify* candidate, not what is synced.)
- **`scene`:** create the target page — the ordered unit list of §2.4 (config **+** content **+**
  layout), **`sync-to` creates the page entity** and the `outtake` returns its reachable URL.
- The **bulk `data-model` config export** (no story, whole model) is unchanged.

### 2.3 `sync-verify` (verify) — was `config-verify`; branches on `kind` for the candidate render

`config-verify` is **renamed** to `sync-verify`. Reference stays the live Storybook render of the
story; `ensure-baseline-live`, `measure → fix once → re-measure`, and the `ScoreReport` are unchanged.
Only the **candidate render** differs — the shared compare engine is not duplicated:

- **`config`** — isolated single render, one of two sub-modes:
  - entity-view-mapping: candidate = the module **preview route** render.
  - config-entity: candidate = the entity's **canonical page**, isolated by `selector` (today's
    behaviour, preserved verbatim).
- **`scene`:** candidate = the synced page's **real URL**, captured **full-page** (empty selector).

The single fix pass (`polish`) still edits only backend config/content, never the Storybook component.

### 2.4 Scene sync — units (relocated from v1, validated)

For a scene the page bundle's full view-mode `template` gives the build form (`layout-builder` ⇒
`block_content` instances wired into `layout_builder__layout`; `canvas` ⇒ a page entity with an inline
component tree). `sync-to` emits, dependency-before-user:

1. **Config** — page bundle + (Layout Builder) each block bundle: bundle type, fields, displays, and
   for a Layout-Builder page the `layout_builder__layout` field storage + instance (a real LB export
   includes them; `config:import` does not synthesise them).
2. **Content** — (Layout Builder) one `block_content` instance per block, then the page entity wiring
   the blocks into `layout_builder__layout`; (Canvas) the `canvas_page` with the inline tree.

Content identity is a deterministic `uuid5(url-namespace, scene_id + '/' + role)` embedded verbatim as
the entity uuid → re-sync stable. Config idempotency uses the existing `exists_cmd`; content uses a new
`content_exists_cmd`. Content is imported after config (a `sync-content` phase follows the config
`sync` phase). The page URL is resolved at outtake from the page's deterministic identity.

### 2.5 Backend-neutral (unchanged hard constraint)

No backend code in core. All Drupal specifics are drush **command strings** / config in
`designbook-drupal` + `designbook.config.yml`. Content commands are `{content_ref}`-substitution
templates (plain `drush eval`; drush ignores PHP `exit()` so absence is signalled by throwing). No
addon/TS change (Full-Page capture, the `render_url`/`story_id` resolvers already exist).

---

## 3. What reworks / relocates from the v1 PR (#151)

- **Rename** `skills/config-verify` → `skills/sync-verify` (workflow id, SKILL.md, `workflows/*.md`).
- **Replace** the `config_type` param with an inferred **`kind`**; the subject param becomes the
  **story**. The `entity_view_display` path becomes the **config-entity** branch; add the
  **entity-view-mapping** (preview-route) branch and the **scene** (full-page) branch.
- **Remove** `unit: scene` from `sync-to`; scene sync is selected by `kind` (a scene story), not a
  `unit` flag. The `data-model` bulk export stays.
- **Relocate** the validated scene machinery (`ContentUnit`/`ContentSyncResult` schemas,
  `transform-content`, `sync-content`, page-URL outtake, `content_exists_cmd`/`content_import_cmd`/
  `page_url_cmd`, the Drupal scene render-url variant, the fixture) into the scene branches.
- **Revert** `design/schemas.yml#/ConfigType` `scene` value → the config-verify subject enum is no
  longer the axis; `kind` is.

---

## 4. All render mechanisms must function (verification)

The coding gate is a `debo-test` run proving **all three render mechanisms** work under the renamed
`sync-verify` (`config`'s two sub-modes + `scene`):

- **config / entity-view-mapping** — module preview route render vs the entity story (isolated).
- **config / config-entity** — canonical page + selector vs the entity story (today's case, still green).
- **scene** — `sync-to` creates the page (HTTP 200), `sync-verify` full-page vs the scene story,
  `ScoreReport` produced, second sync idempotent.

---

## 5. Scope

- **Implement:** the `kind` dispatch in both workflows; the **scene** branch end-to-end (rework +
  re-validate live); preserve **entity-view-mapping** and **config-entity** branches on their existing
  render mechanisms.
- **Out of scope (dispatch must accept, fixtures deferred):** `view` and `shell` scene-kind fixtures.
- **Unchanged:** `sync-to` bulk `data-model` export; gates, measurements, transitions of the GAIA
  step-skills; no new preview module/route (the preview route already exists).

---

## 6. Acceptance criteria mapping

The ticket's 14 ACs still hold, reframed onto v2:

| AC | v2 home |
|---|---|
| 1 sync accepts a Scene → ordered config+content units | scene branch of `sync-to` (§2.2/2.4) |
| 2 build form declarative | full view-mode `template` (§2.4) |
| 3 deps before users, clean import | unit order + `sync-content` after `sync` (§2.4) |
| 4 second run idempotent | deterministic uuid5 + `content_exists_cmd` (§2.4) |
| 5 outtake reachable URL (HTTP 200) | scene outtake page URL (§2.2) |
| 6 bulk `data-model` path unchanged | §2.2, diff |
| 7 verify accepts a scene subject | scene branch of `sync-verify` (§2.3) |
| 8 reference = live Storybook story | `ensure-baseline-live` unchanged (§2.3) |
| 9 candidate = real page URL, no preview route for scenes | scene branch (§2.3) |
| 10 scene captured full-page, no selector | scene branch (§2.3) |
| 11 `ScoreReport` (measure→fix→re-measure) | unchanged (§2.3) |
| 12 fix pass touches only backend | `polish` unchanged (§2.3) |
| 13 core backend-neutral | §2.5, diff |
| 14 verified via `debo-test`; all three render mechanisms | §4 |

---

## 7. Risks

- **R1 — `sync-verify` rename churn.** Renaming a workflow touches its SKILL.md, workflow id, task
  `trigger.steps` prefixes, and any references (the GAIA `debo-config-sync` step-skill names
  `config-verify`). Grep every `config-verify` reference; update or knowingly keep.
- **R2 — three-kind regression.** entity-view-mapping and config-entity must stay green after the
  restructure, not only scene. The `debo-test` gate must cover all three (§4), not just the new one.
- **R3 — kind inference.** Group-based inference must correctly separate `Entities/*` from
  `Designbook/*/Scenes`/`Design System`, and the `selector`-present signal must flip entity stories to
  config-entity deterministically. A misinference silently picks the wrong candidate render.
- **R4 — scene content-creation via command string** (carried from v1, resolved there): create
  `block_content` + node + `layout_builder__layout` via a `drush eval`/`php:script` command string; if
  a case cannot be expressed without backend module code, escalate (re-qualify `work:code`) rather
  than add core/backend code.

See `plan.md` for the ordered implementation checklist.
