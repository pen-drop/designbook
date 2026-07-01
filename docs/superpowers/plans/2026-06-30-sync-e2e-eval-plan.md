# Sync-to e2e Eval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an agent-in-loop eval that scores how well `sync-to` authors schema-conforming, importable Drupal config — by reducing `drupal-web` to a real two-mapping slice, adding sync cases with a composite metric, and scoring them with a **separate eval scorer** (kept out of production sync-to + core addon) against a live ddev Drupal.

**Architecture:** Reuse the `debo-test` research loop. Each sync case is a `fixtures/drupal-web/cases/sync-*.yaml` carrying an `expected_config:` list; the case prompt drives `/debo sync-to` via the loop's driver subagent. **The eval is kept separate from the production result:** production `sync-to` + the core addon summary CLI are NOT extended with eval fields. Instead a standalone **eval scorer** in the `designbook-test` layer reads three sources and emits the composite score — `validate_pass_rate` (per-unit `valid` flags in the archived `tasks.yml`, made complete by a soft-gate run-mode), `cim_ok` (the sync stage's `SyncResult`), and `existence_rate` (post-cim live `drush` check against `expected_config`). The only core-addon touch is the soft-gate run-mode (a general "report all validation failures and continue" mode, default off). All Drupal-specific + eval-specific logic stays in the integration/test layer, honoring "no backend code in core."

**Tech Stack:** TypeScript (storybook-addon-designbook `workflow.ts` — soft-gate only), Vitest, Node + `js-yaml` + JSONata (the standalone eval scorer), designbook skill prose (`.agents/skills/designbook/sync/**`, `.agents/skills/designbook-test/**`), Drupal/drush (`designbook_config_schema` helper module), ddev, bash scripts.

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

**Soft-gate run-mode — Phase B (one core-addon touch):**
- `packages/storybook-addon-designbook/src/workflow.ts` — soft-gate eval mode in `workflowDone()` (record per-unit validation + continue).
- `.agents/skills/designbook/sync/tasks/sync.md` + `.agents/skills/designbook/sync/schemas.yml` — `SyncResult` records `cim_ok` (drush config:import exit), so the scorer can read it without re-parsing text.
- `.agents/skills/designbook/sync/workflows/sync-to.md` — `gate` param → `scope.validation_gate`.

**Existence helper — Phase C:**
- `packages/integrations/drupal-fixture/web/modules/custom/designbook_config_schema/**` — new `designbook:config-exists` drush subcommand (JSON presence map). No core-addon change.

**Eval scorer + sync cases — Phase D (all eval logic lives here, test/integration layer):**
- `.agents/skills/designbook-test/resources/sync-eval-score.mjs` — standalone scorer: reads archived `tasks.yml` (per-unit `valid` → validate_pass_rate; `SyncResult.cim_ok`), the case `expected_config` + live `drush designbook:config-exists` → existence_rate, applies the case `metric:` JSONata → emits `{ validate_pass_rate, cim_ok, existence_rate, metric }`.
- `fixtures/drupal-web/cases/sync-{paragraph,node,view,image-style}.yaml`.

**Loop / ddev — Phase E:**
- `.agents/skills/designbook-test/workflows/research.md` — Score-a-case branches to the scorer for sync cases; per-case Drupal reset; parallel-run note.
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

## Phase B — Soft-gate run-mode + `cim_ok` (one core-addon touch)

### Task B1: `SyncResult` records `cim_ok`

The scorer (Phase D) reads the cim outcome from the archived `tasks.yml`. `SyncResult` currently carries only `drush_summary` (text) + `applied_config_names`; add a clean boolean so the scorer needn't parse drush text. This is a skill/integration change — NOT a core-addon change.

**Files:**
- Modify: `.agents/skills/designbook/sync/schemas.yml` (`SyncResult`, ~lines 64-85)
- Modify: `.agents/skills/designbook/sync/tasks/sync.md`

