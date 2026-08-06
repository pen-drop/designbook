# DESIGNBOOK-38 — Implementierungsplan (v3, config-only)

> **For agentic workers:** implement task-by-task; jeder Task endet mit einem prüfbaren Deliverable
> (Grep/Diff, `debo-test`, `pnpm check`). Steps nutzen Checkbox-Syntax (`- [ ]`).

**Goal:** `sync-to` synchronisiert eine Scene **config-only** (Block-/Layout-/`page_layout`-Config,
kein Content); `sync-verify` gleicht sie Full-Page gegen die echte Seiten-URL ab. Content-Sync wird
restlos entfernt.

**Architecture:** v2-`#/Kind`-Dispatch (`config | scene`) + `sync-verify`-Rename bleiben. Der
Scene-Zweig von `sync-to` läuft über den **bestehenden Config-Pfad** (`resolve-filter` → `transform`
→ `sync`, `config:get`-Existence-Filter) und emittiert nur `ConfigNameUnit`s. Sichtbarer Inhalt lebt
in der Config (SDC-Props/Component-Tree). Core bleibt backend-neutral.

**Tech Stack:** designbook-Skill-Dateien (Markdown/YAML), `designbook-drupal`-Integration
(Command-Strings/Config), `debo-test` (Suite `drupal-web`), Addon-TS (nur `story-match.ts`, bereits
geliefert).

## Global Constraints

- **Guardrail:** `designbook-skill-creator` VOR jedem Schreiben an Task/Rule/Blueprint/Workflow/`schemas.yml` unter den geschützten designbook-Bäumen laden.
- **Keine Migration/Kompatibilität** — On-Disk-Artefakte disposable, Tests from scratch.
- **Core backend-neutral** — kein Backend-Code in Part 1; Drupal-Spezifika nur Command-String/Config.
- **`schema-first`** — Enforcement über Schemas (Enums, required) vor imperativer Prosa.
- **Nur der `scene`-Zweig ändert sich** — der `config`/`data-model`-Pfad bleibt bit-identisch (AC-6).
- Läufe/Tester **aus dem Ticket-Worktree** (`/home/cw/projects/designbook/.gaia-worktrees/feat/designbook-38-sync-to-con`).

---

### Task 0: Guardrail + Baseline

**Files:** keine.

- [ ] **Step 1:** `designbook-skill-creator` laden (`Skill`-Tool) und die relevanten
  per-file-type-Rules (`rules/task-files.md`, `rules/rule-files.md`, `rules/blueprint-files.md`,
  `rules/workflow-files.md`, `rules/schema-files.md`, `rules/common-rules.md`) lesen.
- [ ] **Step 2:** Baseline-Diff-Anker setzen: `git rev-parse HEAD` notieren (für AC-6/AC-13/AC-15-Diffs).
- [ ] **Step 3:** Inventar der zu entfernenden Content-Artefakte erfassen:
  `grep -rln "content-import\|ContentUnit\|ContentSyncResult\|content_exists_cmd\|content_import_cmd\|transform-content\|sync-content" .agents packages fixtures`.

---

### Task 1: Content-Sync-Stages aus `sync-to`-Workflow entfernen (AC-15)

**Files:**
- Modify: `.agents/skills/designbook/skills/sync-to/workflows/sync-to.md`
- Delete: `.agents/skills/designbook/skills/sync-to/tasks/transform-content.md`, `.agents/skills/designbook/skills/sync-to/tasks/sync-content.md`

- [ ] **Step 1:** In `sync-to.md` die `stages`-Einträge `transform-content` und `sync-content` streichen; `stages` endet auf `sync` → `outtake`.
- [ ] **Step 2:** Die Fließtext-Absätze zum `transform-content`/`sync-content`-Ablauf entfernen. Den Dispatch-Absatz umschreiben: *scene*-Zweig erzeugt **Config-Units** (Block-/Layout-/`page_layout`-Config), **kein** Content; *config*-Zweig unverändert.
- [ ] **Step 3:** Den `scene`-Param-`description` in `params:` umschreiben — „syncs that Scene as a real page: its **config** (block/layout/page config); no content, no content units".
- [ ] **Step 4:** `tasks/transform-content.md` und `tasks/sync-content.md` löschen (`git rm`).
- [ ] **Step 5 (Deliverable):** `grep -rn "transform-content\|sync-content" .agents/skills/designbook/skills/sync-to` → 0 Treffer.

