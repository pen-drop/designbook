# DESIGNBOOK-38 — Spec: `sync-to` synchronisiert Scenes (Config **und** Inhalt); `config-verify` gleicht die Scene 1:1 gegen die echte Seite ab

**Task-Art:** `debo-test` (skill-authoring — designbook-Kern-Workflows `sync-to` + `config-verify` und die
Drupal-Integration `designbook-drupal`). · **Sub-work:** `work:docs` (explizites Label).
**Ziel-State nach spec:** `coding`.
**Scenario:** none — `scenario_required: false`. Kein Gherkin/`.feature`, keine BDD-Oberfläche.
**Gate (coding/review):** der ausführbare Check ist der `debo-test`-Case (siehe §9), nicht ein bloßer
Doku-Struktur-Check. Das folgt `WORKFLOW.md` §coding/§review (Projekt-Override; jede Änderung an einem
designbook-Skill wird über den passenden `debo-test`-Tester verifiziert, nie ad-hoc).

**Design-Methode:** aus dem Ist-Code (`sync-to`, `config-verify`, `designbook-drupal/data-mapping`,
Addon-Resolver `render-url.ts`/`story-id.ts`/`story-match.ts`, `capture-*.ts`, `design/schemas.yml`,
`scenes/schemas.yml`, `data-model/schemas.yml`) erhoben; die fünf offenen Spec-Entscheidungen des
Tickets sind unten je mit Alternative + Begründung entschieden.

> **Bindende Standards (Repo-Regeln, CLAUDE.md + Memory):**
> - **`designbook-skill-creator`-Guardrail:** jede Änderung an Task/Rule/Blueprint/Workflow/`schemas.yml`
>   unter `.agents/skills/designbook/**` bzw. `.agents/skills/designbook-*/**` erfordert, dass zuvor
>   `designbook-skill-creator` geladen ist. Gilt in **coding**, nicht in spec (spec baut nichts).
> - **Keine Migration/Kompatibilität:** On-Disk-Artefakte sind disposable, Tests laufen from scratch —
>   kein Code, der alte gesynchte Artefakte liest/aktualisiert.
> - **Core bleibt backend-neutral:** kein Backend-Code in Part 1. Drupal-Spezifika ausschließlich als
>   Command-String oder Config in `designbook-drupal` (Rules/Blueprints) bzw. `designbook.config.yml`.
> - **Schema-first:** so viel wie möglich über Schema-Enums/`required`/Validatoren erzwingen statt über
>   imperative Regelprosa (Enum-Erweiterung `config_type`, neue Content-Unit-Schemas).

---

## 1. Problem / Ist-Zustand

`sync-to` erzeugt heute **ausschließlich Config**: `resolve-filter` expandiert `data_model.content.*`
und `data_model.config.*` zu `ConfigNameUnit`s (Bundle-Typ, `field.storage.*`, `field.field.*`,
`core.entity_view_(mode|display).*`, `core.entity_form_(mode|display).*`, Config-Keys), `transform`
schreibt YAML, `sync` importiert per `backend_cmd.import`. **`grep -ril scene` über `sync-to/` → 0
Treffer.** Es gibt weder eine Scene-Eingabe noch echte **Content-Instanzen** — die Seite selbst
existiert im Backend nicht.

`config-verify` kennt nur `config_type: entity_view_display` (Enum mit genau einem Wert, in
`config-verify/workflows/config-verify.md` **und** in `design/schemas.yml#/ConfigType`). Der Kandidat
ist ein per Selektor isolierter Entity-Render (`renderUrlCommand` → Canonical-URL einer
repräsentativen Entity, Isolations-Selektor `.node`/`article.node`). Es gibt keine echte Seite, gegen
die Full-Page verglichen werden könnte.

**Wiederverwendbar & bereits vorhanden (per Recherche bestätigt, kein Addon-Code nötig):**

