# DESIGNBOOK-38 — Implementierungsplan (v2 · coding)

Geordneter Checkbox-Plan für die v2-Umstrukturierung (kind-Dispatch; `config-verify` → `sync-verify`).
**Vor jeder Änderung an einem Task/Rule/Blueprint/Workflow/`schemas.yml` unter
`.agents/skills/designbook/**` bzw. `.agents/skills/designbook-*/**` zuerst `designbook-skill-creator`
laden** (CLAUDE.md-Guardrail) und die passende per-file-type-Rule. Keine Migration/Kompatibilität für
alte Artefakte. Core bleibt backend-neutral.

Ausgangspunkt ist der v1-Stand (PR #151): scene-Logik in `sync-to`/`config-verify` — funktioniert, wird
**verschoben**, nicht neu erfunden. Reihenfolge: Rename → kind-Dispatch → scene-Branch → Drupal → Fixture.

## A. Rename `config-verify` → `sync-verify`

- [ ] A1 — Verzeichnis/Skill umbenennen: `skills/config-verify/` → `skills/sync-verify/`
  (`SKILL.md` name/description, `workflows/config-verify.md` → `workflows/sync-verify.md`, Workflow-ID).
- [ ] A2 — Alle `config-verify`-Referenzen greppen und aktualisieren: Task `trigger.steps`-Prefixe
  (`config-verify:*` → `sync-verify:*`), das designbook-drupal Rule `trigger.domain: config-verify`,
  die GAIA-Step-Skill-Prosa (`@designbook-gaia/debo-config-sync` nennt `@designbook/config-verify`),
  Fixture-`config:`-Overrides, `run.md`/WORKFLOW.md-Erwähnungen. Jede Referenz bewusst updaten/behalten.

## B. kind-Dispatch (schema-first)

- [ ] B1 — `sync-verify/workflows/sync-verify.md`: `config`/`config_type`-Params ersetzen durch
  `story` (Subjekt) + inferiertes binäres `kind` (`config | scene`) + optionalen `selector`. `kind`-Enum
  in `design/schemas.yml` (`config | scene`); `ConfigType`→`scene`-Wert aus v1 zurücknehmen. Inferenz-
  Regel dokumentieren: Story-Group → `kind`; innerhalb `config` wählt `selector`-Präsenz die Sub-Mode
  (config-entity mit Selektor, sonst entity-view-mapping).
- [ ] B2 — `sync-to/workflows/sync-to.md`: `unit: scene` entfernen; scene-Sync wird über eine
  scene-`kind`-Story-Eingabe gewählt, nicht über ein `unit`-Flag. `data-model`-Bulk-Pfad unverändert.

## C. `sync-verify` — drei kind-Branches

- [ ] C1 — **config-entity** (Bestand): der heutige `entity_view_display`-Pfad
  (Canonical-Page + Selector) bleibt als config-entity-Branch erhalten — Verhalten unverändert.
- [ ] C2 — **entity-view-mapping** (Bestand): Kandidat = designbook-Modul Preview-Route
  `/designbook/preview/{entity_type}/{entity}/{view_mode}`, isoliert. Als eigener Branch benannt.
- [ ] C3 — **scene** (neu, verschoben aus v1): Kandidat = echte Seiten-URL, Full-Page (leerer Selektor);
  Referenz = Scene-Story. `ensure-baseline-live`/measure→fix→re-measure/`ScoreReport` unverändert.

## D. `sync-to` — scene-Branch (verschoben aus v1)

- [ ] D1 — `sync-to/schemas.yml`: `ContentUnit`/`ContentSyncResult` + `ExportSummary.page_url`
  (aus v1 übernehmen).
- [ ] D2 — scene-Expansion (aus v1 `resolve-filter`): Bauform aus Full-View-Mode-`template`; geordnete
  Config- + Content-Units inkl. der Layout-Builder `layout_builder__layout` Field-Storage/-Instance;
  Content-Existence-Filter (`content_exists_cmd`).
- [ ] D3 — `transform-content` + `sync-content` Tasks (aus v1): deterministische uuid5-Payloads;
  Content-Import nach Config-Import.
- [ ] D4 — `outtake` (aus v1): erreichbare Seiten-URL via `page_url_cmd` in den Summary.

## E. Drupal-Integration `designbook-drupal`

- [ ] E1 — `data-mapping/rules/*render-url*` (an `sync-verify` angepasst): drei Kandidatenquellen —
  entity-view-mapping ⇒ Preview-Route; config-entity ⇒ Canonical + Selector; scene ⇒ echte Seiten-URL,
  Full-Page (keine Preview-Route). `trigger.domain` auf den neuen Workflow-Namen.
- [ ] E2 — `data-mapping/blueprints/{layout-builder,canvas}.md`: Content-Payload-Guidance (aus v1).
- [ ] E3 — `install/blueprints/designbook-config.md` + `test-integration-drupal/designbook.config.yml`:
  `content_exists_cmd`/`content_import_cmd`/`page_url_cmd` als `{content_ref}`-Substitutionstemplates
  (drush eval; throw-not-exit; `\$`-Escaping — die v1-Live-Fixes übernehmen).

## F. Verifikation (`debo-test`) — alle drei kinds

- [ ] F1 — scene-Case (aus v1 `sync-verify-scene`, an v2 angepasst): `sync-to` scene-Story → echte
  LB-Seite (HTTP 200), `sync-verify` scene → Full-Page-`ScoreReport`, zweiter Lauf idempotent.
- [ ] F2 — config-entity + entity-view-mapping grün belegen: bestehende(r) entity-Case(s) unter
  `sync-verify` laufen lassen (Canonical+Selector **und** Preview-Route). Belegt R2 (keine Regression).
- [ ] F3 — AC-6-Regression: `sync-to`-`data-model`-Pfad unverändert (`debo-test run drupal-web
  sync-node` grün + leerer Diff).
- [ ] F4 — AC-13-Beleg: `git diff` zeigt keinen Backend-/TS-Code in Core.

## G. Abschluss

- [ ] G1 — Alle 14 AC grün (§6-Mapping der Spec), alle drei kinds belegt.
- [ ] G2 — Live-Workspace aus dem Ticket-Worktree fahren (shared DDEV-Host — Host-Freiheit prüfen).
- [ ] G3 — PR #151 auf den v2-Stand aktualisieren; Kurzzusammenfassung + Evidenzlinks für
  coding→review.