---

### Task 2: Content-Schemas aus `sync-to/schemas.yml` entfernen (AC-15)

**Files:** Modify `.agents/skills/designbook/skills/sync-to/schemas.yml`

- [ ] **Step 1:** Die Schemas `ContentUnit` und `ContentSyncResult` vollständig entfernen.
- [ ] **Step 2:** `ExportSummary.page_url.description` umformulieren: von „Resolved … from the page's deterministic **content** identity" → „Resolved at outtake time from the synced page's **config-derived** identity (Layout-Builder canonical entity URL / Display-Builder `page_layout` route); expected HTTP 200." Beispiel-URL beibehalten.
- [ ] **Step 3:** Prüfen, dass `ConfigNameUnit` alle Felder trägt, die der Scene-Zweig braucht (`config_name`, `entity_type`, `bundle`, `def`); falls der Scene-Zweig eine Bauform-Markierung braucht, ein **optionales** `build_form`-Feld (`enum: [layout-builder, canvas]`) zu `ConfigNameUnit` ergänzen (schema-first).
- [ ] **Step 4 (Deliverable):** `grep -n "ContentUnit\|ContentSyncResult\|content_ref\|content_exists\|content_import" .agents/skills/designbook/skills/sync-to/schemas.yml` → 0 Treffer.

---

### Task 3: Scene-Expansion in `resolve-filter` config-only (AC-1/3/4)

**Files:** Modify `.agents/skills/designbook/skills/sync-to/tasks/resolve-filter.md`

- [ ] **Step 1:** Den Scene-Zweig so umschreiben, dass er die Scene in eine **geordnete `ConfigNameUnit`-Liste** expandiert (kein `content_units`): Bauform aus `data_model`-Full-View-Mode-`template` (D1); LB ⇒ `core.entity_view_display.<et>.<bundle>.<full>` (+ Block-Typ-/Block-Config); Canvas ⇒ `page_layout`-Config.
- [ ] **Step 2:** Ordnung: Dependency-vor-Nutzer (Bundle-/Block-Typ-/Layout-Config vor Instanz/Seite) — auf die bestehende `transform`-Ordnung verweisen, nicht duplizieren.
- [ ] **Step 3:** Idempotenz: ausdrücklich den **bestehenden `config:get`-Existence-Filter** nutzen; jede Referenz auf `content_exists_cmd` entfernen.
- [ ] **Step 4:** Die konkrete Config-Namensbildung + Bauform-Auflösung an die Drupal-Blueprints (`layout-builder.md`/`canvas.md`) delegieren (WHAT hier, HOW dort).
- [ ] **Step 5 (Deliverable):** `grep -n "content_units\|content_exists\|ContentUnit" resolve-filter.md` → 0 Treffer.

---

### Task 4: `transform` + `outtake` config-only (AC-3/5)

**Files:** Modify `.agents/skills/designbook/skills/sync-to/tasks/transform.md`, `.agents/skills/designbook/skills/sync-to/tasks/outtake.md`

- [ ] **Step 1:** In `transform.md` sicherstellen, dass Scene-`ConfigNameUnit`s denselben Config-Author-Pfad wie data-model-Config-Units durchlaufen (kein Sonderpfad). Etwaige Content-Verweise entfernen.
- [ ] **Step 2:** In `outtake.md` den `page_url` aus der **config-abgeleiteten** Seiten-Identität ausweisen (über den `render_url`/Scene-`renderUrlCommand`-Pfad, HTTP 200), nicht aus content-refs; `ContentSyncResult`/content-ref-Verweise entfernen.
- [ ] **Step 3 (Deliverable):** `grep -rn "content_ref\|content-import\|ContentSyncResult" transform.md outtake.md` → 0 Treffer.

---

### Task 5: Fix-Surface config-only in `sync-verify`/`design` (AC-12)

**Files:** Modify `sync-verify/workflows/sync-verify.md`, `design/tasks/polish-config.md`, `design/tasks/triage-config.md`, `design/schemas.yml`, `design/rules/sync-verify-subject-mapping.md`