| Baustein | Ort | Befund |
|---|---|---|
| Full-Page-Capture (leerer Selektor ⇒ ganze Seite) | `packages/storybook-addon-designbook/src/cli/capture-browser.ts:74-77` | `if (!opts.selector) page.screenshot({ fullPage: opts.fullPage ?? true })` — bestätigt |
| `render_url`-Resolver, backend-neutral | `src/resolvers/render-url.ts` | substituiert `{config_id}` (Z.50) **und** optional `{story_id}` (Z.52-65); `http(s)://`-Passthrough (Z.29-31); führt projektseitiges Command aus |
| `story_id`/`story_url`/`reference_folder`-Resolver | `src/resolvers/story-id.ts`, `story-url.ts`, `story-match.ts`, `reference-folder.ts` | Scene→Story-Matching über `resolveRunningIndexedStory`; `:`-getrennte Group/Name-Teilmengensuche; `scene_path` re-resolviert Scene-IDs |
| Scene-Schema (`SceneId`, `StoryId`, `SceneFile`, `SceneDef`) | `.agents/skills/designbook/scenes/schemas.yml` | Scene = `SceneDef.name`; `StoryId` = `Group/Component--variant` |
| Passthrough-Blueprints Seiten-Bauform | `designbook-drupal/data-mapping/blueprints/layout-builder.md`, `canvas.md`, `layout-builder-display.md`, `ui-patterns.md` | LB: `layout_builder__layout` als `ComponentNode[]`; Canvas: `canvas_page.component_tree` inline; deterministische `uuid5`-Regel für idempotente Sections |
| `ScoreReport`/`VerifyResult` (avg/max_diff_percent, checks) | `.agents/skills/designbook/design/schemas.yml` (VerifyResult 218-259, ScoreReport 261-276) | unverändert wiederverwendbar |
| `ensure-baseline-live` (Storybook live pro Lauf) | `.agents/skills/designbook/design/tasks/ensure-baseline-live.md` | „re-captured every run, unconditionally" — unverändert |

**Kein TS-Code kodiert den `config_type`-Enum oder `entity_view_display` hart** (verifiziert per grep
über `packages/storybook-addon-designbook/src`, ohne Tests: 0 Treffer außer einem Kommentar in
`render-url.ts`). Der Enum lebt nur in Skill-`.md`/`.yml`. → Enum-Erweiterung ist eine reine
Skill-Änderung.

---

## 2. Offene Spec-Entscheidungen (entschieden)

### D1 — Bauform (Layout Builder vs. Display Builder) deklarativ bestimmen  *(AC-2)*

**Entscheidung:** aus dem **View-Mode-`template` des Full-View-Mode des Seiten-Bundles im
`data-model.yml`**, nicht geraten:
- `view_modes.full.template: layout-builder` ⇒ **Layout Builder**: Block-Content-Instanzen werden
  angelegt und über `layout_builder__layout` in die Seite (Node) integriert.
- `view_modes.full.template: canvas` ⇒ **Display Builder**: eine **Page-Entity** (`canvas_page`) mit
  inline `component_tree`.

**Begründung:** Die Bauform ist bereits deklarativ im Datenmodell kodiert — die Extension-Rules
(`designbook-drupal/data-model/rules/canvas.md`, `.../layout-builder.md`) setzen genau diese
`template`-Werte, und die Passthrough-Blueprints (`layout-builder.md`/`canvas.md`) triggern darauf.
Die Scene bindet an eine Screen-Komponente → ein Seiten-Bundle → dessen Full-View-Mode-`template`.
So bleibt die Quelle der Wahrheit das `data-model.yml` (eine einzige deklarative Stelle).
**Alternative (verworfen):** Bauform aus der Scene selbst oder aus `designbook.config.yml` ableiten —
verworfen, weil die Scene die *Inhalte* trägt, nicht die Backend-Bauform, und weil `designbook.config.yml`
projekt-, nicht seitenweit gilt (mehrere Bundles/Templates pro Projekt möglich).

### D2 — Content-Units: Benennung, Reihenfolge, Idempotenz, Command-Strings  *(AC-1, AC-3, AC-4)*

