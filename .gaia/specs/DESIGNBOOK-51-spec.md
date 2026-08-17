# DESIGNBOOK-51 — Spec & Implementation Plan

**Ticket:** debo schema-resolution konsolidieren (single `schema.yml`) + `build_form` backend-neutralisieren
**Workflow:** `gaia_feature` · **Sub-works:** `work:code`, `work:docs`
**Parent:** DESIGNBOOK-42 · **Base branch:** `feat/designbook-42-sync-to-sce` (rebast; pre-rebase `b28d1b25`)
**Runtime surface:** Engine/Schema-Refactor — validiert über Unit-Tests (`pnpm check`) + `debo-test` (Suite `drupal-web`, sync-Regression + Scene-Case über `sync-verify`), kein manueller Browser-Klickpfad (`scenario_required=false`).
**Querbezug:** aus DESIGNBOOK-42 herausgelöst; Root Cause dort getraced + live verifiziert. `presenter` existiert **nur** auf der 42-Basis (deshalb Rebase/Parent).

---

## 1. Problem

**Ziel A — drei parallele Schema-Auflösungs-Pfade, nur einer weitet.** (am realen Bestand verifiziert)

1. `cli/workflow.ts` Create-Handler (`runWorkflowCreate`) baut `data.schemas` = `firstSchemas` — **nur die erste Task** — über `resolveSchemaRef` + `collectLocalRefsFromSchema` + `computeMergedSchema`. **Kein** `widenDefinitionEnums`. Das volle Multi-Step-Schema wird **nirgends** persistiert.
2. `resolveAllStages()` baut `step_resolved[step].schema` (`SchemaBlock` je Step) für Create-Response/Preview + Expansion. **Kein** `widenDefinitionEnums`.
3. `resolveSchemasForTasks()` (`workflow.ts:1487`, Stage-Übergang) ist der **einzige** `widenDefinitionEnums`-Aufrufer und **überschreibt** `data.schemas` additiv zur Laufzeit.

Der Validierungs-Map-Shape ist flach `{TypeName: schemaObject}` (AJV `#/TypeName`), gelesen bei `workflow done` (`workflow.ts:1094/1154/1200`). `resolveWorkflowPlan()` (verdrahtet `collectLocalRefsFromSchema` + `widenDefinitionEnums` über **alle** Steps) hat **keine** Produktiv-Caller (test-only).

**Kein harter Bug**, sondern **Snapshot-Drift**: Der Create-Snapshot (`tasks.yml`: `data.schemas` first-task-only + ungeweitet; `stage_loaded` ungeweitet) widerspricht dem Runtime-Validierungsstand. Drei Pfade, die denselben Merge unterschiedlich (und teils gar nicht) tun, sind dauerhafte Fehlerquelle.

**Ziel B — `build_form` ist die einzige Drupal-Ausnahme neben der neutralen `template`-Achse.** `ConfigNameUnit.build_form` trägt im Core (`sync-to/schemas.yml`) den Drupal-Enum `[layout-builder, canvas]` mit Drupal-lastiger Beschreibung. Demgegenüber sind View- **und** Form-Mode-`template`s bereits backend-neutrale Free-Strings (Werte aus `entity_mapping.templates`/config, Rules `when: template:`). `build_form` ist die inkonsistente Ausnahme.

## 2. Korrekturen an Ticket-Angaben (am realen Bestand auf der 42-Basis verifiziert) — vom Owner bestätigt

Damit die Spec nicht auf falschen Referenzen aufsetzt (alle im Spec-Grilling mit dem Owner geklärt):

