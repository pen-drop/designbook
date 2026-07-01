# Sync-to e2e Eval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an agent-in-loop eval that scores how well `sync-to` authors schema-conforming, importable Drupal config — by reducing `drupal-web` to a real two-mapping slice, adding sync cases with a composite metric, and teaching the workflow + summary CLI + research loop to surface the eval signal against a live ddev Drupal.

**Architecture:** Reuse the `debo-test` research loop verbatim. Each sync case is a `fixtures/drupal-web/cases/sync-*.yaml` carrying an `expected_config:` list; the case prompt drives `/debo sync-to` via the loop's driver subagent. The composite score folds `validate_pass_rate` (from the workflow's per-unit validation, captured under a new soft-gate eval mode), a `cim` gate (the sync stage's `drush config:import`), and `existence_rate` (post-cim live `drush` check against `expected_config`). The workflow surfaces validate + cim into its `ExportSummary`; `readSummary` lifts that into `SummaryResult`; the summary CLI injects `existence_rate`; the metric JSONata reads all three.

**Tech Stack:** TypeScript (storybook-addon-designbook: `workflow.ts`, `workflow-resolve.ts`, `cli/workflow-summary.ts`), Vitest, AJV + JSONata, designbook skill prose (`.agents/skills/designbook/sync/**`, `.agents/skills/designbook-test/**`), Drupal/drush (`designbook_config_schema` helper module), ddev, bash scripts.

## Global Constraints

- **No backwards-compat / migration code.** On-disk artifacts are disposable; testing is always from scratch. Update writers/readers to the new shape; never read or upgrade old artifacts.
- **No backend-specific code in CORE.** Drupal/drush specifics = command strings + config in the integration skill. The ONE approved exception is the small readable drush helper module `designbook_config_schema` in `packages/integrations/drupal-fixture` — new drush helper subcommands go THERE, not in core.
- **Schema-first.** Prefer enums / required keys / validators in `schemas.yml` over imperative rules.
- **Skill files:** Before creating OR editing any task/rule/blueprint/workflow/`schemas.yml` under `.agents/skills/designbook*/`, you MUST load `designbook-skill-creator` first. `.agents/skills/` is canonical; `.claude/skills/` is a symlink — never edit it directly.
- **`pnpm check` before every commit** (typecheck → lint → test, fail-fast). After ANY skill-file change, self-run `pnpm check` (a stray blockquote once broke `loadJsonata`'s fence regex).
- **Communicate in English.**
- **Composite metric (exact, copied verbatim into every sync case):**
  `base = 0.6 * validate_pass_rate + 0.4 * existence_rate` ; `score = cim_ok ? base : 0.5 * base` ; `direction: max`. A non-zero cim-fail floor preserves the gradient.

---

## File Structure

**Fixture (reduced `drupal-web`) — Phase A:**
- `fixtures/drupal-web/data-model/designbook/data-model.yml` — rewrite to the reduced slice + author `node.article`, `config.views.view.landing_teasers`, `landing_page` teaser view-mode.
- `fixtures/drupal-web/design-entity/**` — prune `banner_typ2` / `content_teaser`; keep signage.
- `fixtures/drupal-web/{design-shell,sections,design-verify-entity-signage}/**` + `cases/*.yaml` — prune + adapt remaining design cases' `fixtures:` lists.
- `fixtures/drupal-web/sample-data/**` (or design-entity data dir) — author sample data for `landing_page` (teaser) + `article` + the view.

**Workflow eval surface — Phase B (skill prose + addon TS):**
- `.agents/skills/designbook/sync/schemas.yml` — `ExportSummary` gains `validation` + `cim`.
- `.agents/skills/designbook/sync/tasks/{transform,sync,outtake}.md` — soft-gate eval param; aggregate per-unit validate + cim into `ExportSummary`.
- `packages/storybook-addon-designbook/src/workflow.ts` — soft-gate eval mode in `workflowDone()`; promote `ExportSummary` into `workflow_output` in `archiveWorkflow` (via `findResultValue`).
- `packages/storybook-addon-designbook/src/cli/workflow-summary.ts` — map `workflow_output.export_summary` → `SummaryResult.exportSummary`.

**Existence check — Phase C:**
- `packages/integrations/drupal-fixture/web/modules/custom/designbook_config_schema/**` — new `designbook:config-exists` drush subcommand.
- `packages/storybook-addon-designbook/src/cli/workflow-summary.ts` — parse `expected_config:`, run existence check, inject `existenceRate`.

**Sync cases — Phase D:**
- `fixtures/drupal-web/cases/sync-{paragraph,node,view,image-style}.yaml`.

**Loop / ddev — Phase E:**
- `.agents/skills/designbook-test/workflows/research.md` — per-case Drupal reset; parallel-run note.
- `scripts/reset-drupal-config.sh` — re-import baseline DB.
- `scripts/init-research-worktree.sh` — worktree-per-run provisioning.

**Validity — Phase F:**
- `.agents/skills/designbook-test/workflows/research.md` (Testing section) + a one-shot validation run.

---

## Phase A — Reduce `drupal-web` in place

### Task A1: Rewrite the data-model to the reduced two-mapping slice

**Files:**
- Modify: `fixtures/drupal-web/data-model/designbook/data-model.yml`

**Interfaces:**
- Produces: a data-model with exactly — `config.image_style.ratio_{16_9,4_3,1_1}`; `config.views.view.landing_teasers`; `node.landing_page` (teaser view-mode only, slim fields); `node.article` (hosts the view); `paragraph.signage` + `paragraph.signage_item`; `media.image`; `taxonomy_term.landing_page_types`. All view_modes keep `template: field-map`. These config-name roots are what every later sync case's `expected_config` references.

> Load `designbook-skill-creator` only if you touch a `schemas.yml`; `data-model.yml` is fixture data, not a skill file — editing it does not require the skill. But DO confirm the surviving keys match `ConfigNameUnit` expansion (resolve-filter): a content bundle yields `<et>.type.<bundle>`, `field.storage.<et>.<field>`, `field.field.<et>.<bundle>.<field>`, `core.entity_view_display.<et>.<bundle>.<view_mode>`; a `config.<key>` yields `config_name = <key>`.

- [ ] **Step 1: Delete the dropped bundles from `data-model.yml`**

Remove these blocks entirely (line numbers from the current file — verify before cutting):
- `node.event`, `node.topic`, `node.learning_nugget`, `node.book`, `node.page`, `node.video`, `node.location`, `node.profession`, `node.stage_teaser`.
- All `taxonomy_term.*` EXCEPT `landing_page_types`.
- `media.document`, `media.audio`, `media.video`, `media.remote_video` (keep `media.image`).
- `paragraph.banner_typ2`, `paragraph.content_teaser` (keep `signage`, `signage_item`).

- [ ] **Step 2: Slim `node.landing_page` to a teaser slice**

Keep only the fields the teaser renders + drop the banner/section sprawl. Replace the `node.landing_page` block with:

```yaml
  node.landing_page:
    label: Landing Page
    purpose: A landing page; surfaced as a teaser in the article listing view.
    fields:
      field_short_title:
        type: string
        label: Short title
      field_landing_page_image:
        type: entity_reference
        label: Teaser image
        settings:
          target_type: media
          handler: 'default:media'
          target_bundles: [image]
      field_landing_page_type:
        type: entity_reference
        label: Type
        settings:
          target_type: taxonomy_term
          handler: 'default:taxonomy_term'
          target_bundles: [landing_page_types]
    view_modes:
      teaser:
        template: field-map
```

(Drop `field_banner_*`, `field_landing_page_section`, the `full` view-mode, and the extra taxonomy refs.)

- [ ] **Step 3: Author `node.article` (hosts the view)**

Add under the nodes:

```yaml
  node.article:
    label: Article
    purpose: An editorial page that embeds the landing-page teaser listing view.
    fields:
      field_body:
        type: text_long
        label: Body
    view_modes:
      full:
        template: field-map
```

- [ ] **Step 4: Author the view as a `config.views.view.*` entry**

Add under `config:` (alongside the `image_style.*` keys):

```yaml
  views.view.landing_teasers:
    label: Landing teasers
    purpose: >
      A view that lists node.landing_page entities rendered in the teaser
      view-mode, embedded on the article page. This is the view-mapping path
      the sync eval exercises.
    base_table: node_field_data
    row:
      entity_type: node
      bundle: landing_page
      view_mode: teaser
    filters:
      type: landing_page
      status: 1
    sort:
      created: DESC
```

(The shape need only carry enough for the AI to author a valid `views.view.landing_teasers.yml`; the row block names the entity + view-mode being listed.)

- [ ] **Step 5: Verify the model loads + expands**

Run (from repo root):
```bash
./scripts/setup-workspace.sh evalwt
./scripts/setup-test.sh drupal-web data-model --into workspaces/evalwt/web/themes/custom/test_integration_drupal
cd workspaces/evalwt/web/themes/custom/test_integration_drupal
node /home/cw/projects/designbook/.claude/worktrees/export/packages/storybook-addon-designbook/dist/cli.js data-model validate 2>&1 | tail -20 || echo "(no data-model validate cmd — fall back to a sync-to dry resolve in Task D)"
```
Expected: data-model parses; the only bundles/config keys present are the reduced set. (If there is no `data-model validate` subcommand, this verification is deferred to Task D1's first `sync-to` resolve.)

- [ ] **Step 6: Commit**

```bash
cd /home/cw/projects/designbook/.claude/worktrees/export
git add fixtures/drupal-web/data-model/designbook/data-model.yml
git commit -m "fixture(drupal-web): reduce data-model to signage + landing_page/article view slice"
```

---

### Task A2: Prune `design-entity` to the signage slice

**Files:**
- Delete under `fixtures/drupal-web/design-entity/`: `designbook/entity-mapping/paragraph.banner_typ2*.jsonata`, `paragraph.content_teaser*.jsonata`; `designbook/data/paragraph.banner_typ2.yml`, `paragraph.content_teaser.yml`; `components/banner_typ2/`, `components/content_teaser/`.
- Keep: `components/signage/`, `components/signage_item/`, `designbook/entity-mapping/paragraph.signage{,_item}.full.jsonata`, `designbook/data/paragraph.signage{,_item}.yml`.

**Interfaces:**
- Produces: a `design-entity` fixture containing ONLY the signage paragraph slice (the real entity-mapping island), unchanged in content.

- [ ] **Step 1: Delete the dropped entity-mapping + data + component dirs**

```bash
cd /home/cw/projects/designbook/.claude/worktrees/export/fixtures/drupal-web/design-entity
git rm -r --ignore-unmatch \
  designbook/entity-mapping/paragraph.banner_typ2*.jsonata \
  designbook/entity-mapping/paragraph.content_teaser*.jsonata \
  designbook/data/paragraph.banner_typ2.yml \
  designbook/data/paragraph.content_teaser.yml \
  components/banner_typ2 components/content_teaser
```

- [ ] **Step 2: Verify only signage remains**

```bash
ls designbook/entity-mapping/ designbook/data/ components/
```
Expected: entity-mapping + data list only `paragraph.signage*`; components list only `signage` + `signage_item`.

- [ ] **Step 3: Commit**

```bash
cd /home/cw/projects/designbook/.claude/worktrees/export
git commit -m "fixture(drupal-web): prune design-entity to signage slice"
```

---

### Task A3: Prune dropped dirs + obsolete cases, adapt surviving cases

**Files:**
- Delete: `fixtures/drupal-web/sections/`, `fixtures/drupal-web/design-verify-entity-signage/`; `design-shell/components/{checkbox,form_element,input,label,link,submit}/`; cases `design-screen-homepage.yaml`, `design-screen-ausbildung.yaml`, `sample-data-homepage.yaml`, `sample-data-ausbildung.yaml`, `design-verify-screen-homepage.yaml`, `design-verify-screen-ausbildung.yaml`, `sections.yaml`.
- Modify: any surviving case whose `fixtures:` list references a dropped fixture (e.g. `sections`) — remove that entry.
- Keep cases: `vision`, `data-model`, `tokens`, `css-generate`, `design-guideline`, `design-shell`, `design-verify-shell`, `design-entity`, `design-verify-entity-signage` (the case yaml stays; its verify *artifacts* dir is dropped — re-run regenerates them).

**Interfaces:**
- Produces: a `drupal-web` whose every remaining case's `fixtures:` list points only at fixtures that still exist (setup-test.sh hard-errors on a missing fixture).

- [ ] **Step 1: Delete dropped dirs + cases**

```bash
cd /home/cw/projects/designbook/.claude/worktrees/export/fixtures/drupal-web
git rm -r --ignore-unmatch sections design-verify-entity-signage \
  design-shell/components/checkbox design-shell/components/form_element \
  design-shell/components/input design-shell/components/label \
  design-shell/components/link design-shell/components/submit \
  cases/design-screen-homepage.yaml cases/design-screen-ausbildung.yaml \
  cases/sample-data-homepage.yaml cases/sample-data-ausbildung.yaml \
  cases/design-verify-screen-homepage.yaml cases/design-verify-screen-ausbildung.yaml \
  cases/sections.yaml
```

- [ ] **Step 2: Scan surviving cases for dangling fixture references**

```bash
cd /home/cw/projects/designbook/.claude/worktrees/export/fixtures/drupal-web/cases
grep -l 'sections' *.yaml || echo "no case references sections"
```
For each hit, remove the `  - sections` line (and any other dropped-fixture line) from that case's `fixtures:` list with Edit.

- [ ] **Step 3: Verify every case layers cleanly**

```bash
cd /home/cw/projects/designbook/.claude/worktrees/export
for c in vision data-model tokens css-generate design-guideline design-shell design-verify-shell design-entity design-verify-entity-signage; do
  ./scripts/setup-test.sh drupal-web "$c" --into workspaces/evalwt/web/themes/custom/test_integration_drupal >/dev/null 2>&1 \
    && echo "OK $c" || echo "FAIL $c"
done
```
Expected: every line prints `OK` (setup-test exits 0 — no missing-fixture error).

- [ ] **Step 4: Commit**

```bash
git add -A fixtures/drupal-web
git commit -m "fixture(drupal-web): drop screens/sections/form-components + obsolete cases; adapt fixtures lists"
```

---

### Task A4: Author sample data for landing_page + article + the view

**Files:**
- Create: `fixtures/drupal-web/design-entity/designbook/data/node.landing_page.yml` (or the suite's canonical sample-data dir — match where `paragraph.signage.yml` lives).
- Create: `fixtures/drupal-web/design-entity/designbook/data/node.article.yml`.

**Interfaces:**
- Consumes: the reduced data-model (Task A1) — field names must match `node.landing_page` / `node.article`.
- Produces: sample records so the view has rows to render and the sync cases have content to reference. Sample-data shape mirrors the existing `paragraph.signage.yml` (one record per top-level entry, fields keyed by machine name).

- [ ] **Step 1: Write `node.landing_page.yml` sample data**

```yaml
- field_short_title: Ausbildung gestalten
  field_landing_page_type: 1
  field_landing_page_image: 1
- field_short_title: Prüfungen vorbereiten
  field_landing_page_type: 1
  field_landing_page_image: 1
```

- [ ] **Step 2: Write `node.article.yml` sample data**

```yaml
- field_body: >
    This article embeds the landing-teasers view.
```

- [ ] **Step 3: Verify the sample data parses with the model**

```bash
cd /home/cw/projects/designbook/.claude/worktrees/export
./scripts/setup-test.sh drupal-web design-entity --into workspaces/evalwt/web/themes/custom/test_integration_drupal >/dev/null 2>&1 && echo "OK design-entity layers"
```
Expected: `OK design-entity layers`.

- [ ] **Step 4: Commit**

```bash
git add fixtures/drupal-web/design-entity/designbook/data
git commit -m "fixture(drupal-web): sample data for landing_page + article"
```

---

## Phase B — Workflow eval surface

### Task B1: `ExportSummary` carries per-unit validation + cim; outtake aggregates

**Files:**
- Modify: `.agents/skills/designbook/sync/schemas.yml` (ExportSummary, ~lines 45-62)
- Modify: `.agents/skills/designbook/sync/tasks/outtake.md`
- Modify: `.agents/skills/designbook/sync/tasks/sync.md` (capture cim exit + applied names — likely already produces `SyncResult`; assert it carries `cim_ok`)

**Interfaces:**
- Produces: an `ExportSummary` with `validation: { passing_units, total_units }` and `cim: { ok }`, in addition to `config_names` + `count`. These are the fields `validate_pass_rate` (= passing_units/total_units) and the cim gate (= cim.ok) read from.

> REQUIRED: load `designbook-skill-creator` before editing these skill files.

- [ ] **Step 1: Extend `ExportSummary` in `schemas.yml`**

Add to `ExportSummary.properties` (and to `required`):

```yaml
    validation:
      type: object
      description: Per-unit validation roll-up across all config-name units in this run.
      required: [passing_units, total_units]
      properties:
        passing_units:
          type: integer
          description: Count of config-name units whose generated YAML passed prepare-schema + validators.
        total_units:
          type: integer
          description: Total config-name units processed (denominator for validate_pass_rate).
    cim:
      type: object
      description: Outcome of the sync stage's drush config:import.
      required: [ok]
      properties:
        ok:
          type: boolean
          description: True when drush config:import (--partial) exited 0.
```
Update `required: [config_names, count]` → `required: [config_names, count, validation, cim]`.

- [ ] **Step 2: Teach `outtake.md` to aggregate validation + cim**

In `outtake.md`, extend the result prose so the stage reads each transform-stage `config-file` result's `valid` flag → `passing_units` (count of `valid: true`) / `total_units` (count of units), and reads the sync-stage `SyncResult` to set `cim.ok` (true iff `drush config:import` exited 0). Add a sentence: "When the run is in eval (soft-gate) mode, units that failed validation are present with `valid: false` and still counted in `total_units` — do NOT exclude them."

- [ ] **Step 3: Confirm `sync.md` surfaces cim exit**

Read `sync.md`. It already produces `SyncResult { drush_summary, applied_config_names }`. Add a `cim_ok` boolean to its result (true iff the `drush config:import` command exited 0) so outtake can read it without re-parsing `drush_summary`. Update the sync `result` schema reference accordingly (add `cim_ok` to `SyncResult` in `schemas.yml`, `required`).

- [ ] **Step 4: Self-run pnpm check (skill prose can break fence regexes)**

```bash
cd /home/cw/projects/designbook/.claude/worktrees/export && pnpm check
```
Expected: PASS (no test reads these files' fences yet, but this guards against a malformed `schemas.yml`).

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/sync/schemas.yml .agents/skills/designbook/sync/tasks/outtake.md .agents/skills/designbook/sync/tasks/sync.md
git commit -m "feat(sync): ExportSummary carries per-unit validation + cim outcome"
```

---

### Task B2: Soft-gate eval mode in `workflowDone()`

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow.ts` (gate ~lines 1180-1190; `workflowDone` ~1035)
- Test: `packages/storybook-addon-designbook/src/workflow.test.ts` (or the nearest existing workflow test file)

**Interfaces:**
- Consumes: `TaskResult.valid` / `TaskResult.error` (already on the interface, ~workflow.ts:91-129).
- Produces: when the workflow scope carries `validation_gate: 'soft'` (set by a `sync-to` param `gate: soft` / `eval: true`), `workflowDone()` records each entry's `valid`/`error` and CONTINUES (archives) instead of returning `{ archived: false, validation_errors }`. Default (`hard`) is unchanged.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
// adjust imports to the file's existing test harness for building a workflow fixture

describe('workflowDone soft-gate eval mode', () => {
  it('hard gate (default): a failing unit blocks archive', async () => {
    const res = await runWorkflowDoneWith({ gate: 'hard', failingUnits: 1 });
    expect(res.archived).toBe(false);
    expect(res.response.validation_errors.length).toBeGreaterThan(0);
  });

  it('soft gate: a failing unit is recorded but the workflow archives', async () => {
    const res = await runWorkflowDoneWith({ gate: 'soft', failingUnits: 1, totalUnits: 3 });
    expect(res.archived).toBe(true);
    // failing unit recorded on its result entry
    const entries = res.data.tasks.flatMap((t) => Object.values(t.result ?? {}));
    expect(entries.filter((e) => e.valid === false).length).toBe(1);
    expect(entries.filter((e) => e.valid === true).length).toBe(2);
  });
});
```
(`runWorkflowDoneWith` is a test helper you write to assemble a minimal `tasks.yml` data object with N result entries, M of them failing validation, and the given `scope.validation_gate`. Model it on the existing workflow-test fixtures in this file.)

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /home/cw/projects/designbook/.claude/worktrees/export
pnpm --filter storybook-addon-designbook test -- workflow.test.ts -t "soft-gate"
```
Expected: FAIL — soft-gate path not implemented; the failing unit still blocks archive.

- [ ] **Step 3: Implement the soft-gate branch**

At the hard gate (workflow.ts ~1180), gate the early return on the mode. Read the mode from scope (default `'hard'`):

```ts
const validationGate = (data.scope?.validation_gate as 'hard' | 'soft') ?? 'hard';
if (validationErrors.length > 0 && validationGate === 'hard') {
  writeWorkflowAtomic(filePath, data);
  return {
    archived: false,
    data,
    response: {
      stage: data.current_stage ?? 'unknown',
      validation_errors: validationErrors,
    },
  };
}
// soft gate: validationErrors are already recorded on each entry's
// `valid`/`error` (set in validateResultEntry's caller); fall through to archive.
```
Ensure the per-entry loop that calls `validateResultEntry` writes `entry.valid = errs.length === 0` and `entry.error = errs.join('; ')` on EVERY entry (not only on the gate path), so soft mode persists the outcomes. If that assignment currently happens only inside the `validationErrors.length > 0` branch, hoist it to run per entry unconditionally.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
pnpm --filter storybook-addon-designbook test -- workflow.test.ts -t "soft-gate"
```
Expected: PASS (both hard + soft cases).

- [ ] **Step 5: Wire the `sync-to` param → scope**

In the sync-to workflow definition (`.agents/skills/designbook/sync/workflows/sync-to.md`), add an optional param `gate` (enum `[hard, soft]`, default `hard`) that maps into `scope.validation_gate`. (Load `designbook-skill-creator` first.) Verify `pnpm check` still passes.

- [ ] **Step 6: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow.ts packages/storybook-addon-designbook/src/workflow.test.ts .agents/skills/designbook/sync/workflows/sync-to.md
git commit -m "feat(workflow): soft-gate eval mode records per-unit validation and continues"
```

---

### Task B3: Promote `ExportSummary` into `workflow_output` at archive time; map it in `readSummary`

Follows the EXISTING result-object pipeline: `archiveWorkflow` → `injectFlowRate` writes `scope.workflow_output` → `readSummary` maps `workflow_output` → `SummaryResult` → `evaluateMetric` runs the JSONata over `SummaryResult`. `success_rate` / `score-report` already ride this path; the sync-to `ExportSummary` must ride it too (rather than a separate own-tasks scan in `readSummary`).

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow.ts` (`archiveWorkflow` ~252-271; reuse `findResultValue` ~217)
- Modify: `packages/storybook-addon-designbook/src/cli/workflow-summary.ts` (`WorkflowOutput` ~35-43; `SummaryResult` ~21-33; `readSummary` mapping block ~89-107)
- Test: `packages/storybook-addon-designbook/src/__tests__/workflow-archive-score.test.ts` (archive-time promotion) + `packages/storybook-addon-designbook/src/cli/__tests__/workflow-summary.test.ts` (mapping)

**Interfaces:**
- Consumes: the outtake stage's `summary` result value (the `ExportSummary`) from the archiving workflow's own `wf.tasks[].result.summary.value`, via the existing `findResultValue(wf, 'summary')` helper.
- Produces: `scope.workflow_output.export_summary` (snake_case, on-disk) → `SummaryResult.exportSummary` (camelCase). Shape: `{ config_names, count, validation: { passing_units, total_units }, cim: { ok } }`. This is what the composite metric JSONata reads `validate_pass_rate` and `cim.ok` from.

- [ ] **Step 1: Write the failing archive-time test**

In `workflow-archive-score.test.ts` (mirror its existing `injectFlowRate`/scope style):

```ts
it('promotes the outtake ExportSummary into workflow_output.export_summary', () => {
  const wf = makeWorkflowFixture({
    tasks: [
      { title: 'Outtake', type: 'data',
        result: { summary: { value: {
          config_names: ['node.type.article'], count: 1,
          validation: { passing_units: 3, total_units: 4 }, cim: { ok: true },
        } } } },
    ],
  });
  archiveWorkflowForTest(DATA_DIR, 'sync-to', wf); // helper that runs archiveWorkflow + reads back tasks.yml
  const wo = readBackScope(DATA_DIR, 'sync-to').workflow_output;
  expect(wo.export_summary.validation.passing_units).toBe(3);
  expect(wo.export_summary.cim.ok).toBe(true);
});
```
(Use the file's existing fixture/readback helpers; if `archiveWorkflow` is not exported, export it for the test as the sibling functions already are.)

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /home/cw/projects/designbook/.claude/worktrees/export
pnpm --filter storybook-addon-designbook test -- workflow-archive-score.test.ts -t "export_summary"
```
Expected: FAIL — `wo.export_summary` is undefined.

- [ ] **Step 3: Promote at archive time**

In `archiveWorkflow` (workflow.ts ~261, right after `injectFlowRate(dataDir, scope);`):

```ts
  // Promote the outtake ExportSummary (if the workflow produced one) so the
  // metric can read validation + cim, same path as flow_rate/score-report.
  const exportSummary = findResultValue(wf, 'summary');
  if (exportSummary && typeof exportSummary === 'object') {
    (scope.workflow_output as Record<string, unknown>).export_summary = exportSummary;
  }
```
(`findResultValue` already walks `wf.tasks[].result[key].value` and returns the first defined — no new helper.)

- [ ] **Step 4: Run the archive test to verify it passes**

```bash
pnpm --filter storybook-addon-designbook test -- workflow-archive-score.test.ts -t "export_summary"
```
Expected: PASS.

- [ ] **Step 5: Write the failing mapping test**

In `workflow-summary.test.ts` (mirror the existing `workflow_output` fixture style at its top):

```ts
it('maps export_summary from workflow_output into SummaryResult.exportSummary', () => {
  const wo = {
    flow_rate: 100,
    export_summary: {
      config_names: ['node.type.article'], count: 1,
      validation: { passing_units: 3, total_units: 4 }, cim: { ok: true },
    },
  };
  const r = readSummaryFromFixture({ scope: { workflow_output: wo } })!;
  expect(r.exportSummary!.validation.total_units).toBe(4);
  expect(r.exportSummary!.cim.ok).toBe(true);
});
```

- [ ] **Step 6: Add the type + the mapping**

In `workflow-summary.ts`, extend `WorkflowOutput` (~35-43):

```ts
  export_summary?: {
    config_names?: string[];
    count?: number;
    validation?: { passing_units?: number; total_units?: number };
    cim?: { ok?: boolean };
  };
```
Add to `SummaryResult` (~21-33):

```ts
  /** The sync-to outtake ExportSummary, promoted into workflow_output at archive time. */
  exportSummary?: {
    config_names: string[];
    count: number;
    validation: { passing_units: number; total_units: number };
    cim: { ok: boolean };
  };
```
In `readSummary`'s result-object spread (~89-107), add a mapping line alongside the others (only when present + well-formed):

```ts
    ...(wo.export_summary?.validation && wo.export_summary.cim
      ? {
          exportSummary: {
            config_names: wo.export_summary.config_names ?? [],
            count: wo.export_summary.count ?? 0,
            validation: {
              passing_units: wo.export_summary.validation.passing_units ?? 0,
              total_units: wo.export_summary.validation.total_units ?? 0,
            },
            cim: { ok: wo.export_summary.cim.ok ?? false },
          },
        }
      : {}),
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
pnpm --filter storybook-addon-designbook test -- workflow-summary.test.ts workflow-archive-score.test.ts
```
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow.ts packages/storybook-addon-designbook/src/cli/workflow-summary.ts packages/storybook-addon-designbook/src/__tests__/workflow-archive-score.test.ts packages/storybook-addon-designbook/src/cli/__tests__/workflow-summary.test.ts
git commit -m "feat(summary): promote sync-to ExportSummary into workflow_output → SummaryResult"
```

---

## Phase C — Existence check + `expected_config`

### Task C1: `designbook:config-exists` drush helper

**Files:**
- Modify: `packages/integrations/drupal-fixture/web/modules/custom/designbook_config_schema/src/Commands/*.php` (the existing drush command class) — add a `config-exists` command.
- Modify: the module's `drush.services.yml` / command registration if needed.

**Interfaces:**
- Produces: `drush designbook:config-exists <name1> <name2> …` → JSON to stdout: `{ "<name>": true|false, … }` where the bool is "this config object is active in the running site" (`\Drupal::config(<name>)->isNew() === false`). Exit 0 always (presence is in the payload, not the exit code).

> This is the approved exception: a small readable drush helper in the integration fixture. Keep it minimal + readable. No logic leaks into core.

- [ ] **Step 1: Add the command method**

In the existing Drush command class (mirror the style of `designbook:config-schema`):

```php
/**
 * Report which config objects are active in the running site.
 *
 * @command designbook:config-exists
 * @param string $names One or more config names (variadic).
 * @aliases dbce
 */
public function configExists(array $names): void {
  $out = [];
  foreach ($names as $name) {
    // A config object that has never been saved is "new"; active config is not.
    $out[$name] = !\Drupal::config($name)->isNew();
  }
  $this->io()->writeln(json_encode($out, JSON_UNESCAPED_SLASHES));
}
```
(Adjust the method signature / annotation style to match the class's Drush major version — copy the pattern from the sibling `config-schema` command exactly.)

- [ ] **Step 2: Verify against a live workspace**

```bash
cd /home/cw/projects/designbook/.claude/worktrees/export
./scripts/start-drupal-workspace.sh evalwt
cd workspaces/evalwt
ddev drush designbook:config-exists system.site no.such.config
```
Expected: `{"system.site":true,"no.such.config":false}`.

- [ ] **Step 3: Commit**

```bash
cd /home/cw/projects/designbook/.claude/worktrees/export
git add packages/integrations/drupal-fixture/web/modules/custom/designbook_config_schema
git commit -m "feat(drupal-fixture): designbook:config-exists drush helper (JSON presence map)"
```

---

### Task C2: Summary CLI parses `expected_config` + injects `existenceRate`

**Files:**
- Modify: `packages/storybook-addon-designbook/src/cli/workflow-summary.ts` (case parsing ~65-77; SummaryResult; register/metric ~177-209)
- Test: `packages/storybook-addon-designbook/src/cli/workflow-summary.test.ts`

**Interfaces:**
- Consumes: `expected_config:` (string list) from the `--case` yaml; `SummaryResult.exportSummary` (Task B3) for cim/validation.
- Produces: `SummaryResult.existenceRate` (0..1) = present / `expected_config`.length, computed by running the existence command. A new CLI option `--config-exists-cmd <cmd>` (default `ddev drush designbook:config-exists`) makes the drush invocation overridable + testable (the test passes a stub script). When `expected_config` is absent, `existenceRate` is omitted.

- [ ] **Step 1: Write the failing test**

```ts
it('computes existenceRate from expected_config via the exists command', async () => {
  // stub exists-cmd: a node script echoing a fixed JSON presence map
  const stub = writeStub('{"node.type.landing_page":true,"node.type.article":false}');
  const caseFile = writeCase({ expected_config: ['node.type.landing_page', 'node.type.article'] });
  const r = await buildSummaryForCli({
    dataDir: FIXTURE_DIR, workflowName: 'sync-to', caseFile, configExistsCmd: stub,
  });
  expect(r.existenceRate).toBeCloseTo(0.5);
});

it('omits existenceRate when the case has no expected_config', async () => {
  const caseFile = writeCase({ assert: [] });
  const r = await buildSummaryForCli({ dataDir: FIXTURE_DIR, workflowName: 'sync-to', caseFile });
  expect(r.existenceRate).toBeUndefined();
});
```
(Add a small exported helper, e.g. `computeExistenceRate(names: string[], cmd: string): Promise<number>`, that shells `<cmd> <names…>`, parses the JSON map, and returns present/total. The stub is a `node -e` script written to a temp path.)

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm --filter storybook-addon-designbook test -- workflow-summary.test.ts -t "existenceRate"
```
Expected: FAIL — `existenceRate` undefined / helper missing.

- [ ] **Step 3: Implement parse + existence injection**

Extend the case-doc type + add the helper:

```ts
import { execSync } from 'node:child_process';

export async function computeExistenceRate(names: string[], cmd: string): Promise<number> {
  if (names.length === 0) return 0;
  let map: Record<string, boolean> = {};
  try {
    const out = execSync(`${cmd} ${names.map((n) => `'${n}'`).join(' ')}`, { encoding: 'utf-8' });
    map = JSON.parse(out) as Record<string, boolean>;
  } catch {
    return 0; // existence cmd failed → nothing is present
  }
  const present = names.filter((n) => map[n] === true).length;
  return present / names.length;
}
```
Add `existenceRate?: number` to `SummaryResult`. Add `expected_config?: string[]` to the parsed case-doc type (the `parseYaml` cast at ~line 66). In the CLI `register()` flow, after `readSummary`, when the case carries `expected_config`, compute and attach:

```ts
const caseDoc = parseYaml(readFileSync(opts.caseFile, 'utf-8')) as
  { assert?: Assertion[]; expected_config?: string[] } | null;
if (caseDoc?.expected_config?.length) {
  r.existenceRate = await computeExistenceRate(
    caseDoc.expected_config,
    opts.configExistsCmd ?? 'ddev drush designbook:config-exists',
  );
}
```
Add the `--config-exists-cmd <cmd>` option to the `summary` command and thread it into `opts`.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
pnpm --filter storybook-addon-designbook test -- workflow-summary.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/workflow-summary.ts packages/storybook-addon-designbook/src/cli/workflow-summary.test.ts
git commit -m "feat(summary): expected_config existence check → existenceRate"
```

---

## Phase D — Sync cases

### Task D1: Author the four sync cases with the composite metric

**Files:**
- Create: `fixtures/drupal-web/cases/sync-paragraph.yaml`, `sync-node.yaml`, `sync-view.yaml`, `sync-image-style.yaml`.

**Interfaces:**
- Consumes: the reduced data-model (A1), the eval-surface fields (`exportSummary.validation`, `exportSummary.cim.ok`, `existenceRate`) produced by Phase B+C.
- Produces: four independently-runnable cases. The metric JSONata (identical across all four) reads:
  - `validate_pass_rate` = `exportSummary.validation.passing_units / exportSummary.validation.total_units`
  - `cim_ok` = `exportSummary.cim.ok`
  - `existence_rate` = `existenceRate`

The composite metric expression (copy verbatim into each case's `metric:`):

```
(
  $vpr := exportSummary.validation.passing_units / exportSummary.validation.total_units;
  $er := existenceRate;
  $base := 0.6 * $vpr + 0.4 * $er;
  exportSummary.cim.ok ? $base * 100 : $base * 50
)
```
(`*100` puts the score on the 0..100 scale the loop's `$TARGET` default expects; cim-fail floor halves it.)

- [ ] **Step 1: Write `sync-paragraph.yaml`**

```yaml
fixtures:
  - vision
  - data-model
  - design-entity

prompt: |
  You are working in the directory {{workspace}}.
  Run the /debo sync-to workflow in eval mode (gate: soft) to export the
  paragraph.signage and paragraph.signage_item bundles to Drupal config.
  Filter the export to entity_type=paragraph. Author the per-config-name JSONata
  against the prepare-fetched schema, write each config YAML, validate, and run
  drush config:import. Do NOT ask any questions; if a decision cannot be made
  from the data model + fixtures, fail the run.

assert:
  - type: javascript
    value: output.archivedWorkflows['sync-to']?.status === 'completed'

expected_config:
  - paragraph.paragraph_type.signage
  - paragraph.paragraph_type.signage_item
  - core.entity_view_display.paragraph.signage.full
  - core.entity_view_display.paragraph.signage_item.full

metric: |
  (
    $vpr := exportSummary.validation.passing_units / exportSummary.validation.total_units;
    $er := existenceRate;
    $base := 0.6 * $vpr + 0.4 * $er;
    exportSummary.cim.ok ? $base * 100 : $base * 50
  )
direction: max
```

- [ ] **Step 2: Write `sync-node.yaml`**

Same shape; `prompt` exports `node.landing_page` + `node.article` (filter `entity_type=node`); `expected_config`:
```yaml
expected_config:
  - node.type.landing_page
  - node.type.article
  - core.entity_view_display.node.landing_page.teaser
  - field.field.node.landing_page.field_short_title
```
(Plus whatever `field.storage.node.*` / `field.field.node.*` names the reduced model yields — list the ones that must exist; keep the list to the high-signal config names.)

- [ ] **Step 3: Write `sync-view.yaml` (the view-mapping path)**

`prompt` exports the `views.view.landing_teasers` config slice (filter `config_key=views.view.landing_teasers`); `expected_config`:
```yaml
expected_config:
  - views.view.landing_teasers
```

- [ ] **Step 4: Write `sync-image-style.yaml`**

`prompt` exports the image styles (filter `config_key` prefix `image_style`); `expected_config`:
```yaml
expected_config:
  - image.style.ratio_16_9
  - image.style.ratio_4_3
  - image.style.ratio_1_1
```

- [ ] **Step 5: Smoke-run one case end-to-end via `--baseline-only`**

```bash
cd /home/cw/projects/designbook/.claude/worktrees/export
# loop entry point — adjust to the actual debo-test invocation:
# (research.md drives Score-a-case; --baseline-only stops after iteration 0)
```
Run the research loop on `sync-image-style` (the simplest case) with `--baseline-only` against the live `evalwt` workspace. Expected: a numeric metric value (0..100), not `crash` / `metric: null`. If `metric: null`, inspect `summary.json` — `exportSummary` or `existenceRate` is missing → revisit B3 / C2.

- [ ] **Step 6: Commit**

```bash
git add fixtures/drupal-web/cases/sync-*.yaml
git commit -m "fixture(drupal-web): four sync-to eval cases with composite metric"
```

---

## Phase E — Loop / ddev changes

### Task E1: Per-case Drupal-state reset in Score-a-case

**Files:**
- Create: `scripts/reset-drupal-config.sh`
- Modify: `.agents/skills/designbook-test/workflows/research.md` (Score-a-case procedure)

**Interfaces:**
- Produces: a Score-a-case that, for a sync case, resets Drupal to the committed `db.sql.gz` baseline BEFORE layering the case — so case N's synced config never leaks into case N+1's existence-check.

> REQUIRED: load `designbook-skill-creator` before editing `research.md`.

- [ ] **Step 1: Write `reset-drupal-config.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
# Reset the workspace's Drupal DB to the committed fixture baseline, so each
# sync case scores against a clean config state (the git reset alone does NOT
# revert the live DB/config).
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME="${1:?usage: reset-drupal-config.sh <workspace-name>}"
WS="$REPO_ROOT/workspaces/$NAME"
[ -d "$WS" ] || { echo "No workspace $WS" >&2; exit 1; }
cd "$WS"
[ -f "$WS/db.sql.gz" ] || { echo "No baseline db.sql.gz in $WS" >&2; exit 1; }
ddev import-db --file="$WS/db.sql.gz"
echo "✓ Drupal config reset to baseline for workspace $NAME"
```

- [ ] **Step 2: Add the reset step to Score-a-case in `research.md`**

In the Score-a-case procedure, between the git-reset step (1) and the fixture-layer step (2), insert a conditional step for sync cases:

> 1b. **(sync cases only) Reset Drupal config state to baseline:** `./scripts/reset-drupal-config.sh $SUITE`. The `git reset` in step 1 reverts the filesystem but NOT the live Drupal DB; without this re-import, a prior case's synced config stays active and poisons this case's existence-check. Detect a sync case by the presence of `expected_config:` in `cases/c.yaml`.

Also add `expected_config:` to the documented case-yaml field list in research.md (next to `metric:`/`direction:`), noting it drives the existence component of the metric.

- [ ] **Step 3: Self-run pnpm check**

```bash
cd /home/cw/projects/designbook/.claude/worktrees/export && pnpm check
```
Expected: PASS.

- [ ] **Step 4: Verify the reset works**

```bash
./scripts/start-drupal-workspace.sh evalwt
cd workspaces/evalwt && ddev drush config:set system.site name "DIRTY" -y
cd /home/cw/projects/designbook/.claude/worktrees/export && ./scripts/reset-drupal-config.sh evalwt
cd workspaces/evalwt && ddev drush config:get system.site name
```
Expected: the name is the baseline value, not `DIRTY`.

- [ ] **Step 5: Commit**

```bash
cd /home/cw/projects/designbook/.claude/worktrees/export
git add scripts/reset-drupal-config.sh .agents/skills/designbook-test/workflows/research.md
git commit -m "feat(research): per-case Drupal-state reset for sync cases"
```

---

### Task E2: Worktree-per-run init for parallel runs

**Files:**
- Create: `scripts/init-research-worktree.sh`
- Modify: `.agents/skills/designbook-test/workflows/research.md` (parallelism note)

**Interfaces:**
- Produces: a script that provisions an isolated git worktree + its own ddev-backed workspace, so N concurrent research runs don't collide on one ddev or one git working tree. ddev project names are already worktree-namespaced (`db-$WT_ID-$NAME`, `WT_ID = cksum(REPO_ROOT)`), so distinct worktrees get distinct ddev projects automatically.

- [ ] **Step 1: Write `init-research-worktree.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
# Provision an isolated git worktree + Drupal workspace for a parallel research
# run. Each run gets its own theme-dir git root (so `git reset --hard` is
# independent) and its own worktree-namespaced ddev project (no port clash).
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_ID="${1:?usage: init-research-worktree.sh <run-id> [suite]}"
SUITE="${2:-drupal-web}"
WT_DIR="$REPO_ROOT/.research-worktrees/$RUN_ID"

git -C "$REPO_ROOT" worktree add "$WT_DIR" HEAD
( cd "$WT_DIR" && ./scripts/setup-workspace.sh "$SUITE" )
( cd "$WT_DIR" && ./scripts/start-drupal-workspace.sh "$SUITE" )
echo "✓ Research worktree ready: $WT_DIR (ddev db-$(printf '%s' "$WT_DIR" | cksum | cut -d' ' -f1)-$SUITE)"
echo "  Run the loop with this worktree as CWD."
```

- [ ] **Step 2: Add a parallelism note to `research.md`**

In research.md's "Where it runs" / setup section, add: a single sequential run uses the current worktree/ddev unchanged; to run >1 research run concurrently, provision each with `./scripts/init-research-worktree.sh <run-id>` and start the loop from that worktree — each gets an isolated theme-dir git root + its own ddev project. (Load `designbook-skill-creator` first.)

- [ ] **Step 3: Verify the worktree provisions + cleans up**

```bash
cd /home/cw/projects/designbook/.claude/worktrees/export
./scripts/init-research-worktree.sh smoke drupal-web
git worktree list | grep smoke
# cleanup
git worktree remove --force .research-worktrees/smoke
```
Expected: the worktree appears, its ddev project name carries a distinct `WT_ID`, removal succeeds.

- [ ] **Step 4: pnpm check + commit**

```bash
pnpm check
git add scripts/init-research-worktree.sh .agents/skills/designbook-test/workflows/research.md
git commit -m "feat(research): worktree-per-run init for parallel sync evals"
```

---

## Phase F — Eval validity

### Task F1: Prove the metric discriminates

**Files:**
- Modify: `.agents/skills/designbook-test/workflows/research.md` (Testing section — record the validation procedure)

**Interfaces:**
- Produces: documented evidence that the eval's gradient is real: a good baseline scores high, a deliberately-broken skill prose scores lower, and the train/val gate rejects an overfit.

- [ ] **Step 1: Baseline-high check**

Run the loop `--baseline-only` on `sync-paragraph` (a case with real existing mappings) against `evalwt`. Record the metric. Expected: high (the signage entity-mapping already works → `validate_pass_rate` ≈ 1, `cim_ok` true, `existence_rate` ≈ 1 → score ≈ 100).

- [ ] **Step 2: Broken-prose-lower check**

Temporarily corrupt a sync skill blueprint (e.g. remove a required key from the transform guidance), re-run `--baseline-only` on the same case. Expected: a LOWER score (some units fail validation → `validate_pass_rate` drops, or cim fails → halved). Restore the prose (`git restore`).

- [ ] **Step 3: Train/val gate check**

Run a full short loop (`--iterations 3`) with `sync-paragraph` as train and `sync-node,sync-view` as val. Confirm the loop keeps only changes that improve the held-out val mean, and discards a train-only improvement. (This exercises the existing gate; no new code — just confirm it behaves with sync cases.)

- [ ] **Step 4: Record findings in research.md Testing section**

Add a short "Sync eval validity" subsection noting the three checks above and the observed baseline score, so future changes have a reference point. (Load `designbook-skill-creator` first.) `pnpm check`.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook-test/workflows/research.md
git commit -m "docs(research): sync-eval validity checks + baseline reference"
```

---

## Self-Review

**Spec coverage (each spec section → task):**
- Suite = reduced `drupal-web` (signage + landing_page/article view) → A1–A4. ✓
- Sync cases (`sync-paragraph`/`sync-node`/`sync-view`/`sync-image-style`) → D1. ✓
- Eval-in-fixture (`expected_config:`) → D1 (authoring) + C2 (parsing) + E1 (research.md field doc). ✓
- Composite metric (validate_pass_rate + cim gate + existence_rate, cim-fail floor) → D1 (expression) reading B3 (`exportSummary`) + C2 (`existenceRate`). ✓
- sync-to surface: per-unit validate in summary → B1+B3; soft-gate eval mode → B2; existence check → C1+C2. ✓
- Worktree-per-run isolation + per-case Drupal reset → E1+E2. ✓
- Testing (baseline-high / broken-lower / train-val gate) → F1. ✓

**Placeholder scan:** Field-name lists in D1 step 2 say "plus whatever `field.storage.node.*` the reduced model yields" — this is bounded by the A1 model (the implementer reads the model and lists the exact names); not an open-ended TODO. All code steps carry real code.

**Type consistency:** `exportSummary.validation.{passing_units,total_units}` and `exportSummary.cim.ok` are spelled identically in B1 (schema), B3 (TS type + test), and D1 (metric JSONata). `existenceRate` (camelCase, TS) vs `existence_rate` (metric prose) — the metric JSONata reads `existenceRate` (the SummaryResult field), confirmed in D1's expression. `validation_gate` (scope) ↔ `gate` (sync-to param) mapping is explicit in B2 step 5.

**Open seam (flagged, not a gap):** existence uses a live `drush` check (spec's explicit choice) rather than the cheaper `SyncResult.applied_config_names` proxy; `--config-exists-cmd` keeps it overridable + testable. If the live-drush coupling proves brittle in execution, the fallback (intersect `expected_config` with `applied_config_names`, no live call) is a one-line change in C2 — but the spec wants the honest post-cim check, so that is the default.