**Entscheidung:**
- **Neue Unit-Art `content`** neben den Config-Units. Schema-first: ein neues Schema (Arbeitsname
  `ContentUnit` in `sync-to/schemas.yml`) mit `required: [content_ref, entity_type, bundle]`, wobei
  `content_ref` eine **deterministische Identität** ist, gemint aus Scene + Rolle
  (`uuid5(<url-namespace>, scene_id + '/' + role)` — analog der bestehenden
  `layout-builder-display.md`-UUID-Regel), plus dem Payload-Kontext (die aufgelöste `ComponentNode`/
  Feldwerte aus Scene + Sample-Data).
- **Reihenfolge (Abhängigkeit vor Nutzer):** `resolve-filter` (bzw. eine Scene-Resolve-Erweiterung)
  emittiert in dieser Ordnung:
  1. **Config** der beteiligten Bundles + Displays (bestehender Pfad) — z. B. `block_content.type.hero`
     + `field.*` + `core.entity_view_display.*` (LB) bzw. `canvas_page`-Bundle + Display (Canvas).
  2. **Content:** Block-Instanzen (LB) — vor
  3. **Content:** die **Seite** (Node mit `layout_builder__layout`, das die Block-Instanzen referenziert
     — LB) bzw. die `canvas_page`-Entity (Canvas). Bei Canvas entfällt Schritt 2 (Inhalt inline).
- **Idempotenz (Content hat keinen `config:get`):** neuer Backend-Command-String
  `backend_cmd.content_exists_cmd` (in `designbook.config.yml` + Drupal-Rule), der per deterministischer
  `content_ref` (UUID/Marker-Feld) exit 0 liefert, wenn die Entity existiert. `resolve-filter` filtert
  Content-Units über diesen Check genauso wie Config-Units über `exists_cmd` → zweiter Lauf =
  leere/partielle Liste, keine Duplikate, kein Abbruch.
- **Anlegen:** `transform` erzeugt den Content-Payload (deterministische UUID im Payload), `sync` legt
  ihn über einen neuen Command-String `backend_cmd.content_import_cmd` an (z. B. per
  `default_content`-artigem Import oder drush-Content-Command) — Core führt den String opaque aus,
  gleiche Transform→Sync-Mechanik wie Config, keine neue Engine-Fähigkeit.

**Begründung:** spiegelt den bestehenden Existence-Filter/`each`-Mechanismus 1:1 auf Content, ohne
Vorab-Markierungen; die deterministische UUID macht LB-Sections **und** Content-Instanzen re-sync-stabil
(schon als Regel in `layout-builder-display.md` etabliert). Alle Drupal-Spezifika bleiben
Command-Strings → Core neutral (AC-13). **Alternative (verworfen):** Content ohne Existenz-Check
immer neu anlegen und auf drush-Idempotenz hoffen — verworfen, verletzt AC-4 (Duplikate).

### D3 — Scene als `config-verify`-Eingabe + `config_type`-Erweiterung  *(AC-7)*

**Entscheidung:** `config_type`-Enum um den Wert **`scene`** erweitern — an **beiden** Stellen:
`config-verify/workflows/config-verify.md` (Param `config_type`) **und** `design/schemas.yml#/ConfigType`
(`enum: [entity_view_display, scene]`). Für `config_type: scene` ist `config` die **Scene-Identität**
(`SceneId`, z. B. `article-detail`). Der bestehende `story_id`-Resolver (`from: config`,
`sources: [scenes]`) löst daraus die Scene-Story (Referenz) auf — Scene→Story-Matching existiert
bereits (`story-match.ts`). `reference_url`/`reference_dir` unverändert.