1. **`presenter` ist kein `build_form`, sondern ein `template`-Wert — und kommt aus DESIGNBOOK-42.** Auf `next`/DESIGNBOOK-46 existiert `presenter` **null** Mal. Auf `feat/designbook-42-sync-to-sce` ist `presenter` ein **`template`**-Wert für theme-methoden-only-Flächen (Forms/Pager/Exposed-Filter → generiertes Twig-Presenter-Template) — **nicht** ein `build_form`. Der Core-`build_form`-Enum ist auf 42 **unverändert `[layout-builder, canvas]`**; 42 registriert `build_form` **nicht** via `extends`; die Scene-Page bleibt `template: layout-builder`. → 51 auf 42 rebast, Parent = 42.
2. **Ticket-Ziel-B vermischt `build_form` und `template`.** „drupal registriert presenter via extends" / „Page-Template → presenter" trifft 42 nicht: `presenter` ist Template-Achse (42s Eigentum), nicht Build-Form. **Beschluss:** `build_form` wird neutralisiert, indem es auf die **`template`-Achse** gestellt wird (unten D5/A′), **nicht** indem presenter als build_form registriert wird.
3. **AC 2/AC 7 benennen `build_form` als Widen-Beleg.** Da A′ den `build_form`-Enum entzerrt, wandert der **definition-level `widenDefinitionEnums`-Beleg auf `field_type`** — `designbook-drupal/data-model/blueprints/field-types.md` weitet via `extends: DataModel` das `field_type`-Enum, erreicht über nested `$ref` (kanonischer Enum-Union-Fall). `widenDefinitionEnums` wird also nicht zeugenlos.

## 3. Decision (design)

### D1 — Konsolidierung: gezielt, `schema.yml` als **Validierungs**-Quelle (Q1-b)
Eine beim `create` generierte **`schema.yml`** ist die **einzige Validierungsquelle**; alle `workflow done`-Validierungen lesen daraus. Der Runtime-Overwrite (Pfad 3, `resolveSchemasForTasks` @ `workflow.ts:1487` + `data.schemas`-Neuzuweisung) **entfällt**. `step_resolved`/`stage_loaded` (Pfad 2 Preview/Expansion) werden **ausdrücklich als Nicht-Validierungs-Expansionsstruktur dokumentiert** und bleiben unberührt — die Drift verschwindet an der validierungsrelevanten Fläche (es zählt nur noch `schema.yml`). Kleinster Blast-Radius für den `drupal-web`-Regressionslauf.

### D2 — Generator: `resolveWorkflowPlan` produktiv + `computeMergedSchema` einfalten (Q3)
`resolveWorkflowPlan` läuft schon über **alle** Steps und baut die geteilte Definition-Map mit `collectLocalRefsFromSchema` **+** `widenDefinitionEnums`. Ihm fehlt nur der per-Step-`computeMergedSchema` (Result-Key-Composition) — dieser wird eingefaltet. Dann `resolveWorkflowPlan` als **einzigen** Create-Pfad-Schema-Produzenten verdrahten (ersetzt den first-task-`firstSchemas`-Bau in `cli/workflow.ts`) und das Ergebnis nach `schema.yml` persistieren. Räumt toten Code weg; adressiert die dokumentierte Historie „Create-Pfad droppt merged schema/collected refs" (DESIGNBOOK-29 / blueprint-extends-gap).

### D3 — AC 4: statisches Vollbild belegt, kein Fortschreiben
Für **jeden** debo-Workflow ist die volle Schema-Shape beim `create` bekannt: Rules/Blueprints werden per **Step-Name + config + domain** gematcht (alle statisch), nie über Runtime-Daten/Scope/Scene-Branch. Bei sync-to erzeugt der Scene-Branch N `ConfigNameUnit`s = N Instanzen **derselben fixen Shape** (kein neuer Typ/`extends`); `resolveSchemasForTasks` re-merged zur Laufzeit nur bereits bekannte `extends`. (Einziger Runtime-Schema-Fetch: `transform` `prepare:` live-Drupal-Typed-Config — validiert *Output*, nicht die Workflow-Shape.) → **Beweis-/Doku-Aufgabe**, kein zweiter Fortschreib-Pfad.

