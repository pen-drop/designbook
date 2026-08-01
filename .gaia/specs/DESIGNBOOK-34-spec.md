# DESIGNBOOK-34 — Spec & Implementation Plan

**Ticket:** Addon: form_modes im Storybook anzeigen — eine Story pro Form-Mode im Entity-Baum
**Workflow:** `gaia_feature` · **Sub-work:** `work:code` · **Task-Art:** `addon-feature`
**Runtime surface:** yes — Storybook sidebar entry + rendered form + Structure tab → verified in a running Storybook (test workspace) **and** unit tests. `scenario_required: true`.
**Skill:** all addon changes go through `designbook-addon-skills` (Part 2). No manager component is touched by this change (discovery + CSF generation only); the manager-styling rule therefore has nothing to constrain here (AC-12 vacuously true, asserted by grep).

---

## 1. Problem

Since DESIGNBOOK-31 a bundle can declare `form_modes` — the editing half of a bundle, symmetric to
`view_modes`. The Storybook addon shows nothing of it: it produces one story per **view_mode** only.

`packages/storybook-addon-designbook/src/renderer/entity-module-builder.ts` is anchored on
view_modes end to end — discovery filters `entity-mapping/<type>.<bundle>.*.jsonata`
(`entity-module-builder.ts:51-56`), the loop builds `viewModes: EntityCsfViewMode[]`
(`:77-111`), and the sidebar group is `Entities/${entity_type}/${titleCaseBundle(bundle)}`
(`:119`). The indexer (`preset.ts:22 indexEntity`), the stories glob (`preset.ts:130`), the entity
indexer test (`preset.ts:214`), the vite plugin's `isEntityMappingFile` (`vite-plugin.ts:28`), and
the render-side path resolution (`builders/entity-builder.ts:57`) are all keyed on the
`entity-mapping/` directory and the `<type>.<bundle>.<view_mode>.jsonata` name. There is no form
pendant — no discovery, no story export, no display.

Goal: one story per declared `form_mode`, rendering the form, placed **in the same entity tree**
next to the view-mode stories, discovered over **its own mapping files** (PM decision: not a second
discovery path over `data-model.yml`), with a **structurally** collision-free file pattern.

## 2. The hard constraint — collision-freedom (AC-2)

Both halves of a bundle carry a mode named `default`. Today `node.article.default.jsonata` **is** the
view_mode `default`. A form_mode `default` in the same namespace would name the same file and make
discovery collide. The pattern must exclude the collision **structurally**, not by convention.

Two candidate patterns were on the table:

- **(A)** same directory, marker suffix: `entity-mapping/<type>.<bundle>.<form_mode>.form.jsonata`.
- **(B)** own directory: `form-mapping/<type>.<bundle>.<form_mode>.jsonata`.

(A) keeps both halves in one directory, so the existing view discovery
(`readdirSync(...).filter(f => f.endsWith('.jsonata'))`, `entity-module-builder.ts:53-54`) would
**also match** `default.form.jsonata` and mis-parse it — `parseMappingName`/`indexEntity` split on
`.` and would read the mode as `default.form`. Avoiding that requires the view path to *actively
exclude* `.form.jsonata` — collision avoided by a naming **convention** and filtering, exactly what
the PM ruled out, and a live regression risk to view_modes (AC-7).

## 3. Decision (design)

**Adopt pattern (B): a sibling `form-mapping/` directory,
`form-mapping/<entity_type>.<bundle>.<form_mode>.jsonata`.** Collision is impossible by directory
namespace: `entity-mapping/node.article.default.jsonata` and
`form-mapping/node.article.default.jsonata` are two different files at two different paths — no file
names both, no filtering needed, and the view-mode discovery glob never sees a form file (AC-7 holds
by construction). It mirrors the existing directory-keyed discovery machinery one directory over.

- **D1 — Discovery over `form-mapping/`.** Add the parallel discovery to the exact points that key on
  `entity-mapping/`: `preset.stories()` gains a `form-mapping/*.jsonata` glob and a
  `mkdirSync(form-mapping)`; `preset.experimental_indexers` gains a `formIndexer` with test
  `/form-mapping\/[^/]+\.jsonata$/`; `vite-plugin` gains `isFormMappingFile`.

