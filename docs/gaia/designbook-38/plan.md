# DESIGNBOOK-38 — Implementierungsplan (coding)

Geordneter Checkbox-Plan. **Vor jeder Änderung an einem Task/Rule/Blueprint/Workflow/`schemas.yml`
unter `.agents/skills/designbook/**` bzw. `.agents/skills/designbook-*/**` zuerst
`designbook-skill-creator` laden** (CLAUDE.md-Guardrail) und die passende per-file-type-Rule
(`task-files.md`/`rule-files.md`/`blueprint-files.md`/`workflow-files.md`/`schema-files.md` +
`common-rules.md`). Keine Migration/Kompatibilität für alte Artefakte. Core bleibt backend-neutral.

Reihenfolge folgt der Abhängigkeitskette: Schema → Core-Workflow/Tasks → Drupal-Integration →
Fixture/Verifikation.

## A. Schema (schema-first)

- [ ] A1 — `sync-to/schemas.yml`: `ContentUnit` ergänzen (`required: [content_ref, entity_type, bundle]`,
  Felder `content_ref` = deterministische Identität, `payload`/`def`-Kontext, `build_form`-Diskriminator
  `layout-builder|canvas`). Optional Scene-Eingabeschema (`SceneUnit`/Scene-Ref) sauber referenziert
  (kein Inline-Duplikat — Memory `feedback_schema_first`).
- [ ] A2 — `design/schemas.yml`: `ConfigType.enum` → `[entity_view_display, scene]`; `examples` und
  Beschreibung ergänzen; `ConfigTarget.config_id`-Doku um die Scene-Variante erweitern (opaque bleibt).

## B. Core `sync-to`

- [ ] B1 — `workflows/sync-to.md`: Scene als Sync-Einheit einführen (Param `unit` akzeptiert `scene`
  zusätzlich zu `data-model`; Scene-Ref-Param). Der Pfad `unit: data-model` bleibt **unverändert** (AC-6).
- [ ] B2 — `tasks/intake.md`: bei `unit: scene` die Scene-Datei laden (Pfad über `scene_path`-Konvention),
  Datenmodell weiterhin verfügbar (für Bundle-`template` → Bauform, D1).
- [ ] B3 — `tasks/resolve-filter.md`: Scene-Expansion. Bauform aus `view_modes.full.template` des
  Seiten-Bundles bestimmen (D1). Emittieren in Ordnung (D2): (1) Config der beteiligten Bundles/Displays
  (bestehende Expansion), (2) Content-Block-Instanzen (nur LB), (3) Seiten-Content (Node+`layout_builder__layout`
  bzw. `canvas_page`). Content-Units über `backend_cmd.content_exists_cmd` idempotent filtern
  (analog `exists_cmd`).
- [ ] B4 — `tasks/transform.md`: Content-Zweig — Payload je Content-Unit erzeugen, deterministische UUID
  (`uuid5`) als Literal einbetten (re-sync-stabil). Config-Zweig unverändert.
- [ ] B5 — `tasks/sync.md`: Content über `backend_cmd.content_import_cmd` anlegen (Command opaque
  ausgeführt); Config weiterhin über `backend_cmd.import`. Soft/hard-Gate-Verhalten beibehalten.
- [ ] B6 — `tasks/outtake.md`: erreichbare Seiten-URL der gesynchten Scene in den Summary aufnehmen (AC-5).

## C. Core `config-verify`

- [ ] C1 — `workflows/config-verify.md`: `config_type`-Enum → `[entity_view_display, scene]`; Dispatch
  für `scene`: `config` = `SceneId`, `story_id` unverändert (`from: config`, `sources: [scenes]`),
  Kandidat = echte Seiten-URL (Full-Page, kein Selektor). `ensure-baseline-live`, `measure→fix→re-measure`,
  `ScoreReport` unverändert (AC-8, AC-11, AC-12).

## D. Drupal-Integration `designbook-drupal`

- [ ] D1 — `data-mapping/rules/config-verify-render-url.md`: Scene-Variante des `renderUrlCommand`
  (drush-Command → Canonical-URL der gesynchten Seite via deterministischer Scene-Identität, druckt nur
  die URL). **Keine** Preview-Route (AC-9). Full-Page: leerer Selektor für die Scene-Variante (AC-10);
  Isolations-Selektor bleibt nur für `entity_view_display`.
- [ ] D2 — `data-mapping/blueprints/layout-builder.md` / `canvas.md`: Content-Anlege-Payload-Guidance
  (LB: Block-Instanzen + `layout_builder__layout`-Referenzen; Canvas: `component_tree` inline) — als
  überschreibbarer Startpunkt, kein HOW-in-WHAT.
- [ ] D3 — `install/blueprints/designbook-config.md`: neue `backend_cmd`-Keys `content_exists_cmd` +
  `content_import_cmd` dokumentieren (data-only, `{{ backend_cmd.* }}`).

## E. Verifikation (`debo-test`, §9 der Spec)

- [ ] E1 — Neuen Case in Suite **`drupal-web`** autorieren (Arbeitsname `sync-verify-scene`): Fixture
  liefert `vision` + `data-model` (Seiten-Bundle mit `view_modes.full.template: layout-builder` +
  `block_content`-Bundle) + eine **Scene** + `designbook.config.yml` mit vollem `backend_cmd`
  (inkl. `content_exists_cmd`/`content_import_cmd`) + Scene-`renderUrlCommand` + `config: layout-builder.yml`.
  Case-Body: `sync-to` über die Scene (Config+Inhalt in live Drupal), dann `config-verify`
  (`config=<scene>`, `config_type=scene`) Full-Page gegen die echte Seite.
- [ ] E2 — Case aus dem **Ticket-Worktree** fahren:
  `debo-test run drupal-web sync-verify-scene --validate config-verify`
  (falls die `--validate`-Harness das Scene-Subjekt nicht trägt → config-verify im Case-Body,
  validate=none; R2). Evidenz: `workflow summary --json`, `ScoreReport` (avg/max_diff_percent,
  checks_passed/total), HTTP-200 der Seiten-URL, zweiter Lauf idempotent (AC-4).
- [ ] E3 — AC-6-Regression: `git diff` des `unit: data-model`-Pfads = leer/unberührt **und**
  `debo-test run drupal-web sync-node` grün.
- [ ] E4 — AC-13-Beleg: `git diff` zeigt keinen Backend-Code in Core; alle Drupal-Spezifika sind
  Command-String/Config. (Kein `pnpm check` nötig — kein Addon/TS berührt, D5.)

## F. Abschluss

- [ ] F1 — Alle 14 AC grün (§5-Mapping der Spec) über die E-Evidenz.
- [ ] F2 — Kurzzusammenfassung + Evidenzlinks für die coding→review-Transition.