### D4 — `schema.yml`-Ablage + Shape
Flache YAML-Map `{TypeName: schemaObject}` (die AJV-`#/TypeName`-Registrierungsform), neben `tasks.yml` unter `designbook/workflows/changes/<wf-id>/schema.yml`.

### D5 — `build_form` template-getrieben (Q6′/A′)
Der Core-`ConfigNameUnit.build_form` verliert seinen Drupal-Enum und wird auf dieselbe Achse wie Mode-`template` gestellt: **backend-neutraler Free-String**, dessen erlaubte Werte aus `entity_mapping.templates` in `designbook.config.yml` kommen; die **konkrete Technologie setzt der Config-Default/`backend`**. **Kein** paralleler build_form-Enum, **kein** presenter-als-build_form. `resolve-filter` leitet `build_form` weiter aus dem Full-View-Mode-`template` ab; die Drupal-WHAT/HOW-Zuordnung bleibt in den `designbook-drupal`-Blueprints (`layout-builder.md`/`canvas.md`), die Core-Prosa in `resolve-filter.md` wird backend-neutral.

### D6 — Ziel-A-Konsistenzzeuge: `field_type` statt `build_form`
Da D5 den `build_form`-Enum entzerrt, wird der definition-level Widen-Konsistenznachweis (AC 2/AC 7) auf `field_type` umgezogen (DataModel-`extends` via `designbook-drupal/data-model/blueprints/field-types.md`) — real, live, kanonisch.

### D7 — work:docs
`.agents/skills/designbook/resources/workflow-execution.md` (beschreibt Create/Validate + das Widening) und `.agents/skills/designbook-skill-creator/resources/schema-composition.md` (beschreibt die drei Merge-Flächen) auf **„einmal generieren → `schema.yml` → von dort validieren"** nachziehen.

### D8 — Rebase/Parent
51 auf `feat/designbook-42-sync-to-sce` rebast (FF-artig, 51 hatte keine eigenen Commits), `parent_id = DESIGNBOOK-42`, `base_branch = feat/designbook-42-sync-to-sce`. **Risiko:** 42 ist in `coding` (beweglich) → 51 braucht ggf. Re-Rebase, wenn 42 fortschreitet/merged. Pre-Rebase-SHA `b28d1b25` gesichert.

## 4. Resolved decisions

| # | Frage | Wahl | Begründung |
|---|---|---|---|
| **D1/Q1** | Konsolidierungs-Radikalität | **gezielt (b)**: `schema.yml` = Validierungsquelle; Pfad 3 entfällt; `stage_loaded` als Nicht-Validierungs-Struktur dokumentiert | ACs verlangen Konsistenz an den Validierungspunkten; Preview ist nicht validierungsrelevant; kleinster Regressions-Radius. |
| **D2/Q3** | Generator | **`resolveWorkflowPlan` produktiv + `computeMergedSchema` einfalten** | Macht schon 2/3 Merges über alle Steps; einziger Produktiv-Pfad; entfernt toten Code + Parallelpfade. |
| **D3/AC4** | Runtime-Rules | **statisches Vollbild belegt** (Step+config+domain-Matching; N Units = N Instanzen fixer Shape) | Kein Workflow lädt schema-relevante Rules nach Runtime-Scope; kein Fortschreib-Pfad nötig. |
| **D4** | `schema.yml`-Shape/-Ort | flache `{TypeName: schemaObject}` neben `tasks.yml` | Exakt der AJV-Registrierungs-Shape, den die Validierung erwartet. |
| **D5/Q6′** | `build_form`-Neutralisierung | **template-getrieben (A′)**: Core-Enum weg, an `template`-Achse; Default/`backend` setzt Technologie | Beseitigt die Sonderrolle von build_form ganz; deckt sich mit „template pro Mode + Default setzt Technologie". |
| **D6** | Ziel-A-Widen-Zeuge nach A′ | **`field_type`** (DataModel-`extends`) | Realer, live, kanonischer definition-level Enum-Union; ersetzt build_form als Beleg. |
| **D7** | Docs | `workflow-execution.md` + `schema-composition.md` nachziehen | Beschreiben heute die drei Pfade + Widening — müssen die eine Quelle beschreiben. |
| **D8/Q5** | Rebase/Parent | **auf 42 rebasen + Parent/Base setzen** | presenter existiert nur auf 42; nötig zum Bauen/Testen von Ziel B. |