- **D2 — One module per bundle (no duplicate title).** Storybook errors on a duplicate `title`, which
  is why today **all** view-mode stories of a bundle funnel to **one** canonical CSF module — each
  `.jsonata` index entry redirects its `importPath` to the bundle's first-sorted entity-mapping
  (`indexEntity` `preset.ts:31-49`). Form stories share the **same** title `Entities/<type>/<Bundle>`
  (AC-4), so they must be **exports of that same module** — a second module with the same title would
  reintroduce the conflict the funnel exists to avoid. Therefore `buildEntityModule` (invoked for the
  canonical entity-mapping) is **extended to also discover the bundle's `form-mapping/` files** and
  append one form story per form_mode to the same module; the `formIndexer` redirects each form
  index entry's `importPath` to the **same** canonical entity-mapping module (as view modes do). The
  indexer-declared export name must match the module's exported name exactly — the same
  indexer/loader parity the scene path already depends on.

- **D3 — Distinguishable story identity (AC-3/AC-5).** In the shared module, a form story's export
  name is `Form` + `buildExportName(form_mode)` (e.g. `default` → `FormDefault`), distinct from the
  view-mode export `Default` — stable and derived from the mode name (AC-3). Its display `name` is
  `` `${form_mode} (form)` `` and it carries a `form` tag, so it is recognizable as a form story and
  not confusable with a view_mode of the same name (AC-5).

- **D4 — Render-side resolution.** `buildEntityModule` builds each form story by calling
  `ctx.buildNode({ entity, form_mode, select })`. `entityBuilder` (`builders/entity-builder.ts`)
  resolves `form-mapping/<type>.<bundle>.<form_mode>.jsonata` when the node carries `form_mode` (else
  `entity-mapping/…` exactly as today); `EntityOrigin` carries `form_mode`. `SceneNode`/`EntityOrigin`
  gain an optional `form_mode?: string` in `types.ts`.

- **D5 — Structure tab filled for free (AC-8).** Form stories reuse `buildEntityCsfModule`, so each
  form story emits the same `sceneTrees` param + `record` argType the Structure tab (DESIGNBOOK-32)
  reads. The per-record IR is produced by the same `view(tree)` path as view modes, so the tab shows
  the form's structure and never runs empty.

- **D6 — No form components authored by the addon (AC-6).** The rendered form is whatever the
  `form-mapping/*.jsonata` maps records to; that mapping references the **existing** form components
  from `.agents/skills/designbook-drupal/components/blueprints/form.md` (`form_element`, `label`,
  input types). The addon only renders referenced components — it introduces **no** parallel form
  component family. The fixture form-mapping used for RED/GREEN + running-Storybook verification is
  authored to reference those components.

### Reused unchanged (why the change is small)

`buildEntityCsfModule` (`csf-prep.ts`), the `view()`/`buildNode` render path, the sample-data pool
lookup, `buildExportName`, and the whole view-mode discovery — untouched in behavior. The view story
IDs, order, and grouping are byte-identical because the `entity-mapping/` glob and loop never observe
a form file (AC-7).

## 4. Resolved open decision