- [ ] **Step 1:** In `polish-config.md` alle „config **and** content (for a scene)"-Formulierungen → nur **backend config**. Fix-Surface-Tabelle: nur Display/Layout/`page_layout`-Config.
- [ ] **Step 2:** In `triage-config.md` „the synced page's config **and** content" → nur Config.
- [ ] **Step 3:** In `sync-verify.md` die design-verify-Vergleichstabelle: Fix-pass target „backend config / content" → „**backend config**".
- [ ] **Step 4:** In `design/schemas.yml` bestätigen: `#/Kind` = `[config, scene]`, `config_type` = `[entity_view_display]`. In der `#/Kind`-`description` ausdrücklich vermerken, dass die **Scene-Variante hier** lebt (AC-7-Mapping). Etwaige content-Fix-Prosa entfernen.
- [ ] **Step 5:** `sync-verify-subject-mapping.md` gegenlesen: Scene = Full-Page, config-only — keine Änderung nötig, sonst content-Verweise entfernen.
- [ ] **Step 6 (Deliverable):** `grep -rn "and content\|content for a scene\|block_content" .agents/skills/designbook/design .agents/skills/designbook/skills/sync-verify` → nur legitime (nicht-Fix-Surface) Treffer, keine Fix-Surface-Content-Referenzen.

---

### Task 6: Drupal-Blueprints Content-Payload → Config-Expansion (AC-2/13)

**Files:** Modify `.agents/skills/designbook-drupal/data-mapping/blueprints/layout-builder.md`, `.agents/skills/designbook-drupal/data-mapping/blueprints/canvas.md`

- [ ] **Step 1:** In `layout-builder.md` den Abschnitt „## Content payload (sync-to Scene sync)" ersetzen durch „## Config expansion (sync-to Scene sync)": die Scene expandiert zu `core.entity_view_display.<et>.<bundle>.<full>` mit `third_party_settings.layout_builder.sections`, deren Komponenten die SDC-Props inline in der `configuration` tragen; ergänzend Block-Typ-/Block-Config; **keine** `block_content`/content-refs.
- [ ] **Step 2:** In `canvas.md` den Abschnitt „## Content payload (sync-to Scene sync)" ersetzen durch die `page_layout`-**Config**-Route-Expansion: eine `page_layout`-Config-Entity mit inline eingebettetem Component-Tree; eigene Route/URL; **keine** `canvas_page`-Content-Entity, kein `content_import_cmd`.
- [ ] **Step 3 (Deliverable):** `grep -rn "content_import_cmd\|content_ref\|block_content\|canvas_page.*entity payload" layout-builder.md canvas.md` → 0 content-payload Treffer.

---

### Task 7: Render-URL-Rule + Config-Cmds config-only (AC-5/9/12/13)

**Files:** Modify `.agents/skills/designbook-drupal/data-mapping/rules/sync-verify-render-url.md`, `.agents/skills/designbook-drupal/install/blueprints/designbook-config.md`, `packages/integrations/test-integration-drupal/designbook.config.yml`

- [ ] **Step 1:** In `sync-verify-render-url.md` den Abschnitt „### `kind: scene`" so umschreiben, dass die URL **ohne content-uuid** aufgelöst wird: LB ⇒ Canonical-URL einer kanonischen Bundle-Entity (Fixture-Seed, D5); Canvas ⇒ Route der `page_layout`-Config-Seite. Weiterhin: nur URL drucken, **keine** Preview-Route, Full-Page (leerer Selektor).
- [ ] **Step 2:** Im „## Backend fix (polish-config)"-Abschnitt die Scene-Fix-Surface von „display config **and** its content (the block_content instances or the page entity's field values / layout)" auf **nur Config** (Display-/Layout-/`page_layout`-Config via drush config:set/export) einschränken (AC-12).
- [ ] **Step 3:** In `designbook-config.md` (`install`-Blueprint) `content_exists_cmd`/`content_import_cmd` + zugehörige Content-Prosa entfernen; Config-`backend_cmd` (exists/import via `config:get`/`config:import`) + Scene-`renderUrlCommand` behalten/anpassen.
- [ ] **Step 4:** In `designbook.config.yml` die `content_exists_cmd`/`content_import_cmd` (Zeilen ~36–43) und den content-`page_url_cmd`-Kommentarblock entfernen; die Scene-`renderUrlCommand` config-only formulieren.
- [ ] **Step 5 (Deliverable):** `grep -rn "content_exists_cmd\|content_import_cmd\|content-import.php\|/designbook/preview" sync-verify-render-url.md designbook-config.md designbook.config.yml` → keine content-cmd/keine Preview-Route auf dem Scene-Pfad.