## 5. Verifikations-Vehikel (coding)

- **Unit (`pnpm check`, vitest):** neuer Test treibt den **Create-Pfad** (`runWorkflowCreate`) und belegt (a) `schema.yml` wird einmal erzeugt und enthält das **definition-level geweitete `field_type`-Enum**, (b) `workflow done`-Validierung liest aus `schema.yml`. **RED vor GREEN**: vor dem Fix widened der Create-Pfad nicht / es gibt keine `schema.yml`.
- **`debo-test`, Suite `drupal-web`, aus diesem Worktree** (isolierte `workspaces/`, live Drupal über `start-drupal-workspace.sh`): voller sync-Regressionslauf (alle `sync-*`-Cases + DESIGNBOOK-42-Scene-Cases), Scene-Case mit `--validate sync-verify`. `workflow summary --json` ans Ticket.
- **Doc-strukturelle Checks** (Markdown/Link/Frontmatter/Workflow/Contract) für die geänderten Docs; `pnpm check` bei Addon/TS-Berührung.

## 6. Risks

- **R1 — Generator-Vollständigkeit (höchstes).** `resolveWorkflowPlan` + eingefaltetes `computeMergedSchema` muss **exakt** dieselben Result-Key-Merges wie der heutige Create-Pfad liefern, sonst Regression an bestehenden `sync-*`-Läufen. *Mitigation:* voller `drupal-web`-Regressionslauf; Unit-Vergleich der erzeugten Map gegen den bisherigen Create-Output je Step.
- **R2 — `stage_loaded`-Degradierung.** Wird `stage_loaded` irgendwo doch als Validierungsquelle gelesen, bricht die Entkopplung. *Mitigation:* `grep`/Test, dass nur `schema.yml` in `validateResultEntry` einfließt; Doku-Klarstellung.
- **R3 — build_form-Free-String lockert Validierung.** Ohne Enum kann ein Tippfehler-`build_form` durchrutschen. *Mitigation:* die Technologie-Auflösung (Config/Rule `when: template:`) fängt unbekannte Werte an der Dispatch-Stelle; im Zweifel Config-getriebene Enum-Ableitung statt hartem Core-Enum.
- **R4 — 42 in coding (beweglich).** Re-Rebase-Aufwand, wenn 42 fortschreitet/merged. *Mitigation:* schmale, gut isolierte 51-Änderungen; vor Review/Merge gegen 42-HEAD neu diffen (`feedback_report_verbatim_port_drift`).
- **R5 — AC-Wortlaut vs. A′.** ACs 5/6/8 benennen presenter-als-build_form; A′ weicht bewusst ab (Owner-bestätigt). *Mitigation:* §7 formuliert die ACs neu; Ticket-Beschreibung/ACs werden auf A′ nachgezogen (Angebot im Confirm), damit Review nicht am alten Wortlaut scheitert.

## 7. Acceptance ↔ evidence matrix (9 AC — mit A′-Neufassung, Owner-bestätigt)