| # | Decision | Choice | Rationale | Rejected alternative |
|---|---|---|---|---|
| **A** | Form-mapping file pattern (the ticket's open spec question) | **Sibling `form-mapping/<type>.<bundle>.<form_mode>.jsonata`** | Collision is impossible by **directory namespace**, not convention — the view discovery glob never sees a form file, so AC-2 and AC-7 hold *by construction*; mirrors the existing directory-keyed discovery (glob + indexer + `isXMappingFile`) one directory over. | `entity-mapping/<…>.<form_mode>.form.jsonata` — same directory, so the view glob matches `.form.jsonata` and `split('.')` mis-parses the mode; avoided only by a naming **convention** + active exclusion filtering, which the PM forbids and which risks view-mode regression. |
| **B** | Where form stories live in Storybook | **Same bundle module, appended by `buildEntityModule`** | Same `title` ⇒ must be the same CSF module (duplicate-title error otherwise); the funnel already redirects every mode of a bundle to one module. | A separate `form-mapping` module with the same title — reintroduces the duplicate-title conflict the funnel exists to avoid. |
| **C** | Form story identity | **Export `Form`+`buildExportName(mode)`, name `<mode> (form)`, tag `form`** | Stable, mode-derived, and distinct from the like-named view story in the same module (AC-3/AC-5). | Reuse the bare mode name — collides with the view-mode export/name in the same module. |
| **D** | Discovery source | **`form-mapping/` files** | PM decision: own mapping files, symmetric to view_modes; not a second discovery path over `data-model.yml`. | Read `content.<type>.<bundle>.form_modes` from `data-model.yml` — explicitly rejected by the PM. |

## 5. Risks

- **R1 — Indexer/loader export-name parity.** The `formIndexer` export name and the module's exported
  form story name must be identical, or Storybook fails with "couldn't find story matching index
  entry" (the same parity the scene path depends on). *Mitigation:* both derive the export name from
  one shared helper (`Form` + `buildExportName(mode)`); a unit test asserts the index entry's
  `exportName` equals the built module's export for a form mode.
- **R2 — Bundle with `form_modes` but no `entity-mapping` (form-only bundle).** The shared module is
  anchored on the canonical entity-mapping; a bundle with **only** form mappings would have no anchor.
  In Drupal every bundle always has a default view display, so an `entity-mapping/<…>.default.jsonata`
  is always present in practice. *Mitigation:* documented assumption — a bundle exposing `form_modes`
  also exposes at least the default view_mode; form-only bundles are out of scope (§7).
- **R3 — View-mode regression (AC-7).** The change touches shared files (`entity-module-builder.ts`,
  `csf-prep.ts`, `preset.ts`, `vite-plugin.ts`, `entity-builder.ts`). *Mitigation:* the `entity-mapping/`
  glob/loop is left literally unchanged; a snapshot/equality test asserts the view-mode CSF output and
  index entries for a bundle are identical with and without form mappings present.
- **R4 — Empty Structure tab on a form story (AC-8).** *Mitigation:* form stories go through the same
  `buildEntityCsfModule` `sceneTrees` emission; the running-Storybook check confirms the tab is
  filled on a form story.
- **R5 — Empty node for a bundle without form_modes (AC-9).** Discovery is purely file-driven, so a
  bundle with no `form-mapping/` file yields zero form stories and no sidebar node. *Mitigation:*
  a unit test on a bundle with view mappings only asserts no form story and no extra node.

## 6. Acceptance ↔ evidence matrix

| AC | What proves it |
|---|---|
| 1 — pattern fixed & documented, discovery reliable | this spec §3/§4 (committed) + spec comment; unit test: a `form-mapping/<t>.<b>.<m>.jsonata` fixture is discovered and yields exactly one form story. |
| 2 — collision-freedom structural (view `default` + form `default` → two stories) | unit test: a bundle with `entity-mapping/…default.jsonata` **and** `form-mapping/…default.jsonata` produces two distinct stories; assert no single file names both (different directories). |
| 3 — exactly one story per form_mode, stable export name | unit test: N form mappings → N form stories; export name `Form`+`buildExportName(mode)` is stable and mode-derived. |
| 4 — form stories under `Entities/<type>/<Bundle>` next to view stories | unit test on the built module `title` + index entry `title`; running-Storybook: form story appears under the same bundle node. |
| 5 — form story recognizable, not confusable with same-name view_mode | story `name` = `<mode> (form)` and `form` tag; unit test asserts name/tag differ from the view story of the same mode. |
| 6 — form uses `blueprints/form.md` components, no parallel family | fixture form-mapping references `form_element`/`label`/input; running-Storybook renders them; no new form component files added (grep). |
| 7 — no view_mode regression (IDs, groups, order) | equality test: view-mode CSF output + index entries identical with vs without form mappings; view discovery code unchanged. |
| 8 — Structure tab filled on a form story | running-Storybook (form story): Structure tab shows the form's tree; unit test asserts `sceneTrees` param emitted for form stories. |
| 9 — bundle without form_modes → no form story, no empty node | unit test: bundle with view mappings only → zero form stories, no extra sidebar node. |
| 10 — `pnpm check` green | run `pnpm check` (typecheck → lint → test). |
| 11 — verified in running Storybook (test workspace) | sidebar entry present, form renders, Structure tab filled; evidence recorded. |
| 12 — no Tailwind/DaisyUI if manager touched | no manager component touched; grep confirms no Tailwind/DaisyUI class in the diff. |
| 13 — RED before GREEN + scenario as executable click path | the form-discovery test fails before the change, passes after; Gherkin click path to a form story in the `test` comment. |

## 7. Implementation plan (checkbox — for the coding step)

- [ ] **RED first (AC-13):** add a unit test that provisions a bundle with an `entity-mapping/` view
      mapping **and** a `form-mapping/<t>.<b>.<m>.jsonata` form mapping, and asserts the built module
      exports a `Form`+`buildExportName(mode)` form story (distinct name/tag) — fails on today's code.
- [ ] `renderer/types.ts`: add optional `form_mode?: string` to `SceneNode` and `EntityOrigin` (D4).
- [ ] `renderer/builders/entity-builder.ts`: when the node carries `form_mode`, resolve
      `form-mapping/<type>.<bundle>.<form_mode>.jsonata`; carry `form_mode` in `EntityOrigin` (D4).
- [ ] `renderer/entity-module-builder.ts`: after view-mode discovery, discover the bundle's
      `form-mapping/` siblings and build one form story per form_mode via `ctx.buildNode({ entity,
      form_mode, select })`; append them to the module. Introduce a shared
      `formExportName(mode) = 'Form' + buildExportName(mode)` helper (D2/D3).
- [ ] `renderer/csf-prep.ts`: let `buildEntityCsfModule` emit view **and** form stories (carry a
      `kind: 'view' | 'form'` per mode or a parallel `formModes` list) — form story export =
      `formExportName(mode)`, `name` = `<mode> (form)`, `tags` include `form`; view emission stays
      byte-identical (D2/D3/D5, AC-7).
- [ ] `preset.ts`: `stories()` add `form-mapping/*.jsonata` glob + `mkdirSync(form-mapping)`;
      `experimental_indexers` add a `formIndexer` (test `/form-mapping\/[^/]+\.jsonata$/`) whose
      entries redirect `importPath` to the bundle's canonical entity-mapping module with export
      `formExportName(mode)`, name `<mode> (form)`, `form` tag (D1/D2, AC-4).
- [ ] `vite-plugin.ts`: add `isFormMappingFile`; ensure a `form-mapping` id maps to the canonical
      bundle module build (form entries are loaded via the redirected entity-mapping module) (D1/D2).
- [ ] Fixture: a `form-mapping/<t>.<b>.<m>.jsonata` referencing `blueprints/form.md` components, plus
      the data-model `form_modes` declaration, in the test workspace (AC-6/AC-11).
- [ ] Regression test: view-mode CSF output + index entries identical with vs without form mappings
      (AC-7); no-form-modes bundle → no form story/node (AC-9); export-name parity indexer↔module
      (R1); Structure `sceneTrees` emitted for form stories (AC-8).
- [ ] `pnpm check` green (AC-10).
- [ ] Verify in a running Storybook (test workspace): sidebar entry, form renders, Structure tab
      filled; record evidence (AC-11).
- [ ] Grep confirms no manager component touched / no Tailwind/DaisyUI class in the diff (AC-12).

## 8. Not in scope

Field selection, field order, and widget configuration in the form (full `entity_form_display`
semantics) — deliberately out, as in DESIGNBOOK-31. Form submission / interaction against a backend.
Changes to the `form_modes` declaration itself. Form-only bundles (no view display) — see R2.

## 9. Artifacts

- This spec: `.gaia/specs/DESIGNBOOK-34-spec.md` (committed).
- To be changed in coding (all under `packages/storybook-addon-designbook/`): `src/renderer/types.ts`,
  `src/renderer/builders/entity-builder.ts`, `src/renderer/entity-module-builder.ts`,
  `src/renderer/csf-prep.ts`, `src/preset.ts`, `src/vite-plugin.ts`, plus a new test under
  `src/__tests__/` and a `form-mapping/*.jsonata` fixture + `form_modes` data-model in the test
  workspace.