---

### Task 8: Fixture config-only + Bare-Entity-Seed (AC-1/5/14/15)

**Files:** Modify `fixtures/drupal-web/sync-verify-scene/**`; Delete `fixtures/drupal-web/sync-verify-scene/content-import.php`

- [ ] **Step 1:** `content-import.php` löschen (`git rm`). Ebenso den in `workspaces/` kopierten Abkömmling nicht committen (workspace ist ohnehin gitignored/rebuildbar).
- [ ] **Step 2:** `data-model.yml` prüfen: Seiten-Bundle mit `view_modes.full.template: layout-builder` (bzw. `canvas`) + ggf. Block-Bundle; Scene (`landing.section.scenes.yml`) beibehalten.
- [ ] **Step 3:** Für die LB-URL einen **Fixture-Bare-Entity-Seed** ergänzen (ein `sample-data`/Seed-Hook der Suite, der genau eine kanonische Entity anlegt) — als Test-Seed dokumentiert, **kein** `sync-to`-Content. Für den Canvas-Pfad entfällt der Seed (Config-Route).
- [ ] **Step 4 (Deliverable):** `find fixtures/drupal-web/sync-verify-scene -name content-import.php` → leer; `data-model.yml` trägt eine deklarative Bauform.

---

### Task 9: Verifikation (AC-1–15, S1/S2)

**Files:** keine (Ausführung).

- [ ] **Step 1 (AC-6 Regression):** `debo-test run drupal-web sync-node` aus dem Worktree → grün; `git diff <baseline> -- .agents/skills/designbook/skills/sync-to` zeigt **keine** Änderung am `config`/`data-model`-Pfad.
- [ ] **Step 2 (AC-1–5,7–11):** `debo-test run drupal-web sync-verify-scene --validate sync-verify` aus dem Worktree. Erfassen: `workflow summary --json`, `ScoreReport` (`avg_diff_percent`, `max_diff_percent`, `checks_passed`/`checks_total`), HTTP-200 der Seiten-URL. Fallback (R4): trägt `--validate` das Scene-Subjekt nicht → `sync-verify` im Case-Body, `validate=none`.
- [ ] **Step 3 (AC-4 Idempotenz):** zweiter Lauf desselben Case ohne Reset → Unit-Liste leer/partiell, keine Duplikate.
- [ ] **Step 4 (AC-15):** `grep -rln "content-import\|ContentUnit\|ContentSyncResult\|content_exists_cmd\|content_import_cmd\|transform-content\|sync-content" .agents packages fixtures` → 0 Treffer (workspace-Abkömmlinge ausgenommen).
- [ ] **Step 5 (AC-9):** Negativ-Grep Preview-Route auf dem Scene-Pfad: `grep -rn "/designbook/preview" .agents/skills/designbook-drupal/data-mapping/rules/sync-verify-render-url.md` erscheint nur im `config`-Zweig, nie im `scene`-Zweig.
- [ ] **Step 6 (S2/AC-14):** `pnpm check` (typecheck → lint → Vitest inkl. `story-match.ts`-Kollisions-Regressionstest) grün.
- [ ] **Step 7 (Commit):** Änderungen committen; PR #151 aktualisieren.

---

## Self-Review (Spec-Abdeckung)

- AC-1/3/4/15 → Tasks 1–4 (Content-Entfernung + Config-Expansion). ✅
- AC-2 → Tasks 3, 6 (Bauform deklarativ, beide ⇒ Config). ✅
- AC-5 → Tasks 4, 7 (config-abgeleitete URL, HTTP 200). ✅
- AC-6 → Task 9 Step 1 (Regression + Diff). ✅
- AC-7/8/10 → Task 5 (`#/Kind`-Scene, Full-Page, `ensure-baseline-live` unangetastet). ✅
- AC-9 → Tasks 7, 9 Step 5 (echte URL, keine Preview-Route). ✅
- AC-11 → unverändert (measure→fix→re-measure, `ScoreReport`), belegt in Task 9 Step 2. ✅
- AC-12 → Tasks 5, 7 (Fix nur Backend-Config). ✅
- AC-13 → alle Tasks (Command-String/Config, kein Core-TS). ✅
- AC-14/S1/S2 → Tasks 8, 9. ✅