| AC | Neufassung / Beleg | Zweig |
|---|---|---|
| 1 — Vollschema (Result-Key-Extends **und** definition-level Enum-Union + alle `$ref`-Defs) **einmal** beim `create` erzeugt, als `schema.yml` im Workflow-Tasks-Ordner abgelegt | Unit am Create-Pfad; `schema.yml` auf Disk inspiziert | code |
| 2 — **alle** `workflow done`-Validierungen lesen aus dieser einen Datei; Create-Snapshot == Validierungsstand (kein Drift) — **belegt an `field_type`** (statt build_form, D6) | Unit: `schema.yml` enthält geweitetes `field_type`; Validierung liest daraus | code |
| 3 — per-Stage-Übergang-Neuauflösung (`resolveSchemasForTasks` + `data.schemas`-Overwrite) **entfernt** | `git diff` + `grep`: kein Runtime-Overwrite mehr; Validierung nur aus `schema.yml` | code |
| 4 — Runtime-Rules-Frage entschieden: **belegt, dass alle geladenen Rules/Blueprints beim `create` bekannt** sind (statisches Vollbild) | §3 D3 + Doku in `workflow-execution.md` | docs |
| 5 — **A′-Neufassung:** Core-`ConfigNameUnit.build_form`-**Enum entfernt** (an `template`-Achse gestellt); **kein Drupal-Build-Form-Wert im Core**; `designbook-drupal` registriert **kein** build_form (presenter bleibt Template-Achse, 42s Eigentum) | `git diff` `sync-to/schemas.yml`; `grep` Core frei von build_form-Enum-Werten | code+docs |
| 6 — **A′-Neufassung:** `template → build_form`-Zuordnung in `resolve-filter.md` (Core-Prosa) **backend-neutral**; Drupal-WHAT/HOW in den drupal-Blueprints; **keine** erzwungene Page-Template→presenter-Änderung | `git diff` `resolve-filter.md` + drupal-Blueprints | docs |
| 7 — `pnpm check` grün inkl. neuer Tests, die `schema.yml` + Validierung-von-dort über den **Create-Pfad** abdecken (nicht nur `widenDefinitionEnums`/`resolveSchemasForTasks` isoliert) | `pnpm check`; neuer Create-Pfad-Test | code |
| 8 — **A′-Neufassung:** voller `debo-test`-sync-Regressionslauf (`drupal-web`: alle `sync-*` + 42-Scene-Cases) grün — keine Verhaltensänderung; der **42-Scene-Case läuft grün** (`config:import` + `sync-verify`), build_form über den template-Pfad aufgelöst | `workflow summary --json` am Ticket | code |
| 9 — Standing `work:code`: **RED vor GREEN** (Test zeigt Drift/Nicht-Widening auf dem Create-Pfad vor dem Fix — an `field_type`). Standing `work:docs`: Doc-Checks grün | RED-Commit + Doc-Struktur-Checks | code+docs |

## 8. Implementation plan (Checkbox — für coding)