**Begründung:** Der Dispatch war laut Schema-Kommentar (`ConfigType`: „stays open so further
config-types can be added later without reworking the workflow") explizit für genau diese Erweiterung
gebaut; `ConfigTarget` hält `config_id` opaque und delegiert Story-/URL-Auflösung per-config-type/-backend.
**Alternative (verworfen):** ein separater Workflow `scene-verify` — verworfen, weil AC-11/AC-12
(measure→fix→re-measure, Fix nur Backend) und `ensure-baseline-live` identisch bleiben sollen; nur das
Subjekt + der Kandidat ändern sich.

### D4 — Seiten-URL-Auflösung: eigener Resolver oder bestehendes `renderUrlCommand` + Scene-Token  *(AC-5, AC-9)*

**Entscheidung:** **kein neuer Core-Resolver.** Der bestehende `render_url`-Resolver wird
wiederverwendet; die **Drupal-Rule `config-verify-render-url.md`** erhält eine **Scene-Variante** des
`renderUrlCommand` — ein drush-Command, das die **Canonical-URL der gesynchten Seite** über die
deterministische Scene-Identität (`content_ref`/Marker) auflöst und nur die URL druckt. Für
`config_type: scene` substituiert der Resolver `{story_id}` bzw. die Scene-`config_id` in dieses
Command. Der `sync-to`-`outtake` weist dieselbe erreichbare Seiten-URL aus (AC-5).

**Begründung:** `render-url.ts` substituiert bereits `{config_id}`/`{story_id}` und macht http-Passthrough;
die einzige Backend-Spezifik ist der Command-String → gehört per AC-13 nach `designbook-drupal` /
`designbook.config.yml`. So bleibt es eine reine Skill-/Config-Änderung. **Wichtig — keine
Preview-Route:** die Scene-Variante nennt **keine** Preview-Route eines designbook-Drupal-Moduls; sie
liefert die echte Seiten-URL. Der bisherige Isolations-Selektor-Passus der Rule wird für die
Scene-Variante durch **Full-Page (leerer Selektor)** ersetzt (AC-9, AC-10).

### D5 — Wird eine Addon-/TS-Oberfläche berührt?  *(qualifikationskritisch)*

**Entscheidung/Befund:** **Nein — reine Skill-/Config-Änderung.** Verifiziert:
- Full-Page-Capture existiert (`capture-browser.ts:74-77`).
- `render_url`-Resolver ist backend-neutral und über Command-String wiederverwendbar.
- Scene→Story-Auflösung existiert (`story-match.ts`, `scene_path`).
- Der `config_type`-Enum ist **nicht** in TS hartkodiert (nur in `config-verify.md` + `design/schemas.yml`);
  `workflow-resolve.ts` lädt `schemas.yml` generisch, `workflow-summary.ts` liest `scoreReport` generisch.

→ **Kein `work:code`, keine Re-Qualifikation, kein `pnpm check` erforderlich.** Das bestätigt die
Qualification-Erwartung. *Vorbehalt für coding:* falls sich beim Bauen wider Erwarten doch eine
zwingende TS-Änderung zeigt (z. B. eine Content-Anlege-Fähigkeit, die nicht über einen Command-String
abbildbar ist), ist der Fund zu eskalieren und eine Re-Qualifikation mit `work:code` fällig
(Memory `feedback_subagent_validation`).

---

## 3. Betroffene Dateien (coding)

**Part 1 — Core (`.agents/skills/designbook`):**
- `skills/sync-to/schemas.yml` — neues `ContentUnit`-Schema; ggf. `SceneUnit`-Eingabe.
- `skills/sync-to/workflows/sync-to.md` — Scene als Sync-Einheit (`unit: scene` + Scene-Ref); Config-only-Pfad
  (`unit: data-model`) unverändert lassen (AC-6).
- `skills/sync-to/tasks/intake.md` — Scene-Eingabe laden (Scene-Datei-Pfad).
- `skills/sync-to/tasks/resolve-filter.md` — Content-Unit-Expansion + Ordnung + Content-Existence-Filter.
- `skills/sync-to/tasks/transform.md` — Content-Payload-Zweig (deterministische UUID).
- `skills/sync-to/tasks/sync.md` — Content-Anlege-Command (`content_import_cmd`).
- `skills/sync-to/tasks/outtake.md` — erreichbare Seiten-URL im Summary (AC-5).
- `skills/config-verify/workflows/config-verify.md` — `config_type`-Enum + `scene`-Dispatch; Kandidat =
  echte Seiten-URL, Full-Page.
- `design/schemas.yml` — `ConfigType.enum` += `scene`; ggf. `ConfigTarget` präzisieren.

**Part 3 — Integration (`.agents/skills/designbook-drupal`):**
- `data-mapping/rules/config-verify-render-url.md` — Scene-Variante des `renderUrlCommand` (echte
  Seiten-URL, Full-Page, **keine** Preview-Route); Isolations-Selektor nur noch für die
  `entity_view_display`-Variante.
- `data-mapping/blueprints/layout-builder.md` / `canvas.md` — ggf. Content-Anlege-Payload-Guidance.
- `install/blueprints/designbook-config.md` — neue `backend_cmd`-Keys (`content_exists_cmd`,
  `content_import_cmd`) dokumentieren.

**Verifikation (`fixtures/`):** neuer `debo-test`-Case + Fixture (siehe §9).

Kein Addon-/TS-File. Kein Backend-Modul, keine Preview-Route.

---

## 4. Risiken

- **R1 — Content-Anlege-Mechanik.** Ob Content-Instanzen (Node + `layout_builder__layout`,
  `canvas_page.component_tree`) sauber über einen einzelnen Command-String anlegbar sind, ist der
  größte Unsicherheitsfaktor. Mitigation: gleiche Transform→Sync-Mechanik wie Config (Payload-Datei +
  Import-Command); wenn der bestehende Engine-`each`/Import-Pfad nicht reicht, **eskalieren** statt TS
  hinzuzufügen (D5-Vorbehalt).
- **R2 — `--validate config-verify`-Verdrahtung.** Der `--validate`-Mechanismus (`run.md`) validiert
  „die vom Hauptlauf produzierte Story" — für einen `sync-to`-Scene-Lauf gibt es keine „produzierte
  Story". Mitigation: Der Case-Body fährt beide Workflows (sync-to → config-verify mit Scene-Subjekt);
  `--validate` wird nur genutzt, wenn die Harness das Scene-Subjekt trägt, sonst validate=none und
  config-verify läuft im Case-Body. Spec fixiert die **Absicht** (Sync + Full-Page-Abgleich gegen die
  echte Seite), coding fixiert die genaue Harness-Verdrahtung.
- **R3 — Full-Page-Determinismus.** Ganze Seite inkl. Shell/Header/Footer kann nicht-deterministische
  Elemente enthalten. Mitigation: Referenz ist die Scene-Story (die die ganze Seite als Story rendert);
  Full-Page-vs-Full-Page bleibt symmetrisch.

---

## 5. Akzeptanzkriterien-Mapping (Kurz)

| AC | Adressiert durch |
|---|---|
| 1 | D2 (Content-Units) + sync-to Scene-Eingabe |
| 2 | D1 (View-Mode-`template`) |
| 3 | D2 (Reihenfolge Abhängigkeit vor Nutzer) |
| 4 | D2 (Content-Existence-Filter, deterministische UUID) |
| 5 | D4 (Seiten-URL im outtake, HTTP 200) |
| 6 | Config-only-Pfad `unit: data-model` unangetastet — Diff + `sync-node`-Testlauf |
| 7 | D3 (`config_type` += `scene`, benannt) |
| 8 | `ensure-baseline-live` unverändert (Storybook live) |
| 9 | D4 (echte URL, keine Preview-Route in Workflow **und** Rule) |
| 10 | D4 (Full-Page, kein Isolations-Selektor) |
| 11 | `ScoreReport`/measure→fix→re-measure unverändert |
| 12 | `polish-config` fasst nur Backend-Config/-Inhalt an |
| 13 | D5 (Core neutral, Diff-Beleg) |
| 14 | §9 `debo-test`-Case |

Siehe `plan.md` für die geordnete Checkbox-Umsetzung.