**Interfaces:**
- Produces: `SyncResult.cim_ok: boolean` (true iff the sync stage's `drush config:import --partial` exited 0). The scorer reads this for the cim gate.

> REQUIRED: load `designbook-skill-creator` before editing these skill files.

- [ ] **Step 1: Add `cim_ok` to `SyncResult` in `schemas.yml`**

In `SyncResult.properties` add, and append to `required`:

```yaml
    cim_ok:
      type: boolean
      description: True when the drush config:import (--partial) invocation exited 0.
```
Update `required: [drush_summary, applied_config_names]` → `required: [drush_summary, applied_config_names, cim_ok]`.

- [ ] **Step 2: Set `cim_ok` in `sync.md`**

In `sync.md`, extend the result prose so the sync stage sets `cim_ok: true` iff `drush config:import --partial` exited 0 (and `false` otherwise — the stage still records `drush_summary` verbatim for the audit). Do NOT make the stage abort on a non-zero import here; the eval needs the run to complete so the scorer can read the outcome.

- [ ] **Step 3: Self-run pnpm check (skill prose can break fence regexes)**

```bash
cd /home/cw/projects/designbook/.claude/worktrees/export && pnpm check
```
Expected: PASS (guards against a malformed `schemas.yml`).

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/sync/schemas.yml .agents/skills/designbook/sync/tasks/sync.md
git commit -m "feat(sync): SyncResult records cim_ok (drush config:import exit)"
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

## Phase C — Existence helper (drush, integration layer)

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

## Phase D — Eval scorer + sync cases

### Task D1: Standalone sync-eval scorer

All eval-specific logic lives HERE (test/integration layer), not in production sync-to or the core addon. A standalone Node script reads the archived run + the case + live drush, folds the composite via the case's own `metric:` JSONata, and emits a `metric` number — a drop-in for `workflow summary --metric --json` (Score-a-case swaps to it for sync cases, Task E1b).

**Files:**
- Create: `.agents/skills/designbook-test/resources/sync-eval-score.mjs`

**Interfaces:**
- Consumes:
  - archived `tasks.yml` at `<data-dir>/workflows/archive/<workflow>/tasks.yml` — per-unit transform results (`result['config-file'].valid`) → `validate_pass_rate`; the `SyncResult` value (`cim_ok`) → `cim_ok`.
  - the case yaml — `expected_config` (existence denominator), `metric` (the fold), `direction`.
  - `designbook:config-exists` (Task C1) via `--config-exists-cmd` (default `ddev drush designbook:config-exists`) → `existence_rate`.
- Produces (stdout JSON): `{ validate_pass_rate, cim_ok, existence_rate, metric }`, where `metric` is the case `metric:` JSONata evaluated over `{ validate_pass_rate, cim_ok, existence_rate }`. Same output contract as `workflow summary --metric --json` (the loop reads `.metric`).

> This is a skill-resource script, not core addon TS. It imports `js-yaml` + `jsonata` from the workspace `node_modules` (both are addon deps, resolvable from the theme dir).

- [ ] **Step 1: Write the scorer**

```js
#!/usr/bin/env node
// sync-eval-score.mjs — composite sync-to eval score. Kept OUT of production
// sync-to + the core addon: reads the archived run + case + live drush.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { load as parseYaml } from 'js-yaml';
import jsonata from 'jsonata';

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : def;
}

const dataDir = arg('data-dir');
const workflow = arg('workflow');
const caseFile = arg('case');
const existsCmd = arg('config-exists-cmd', 'ddev drush designbook:config-exists');

const tasks = parseYaml(readFileSync(`${dataDir}/workflows/archive/${workflow}/tasks.yml`, 'utf-8'));
const caseDoc = parseYaml(readFileSync(caseFile, 'utf-8'));

// validate_pass_rate: per-unit transform results carry result['config-file'].valid
const units = (tasks.tasks ?? []).flatMap((t) => {
  const e = t.result?.['config-file'];
  return e ? [e] : [];
});
const total = units.length;
const passing = units.filter((e) => e.valid === true).length;
const validate_pass_rate = total > 0 ? passing / total : 0;

// cim_ok: the SyncResult value (the only result carrying a cim_ok boolean)
let cim_ok = false;
for (const t of tasks.tasks ?? []) {
  for (const e of Object.values(t.result ?? {})) {
    if (e && typeof e.value === 'object' && e.value !== null && 'cim_ok' in e.value) {
      cim_ok = e.value.cim_ok === true;
    }
  }
}

// existence_rate: fraction of expected_config names active post-cim (live drush)
const expected = caseDoc.expected_config ?? [];
let existence_rate = 0;
if (expected.length > 0) {
  try {
    const out = execSync(`${existsCmd} ${expected.map((n) => `'${n}'`).join(' ')}`, { encoding: 'utf-8' });
    const map = JSON.parse(out);
    existence_rate = expected.filter((n) => map[n] === true).length / expected.length;
  } catch {
    existence_rate = 0;
  }
}

const components = { validate_pass_rate, cim_ok, existence_rate };
const expr = caseDoc.metric ?? 'validate_pass_rate';
const metric = await jsonata(expr).evaluate(components);
console.log(JSON.stringify({ ...components, metric: typeof metric === 'number' ? metric : null }));
```

- [ ] **Step 2: Verify with a crafted archive + stub drush**

Assemble a throwaway `tasks.yml` (3 passing `config-file` results, 1 failing; one result value `{ cim_ok: true }`) + a stub exists-cmd (`printf '{"a":true,"b":false}'`) + a case yaml with `expected_config: [a, b]` and the composite `metric:` from Task D2. Run:
```bash
node .agents/skills/designbook-test/resources/sync-eval-score.mjs \
  --data-dir <tmp> --workflow sync-to --case <tmp-case.yaml> \
  --config-exists-cmd 'printf {"a":true,"b":false}'
```
Expected: `validate_pass_rate` = 0.75, `existence_rate` = 0.5, `cim_ok` = true, `metric` = `(0.6*0.75 + 0.4*0.5)*100` = 65.

- [ ] **Step 3: Commit**

```bash
cd /home/cw/projects/designbook/.claude/worktrees/export
git add .agents/skills/designbook-test/resources/sync-eval-score.mjs
git commit -m "feat(research): standalone sync-eval scorer (validate + cim + existence → composite)"
```

---

### Task D2: Author the four sync cases

**Files:**
- Create: `fixtures/drupal-web/cases/sync-paragraph.yaml`, `sync-node.yaml`, `sync-view.yaml`, `sync-image-style.yaml`.

**Interfaces:**
- Consumes: the reduced data-model (A1); scored by the D1 scorer.
- Produces: four independently-runnable cases. The metric JSONata (identical across all four) reads the scorer's flat component object:
  - `validate_pass_rate`, `cim_ok`, `existence_rate`.

The composite metric expression (copy verbatim into each case's `metric:`):

```
(
  $vpr := validate_pass_rate;
  $er := existence_rate;
  $base := 0.6 * $vpr + 0.4 * $er;
  cim_ok ? $base * 100 : $base * 50
)
```
(`*100` puts the score on the 0..100 scale the loop's `$TARGET` default expects; cim-fail floor halves it. Weights live in the case yaml — tunable per case.)

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
    $vpr := validate_pass_rate;
    $er := existence_rate;
    $base := 0.6 * $vpr + 0.4 * $er;
    cim_ok ? $base * 100 : $base * 50
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

Run the research loop on `sync-image-style` (the simplest case) with `--baseline-only` against the live `evalwt` workspace (the loop's Score-a-case invokes the D1 scorer for sync cases per Task E1). Expected: a numeric metric value (0..100), not `crash` / `metric: null`. If `metric: null`, run the scorer directly against the archived run to isolate: a missing `config-file` result → validate_pass_rate 0 (revisit soft-gate B2); a missing `cim_ok` → SyncResult (revisit B1); existence 0 → drush helper / `--config-exists-cmd` (revisit C1 / D1).

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
- Produces: a Score-a-case that (1) for a sync case resets Drupal to the committed `db.sql.gz` baseline BEFORE layering the case — so case N's synced config never leaks into case N+1's existence-check; and (2) scores sync cases via the D1 scorer instead of `workflow summary --metric`.

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

- [ ] **Step 2b: Branch Score-a-case scoring to the eval scorer for sync cases**

In Score-a-case's scoring step (currently `workflow summary --metric "$METRIC" --json`), add a branch: when the case is a sync case (has `expected_config:`), score via the D1 scorer instead — it returns the same `.metric` contract:

> **Score (sync cases):** `node ../../.agents/skills/designbook-test/resources/sync-eval-score.mjs --data-dir <designbook-data-dir> --workflow <id> --case ../../fixtures/$SUITE/cases/c.yaml` → the returned `metric` value is this case's score. (Design cases keep using `workflow summary --metric`.) Both write the JSON to `research-runs/<slug>/iterations/<NNN>/cases/c/summary.json`; a non-numeric/`null` `metric` is a **crash** (same as today).

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
- Sync cases (`sync-paragraph`/`sync-node`/`sync-view`/`sync-image-style`) → D2. ✓
- Eval-in-fixture (`expected_config:`) → D2 (authoring) + D1 scorer (reads it) + E1 (research.md field doc). ✓
- Composite metric (validate_pass_rate + cim gate + existence_rate, cim-fail floor) → D2 (case `metric:` expression) folded by the D1 scorer over its `{validate_pass_rate, cim_ok, existence_rate}` components. ✓
- **Eval kept separate from production result** → all eval logic in the D1 scorer (test/integration layer); the only core-addon touch is the soft-gate run-mode (B2). ✓
- sync-to signal: per-unit validate available (soft-gate so all units run) → B2; cim outcome → B1 (`SyncResult.cim_ok`); existence → C1 (drush helper) + D1 (scorer). ✓
- Worktree-per-run isolation + per-case Drupal reset + scorer branch → E1+E2. ✓
- Testing (baseline-high / broken-lower / train-val gate) → F1. ✓

**Placeholder scan:** Field-name lists in D2 step 2 say "plus whatever `field.storage.node.*` the reduced model yields" — bounded by the A1 model (the implementer reads the model and lists the exact names); not an open-ended TODO. All code steps carry real code.

**Type consistency:** the scorer emits flat `{ validate_pass_rate, cim_ok, existence_rate }` (snake_case), and every case `metric:` JSONata (D2) reads exactly those names — confirmed identical in D1's `components` object and D2's expression. `cim_ok` is spelled identically in B1 (`SyncResult` schema), the D1 scorer (reads `value.cim_ok`), and D2 (metric). `validation_gate` (scope) ↔ `gate` (sync-to param) mapping is explicit in B2 step 5. The scorer keys off the transform result key `config-file` (per resolve-filter/transform) — verify that key name against `transform.md` when implementing D1 (if the per-unit result key differs, update the scorer's `t.result?.['config-file']` lookup).

**Open seams (flagged, not gaps):**
- Existence uses a live `drush` check (spec's explicit choice) via the C1 helper, overridable with `--config-exists-cmd`. Fallback if live-drush proves brittle: intersect `expected_config` with `SyncResult.applied_config_names` (no live call) — a small change localized to the D1 scorer. Spec wants the honest post-cim check, so live drush is the default.
- The scorer reads the archived `tasks.yml` shape directly (per-unit `config-file` results + a `cim_ok`-bearing result value). This couples the eval to an internal on-disk shape — acceptable for an in-repo eval tool, and the coupling is confined to the single scorer file.