- [ ] **`designbook-addon-skills` laden** für die Addon/TS-Änderungen; **`designbook-skill-creator` laden** vor jedem Editieren von task/rule/blueprint/schemas.yml unter `designbook/`/`designbook-drupal/` (CLAUDE.md) + die passenden `rules/*.md`.
- [ ] **RED (AC 9):** Unit am **Create-Pfad** (`runWorkflowCreate`) für einen Workflow, dessen geladenes Skill `field_type` via `extends: DataModel` weitet; assert: persistierte `schema.yml` enthält das geweitete `field_type`-Enum **und** `workflow done` validiert daraus. Vor dem Fix **RED** (kein `schema.yml` / ungeweitet).
- [ ] **Ziel A — Generator (AC 1/D2):** `resolveWorkflowPlan` um per-Step `computeMergedSchema` (Result-Key-Composition) erweitern, sodass es Result-Key-Extends **und** definition-level `widenDefinitionEnums` **und** `collectLocalRefsFromSchema` über alle Steps in **eine** flache Map faltet.
- [ ] **Ziel A — Create-Pfad (AC 1/2):** `cli/workflow.ts runWorkflowCreate` auf `resolveWorkflowPlan` als **einzigen** Schema-Produzenten umstellen; den first-task-`firstSchemas`-Bau entfernen; Ergebnis als **`schema.yml`** neben `tasks.yml` persistieren (`{TypeName: schemaObject}`).
- [ ] **Ziel A — Validierung (AC 2):** `workflowDone`/`validateResultEntry` liest die Schema-Map aus `schema.yml` statt `data.schemas`.
- [ ] **Ziel A — Pfad 3 entfernen (AC 3):** `resolveSchemasForTasks`-Aufruf @ `workflow.ts:1487` + `data.schemas`-Neuzuweisung entfernen; `stage_loaded` als Nicht-Validierungs-Expansionsstruktur dokumentieren.
- [ ] **Ziel B (AC 5/6/D5):** Core-`ConfigNameUnit.build_form`-Enum entfernen → Free-String an der `template`-Achse (neutrale Beschreibung, Werte aus `entity_mapping.templates`/config-Default); `resolve-filter.md`-Core-Prosa backend-neutral fassen; Drupal-WHAT/HOW in `designbook-drupal`-Blueprints belassen/verschieben.
- [ ] **work:docs (AC 4/D7):** `workflow-execution.md` + `schema-composition.md` auf „einmal generieren → `schema.yml` → von dort validieren" + statisches Vollbild nachziehen.
- [ ] **Verifikation (AC 7/8):** `pnpm check` grün; aus diesem Worktree `debo-test run drupal-web <alle sync-* + Scene-Case>` (Scene-Case `--validate sync-verify`); `workflow summary --json` ans Ticket.
- [ ] **Nicht-Regression:** `git diff` — Kind-Dispatch + Stage-Kette unverändert; kein neuer Backend-Codepfad im Core (`grep`).
- [ ] **Vor Review:** gegen 42-HEAD neu diffen (42 in coding — Port-Drift, `feedback_report_verbatim_port_drift`).

## 9. Artifacts

- Diese Spec: `.gaia/specs/DESIGNBOOK-51-spec.md` (committed).
- **Editiert (code):** `packages/storybook-addon-designbook/src/{workflow-resolve.ts (resolveWorkflowPlan + computeMergedSchema), cli/workflow.ts (Create-Pfad + schema.yml-Persistenz), workflow.ts (Validierung liest schema.yml; resolveSchemasForTasks-Overwrite entfernt)}` + neue Tests.
- **Editiert (docs):** `.agents/skills/designbook/skills/sync-to/{schemas.yml (build_form-Enum weg), tasks/resolve-filter.md (neutrale Prosa)}`; `designbook-drupal/data-mapping/blueprints/{layout-builder.md, canvas.md}` (WHAT/HOW-Verortung); `resources/workflow-execution.md`; `designbook-skill-creator/resources/schema-composition.md`.
- **Neu (code):** `schema.yml` je erzeugtem Workflow-Tasks-Ordner (generiert, wegwerfbar).

## 10. Standards / Domain skills binding

- **`designbook-addon-skills`** — für die TS-Änderungen am Addon (Generator, Create-Pfad, Validierung).
- **`designbook-skill-creator`** — verbindlich vor jedem Editieren von task/rule/blueprint/schemas.yml unter `designbook/`/`designbook-drupal/` (CLAUDE.md).
- **`designbook-test`** — Vehikel für den funktionalen + Regressions-Nachweis (`debo-test run drupal-web …` aus dem Worktree, isolierte `workspaces/`).
- **Backend-Neutralität** (`feedback_no_backend_code_in_core`): Core `build_form` neutral (Free-String an `template`-Achse); Drupal-WHAT/HOW als Blueprints in `designbook-drupal`. **Keine Migration** bestehender Artefakte (`feedback_no_compat_code`) — `schema.yml`/`tasks.yml` werden from-scratch erzeugt.
- **Schema-first** (`feedback_schema_first`): Wo Config-getrieben möglich, `build_form`-Werte aus `entity_mapping.templates` ableiten statt Prosa.
