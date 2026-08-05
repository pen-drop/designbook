# DESIGNBOOK-38 — Spec (v3, config-only)

> **Re-Spec after review → spec bounce (2026-08-05).** The delivered v2 Scene-sync path created
> **content** (a `node/1` page entity + `block_content` instances via `content-import.php`). The
> review verdict (comment 1802) and the re-qualification (handoff_version 2, comment 1808)
> established the premise is wrong: a Scene is **not** a content case — it is a **composite *config*
> subject** (block configs + page template / layout config). `sync-to` must synchronise **config
> only**. This spec redesigns the sync half config-only; the reconcile half (Goal B) and the addon
> fix survive unchanged.

**Task-Art:** `debo-test` **+ addon** · **Sub-works:** `work:docs` + `work:code` ·
**Ziel-State:** `coding` · **scenario_required:** `false` (kein Gherkin/`.feature`).

**Zu committende Artefakte:** `docs/gaia/designbook-38/spec.md` (dieses Dokument) +
`docs/gaia/designbook-38/plan.md`.

---

## Ausgangslage (on-disk, v2)

Der Branch trägt bereits die v2-Umbauten, von denen der Review folgende **behält**:

- **`config-verify` → `sync-verify`** umbenannt (Skill-Dir `sync-verify/`, `design/tasks/*--sync-verify.md`, `design/rules/sync-verify-subject-mapping.md`, `designbook-drupal/.../sync-verify-render-url.md`).
- **`#/Kind`-Dispatch** (`config | scene`) als gemeinsame Achse beider Workflows; `config_type` bleibt `[entity_view_display]` und ist **nicht** die Dispatch-Achse.
- **Full-Page-Scene-Reconcile** gegen die echte Seiten-URL (kein Isolations-Selektor, keine Preview-Route).
- **Addon-Fix `story-match.ts`** (dotted config-id → exakte Story-Id, keine Sibling-Kollision) — vom Review „sound and tested", behalten.

Verworfen (und in diesem Ticket zu entfernen) ist ausschließlich der **Content-Sync in `sync-to`**:
`transform-content`/`sync-content`-Stages, `ContentUnit`/`ContentSyncResult`, `content_exists_cmd`/
`content_import_cmd`, `content-import.php`, sowie die „Content payload"-Abschnitte der Drupal-Blueprints.

---

## Design-Entscheidungen

### D1 — Bauform deklarativ (AC-2)

Die Bauform kommt aus dem `template` des **Full-View-Mode des Seiten-Bundles** in `data-model.yml`:
`layout-builder` ⇒ Layout Builder, `canvas` ⇒ Display Builder. Nicht geraten, nicht aus der Scene und
nicht aus `designbook.config.yml` (Scene trägt Inhalt, nicht Bauform; Config gilt projekt-, nicht
seitenweit). **Beide Bauformen lösen sich zu Config auf, nie zu Inhalt.**

### D2 — Scene = Config-Units (AC-1/3/4/15) — Kern des Umbaus

Der Scene-Zweig von `sync-to` emittiert **nur `ConfigNameUnit`s** und läuft über den **bestehenden
Config-Pfad** (`resolve-filter` → `transform` → `sync`), ohne neue Unit-Art:

- **Layout Builder:** Block-(Typ-)Config + **Seiten-Layout-Config** =
  `core.entity_view_display.<et>.<bundle>.<full>` mit den `third_party_settings.layout_builder.sections`.
  Die Komponenten der Sections tragen ihre **SDC-Props (= sichtbarer Inhalt) inline in der
  Component-`configuration`** — der Inhalt lebt damit in der Config, nicht in Content-Entities.
- **Display Builder:** die **`page_layout`-/Seiten-Template-Config** mit inline eingebettetem
  Component-Tree; sie besitzt ihre eigene Route/URL.

**Reihenfolge (AC-3):** bestehende Dependency-vor-Nutzer-Ordnung von `transform` — Bundle-/
Block-Typ-/Layout-Config **vor** der Block-/Layout-Instanz-Config **vor** der Seiten-Config; der
`config:import` läuft ohne Reihenfolgen-Fehler durch.

**Idempotenz (AC-4):** der **bestehende `config:get`-Existence-Filter** (kein neuer Content-Pfad). Ein
zweiter Lauf liefert eine leere oder partielle Unit-Liste — keine Duplikate, kein Abbruch.

### D3 — Scene als `sync-verify`-Subjekt (AC-7/8/9/10)

Bereits on-disk und config-only korrekt — nur zu verifizieren/prosaisch zu bereinigen:
`#/Kind: scene` → Kandidat = echte Seiten-URL, **Full-Page** (leerer Selektor); Referenz = Scene-Story
(live Storybook, `ensure-baseline-live` unverändert). Keine Preview-Route, kein Isolations-Selektor.

**AC-7-Mapping (Entscheidung Q1):** Die Scene-Variante lebt im **`#/Kind`-Enum** (`config | scene`),
das die gemeinsame Dispatch-Achse ist; `config_type` bleibt `[entity_view_display]`. Die wörtliche
AC-7-Formulierung „`config_type` erweitert / Scene-Variante im Enum" ist damit über das `#/Kind`-Enum
erfüllt — dokumentiert, damit die AC-Lesart eindeutig ist. Der Review hat den `sync-verify`-Rename +
`#/Kind`-Dispatch ausdrücklich behalten; ein Rückbau auf `config-verify` + `config_type += scene`
würde dem widersprechen und unnötigen Umbau erzeugen.

### D4 — Seiten-URL (AC-5/9)

**Kein neuer Core-Resolver.** Der bestehende `render_url`-Resolver + die **Scene-Variante des
`renderUrlCommand`** in `sync-verify-render-url.md` (Drupal-Rule) liefert die echte URL:

- *Layout Builder:* Canonical-URL der einen kanonischen Bundle-Entity (siehe D5 — Fixture-Seed).
- *Display Builder:* Route/URL der `page_layout`-Config-Seite.

Der Command **druckt nur die URL**, **keine** Preview-Route. Full-Page = leerer Selektor (AC-10).

### D5 — Sichtbarer Inhalt der echten Seite (Entscheidung Q2: „Config trägt Inhalt")

Der sichtbare Inhalt ist **in der Config eingebettet** (SDC-Props in den LB-Sections bzw. inline
Component-Tree der `page_layout`-Config). Die config-gerenderte echte Seite reproduziert den
Storybook-Referenzrender **rein aus Config**; die **Storybook-Story ist autoritativ**.

- **Display Builder / Canvas:** reine Config-Route (`page_layout`-Config-Entity) — **keine Entity**
  nötig, vollständig content-frei.
- **Layout Builder:** die LB-Default-Sections rendern auf einer kanonischen Bundle-Entity; die dafür
  nötige **eine Bare-Entity** stellt die **Fixture** als Test-Seed bereit. Das ist **kein**
  `sync-to`-Content-Mechanismus — AC-15 verbietet den *Mechanismus* (Stages/Schema/Commands/Skript),
  nicht eine einzelne Fixture-DB-Zeile. `sync-to` erzeugt weiterhin ausschließlich Config.

### D6 — `work:code` (`story-match.ts`)

Der Addon-Fix ist bereits geliefert + getestet (vom Review behalten). Es wird **kein** weiterer
Addon-Bedarf erwartet; `pnpm check` bleibt grün (S2). **Vorbehalt:** erzwingt der config-only-Umbau
wider Erwarten eine zwingende TS-Änderung → eskalieren (kein stiller Scope-Zuwachs).

---

## Betroffene Dateien

**Core — `sync-to`:**
- `workflows/sync-to.md` — Stages `transform-content`/`sync-content` entfernen; Scene-Zweig-Prosa auf „Config-Units" umschreiben; Dispatch weiterhin über `scene`-Input (`kind`).
- `schemas.yml` — `ContentUnit` + `ContentSyncResult` entfernen; Scene-Zweig emittiert `ConfigNameUnit`; `ExportSummary.page_url` von „content identity" auf config-abgeleitete Seiten-URL umformulieren.
- `tasks/resolve-filter.md` — Scene-Expansion → Config-Units (kein `content_units`); Content-Cmd-Referenzen raus.
- `tasks/transform.md` — Scene-Config-Units wie bestehende Config-Units autorieren (Ordering/Existence unverändert).
- `tasks/outtake.md` — `page_url` aus der config-abgeleiteten Seiten-Identität; Content-Refs raus.
- **löschen:** `tasks/transform-content.md`, `tasks/sync-content.md`.

**Core — `sync-verify` / `design`:**
- `sync-verify/workflows/sync-verify.md` — Fix-Ziel „backend config **and** content" → nur **backend config** (AC-12); Scene-Kind bleibt Full-Page.
- `design/tasks/polish-config.md`, `design/tasks/triage-config.md` — „config **and** content for a scene" → nur Config; Fix-Surface = Backend-Config.
- `design/schemas.yml` — `#/Kind` = `[config, scene]` (behalten), `config_type` = `[entity_view_display]` (behalten); Scene-in-`#/Kind` dokumentieren; etwaige content-bezogene Prosa entfernen.
- `design/rules/sync-verify-subject-mapping.md` — prüfen/bereinigen (Scene = Full-Page, config-only).

**Drupal-Integration:**
- `data-mapping/blueprints/layout-builder.md` — „Content payload"-Abschnitt → **Config-Expansion** (LB-Sections-Config mit eingebetteten Component-Configs).
- `data-mapping/blueprints/canvas.md` — „Content payload"-Abschnitt → **`page_layout`-Config-Route-Expansion** (inline Component-Tree als Config).
- `data-mapping/rules/sync-verify-render-url.md` — Scene-`renderUrlCommand` auf die echte Seiten-URL ohne content-uuid-Abhängigkeit (LB: Canonical-URL der Fixture-Bare-Entity; Canvas: `page_layout`-Route); `polish-config`-Scene-Fix-Surface auf **Config** einschränken (AC-12).
- `install/blueprints/designbook-config.md` — `content_exists_cmd`/`content_import_cmd` + Content-Prosa entfernen; Config-`backend_cmd` behalten.

**Config / Fixture / Test:**
- `packages/integrations/test-integration-drupal/designbook.config.yml` — `content_exists_cmd`/`content_import_cmd`/content-`page_url_cmd`-Templates entfernen; Scene-`renderUrlCommand` (config-only) ergänzen/anpassen.
- `fixtures/drupal-web/sync-verify-scene/` — `content-import.php` **löschen**; `data-model.yml` (Seiten-Bundle mit `view_modes.full.template: layout-builder` bzw. `canvas`) + Scene beibehalten; Fixture-Bare-Entity-Seed für die LB-URL bereitstellen (Test-Seed, kein Content-Sync).

---

## Acceptance-Criteria-Mapping (alle 15 + S1/S2)

| AC | Erfüllt durch | Evidenz |
|---|---|---|
| 1 — Scene ⇒ geordnete **Config**-Unit-Liste, keine Content-Units | D2 | `debo-test` `workflow summary --json`, Diff |
| 2 — Bauform deklarativ, beide ⇒ Config | D1 | Doc/Diff |
| 3 — Reihenfolge Dependency-vor-Nutzer, Import ohne Fehler | D2 | Testlauf `cim_ok` |
| 4 — 2. Lauf idempotent (`config:get`) | D2 | 2. Lauf, leere/partielle Liste |
| 5 — `outtake` weist erreichbare URL (HTTP 200) | D4 | HTTP-200 der Seiten-URL |
| 6 — `unit: data-model`-Pfad unverändert | Scene-Zweig getrennt | `sync-node`-Regression + leerer Diff |
| 7 — Scene als Verifikationssubjekt, im Enum benannt | D3 (`#/Kind += scene`) | Doc/Diff |
| 8 — Referenz = live Storybook, `ensure-baseline-live` unverändert | D3 | Diff |
| 9 — Kandidat = echte URL, keine Preview-Route | D4 | Diff + Negativ-Grep Preview-Route |
| 10 — Full-Page, kein Isolations-Selektor | D3 | Diff |
| 11 — measure→fix→re-measure, `ScoreReport` | unverändert | `ScoreReport` |
| 12 — Fix-Pass nur Backend-**Config** | `polish/triage-config`, render-url-Rule | Diff |
| 13 — Core backend-neutral, kein Backend-Code in Part 1 | Command-Strings/Config | Diff |
| 14 — `debo-test`-Case (Scene-Config-Sync + `sync-verify`), `pnpm check` grün | Fixture + Case | Testlauf + `pnpm check` |
| 15 — **kein** Content-Sync-Mechanismus | Content-Entfernung | Negativ-Grep/Diff |
| S1 (`work:docs`) — Case grün | AC-14-Lauf | `debo-test` |
| S2 (`work:code`) — `pnpm check` grün inkl. Kollisions-Regressionstest | `story-match.ts` (behalten) | `pnpm check` |

---

## Risiken

- **R1** — Ob das konkrete Drupal-Modul LB-section-eingebettete Component-Props ohne Content-Entity
  rendert. Adressiert über den Drupal-Blueprint (Config-Expansion). Trägt das Modul es nicht →
  eskalieren, **kein** Core-TS.
- **R2** — Die LB-URL braucht eine kanonische Bare-Entity. Als **Fixture-Seed** gelöst; der AC-15-
  Negativ-Grep muss sauber bleiben (Seed ≠ Content-Mechanismus im Skill).
- **R3** — Full-Page-Determinismus (Shell/Header/Footer). Symmetrisch Full-Page-vs-Full-Page; Referenz
  ist die Scene-Story als ganze Seite.
- **R4** — Die `--validate`-Harness trägt das Scene-Subjekt evtl. nicht. Fallback: `sync-verify` im
  Case-Body fahren, `validate=none`.

---

## Guardrails (in coding)

- **`designbook-skill-creator`** vor jedem Schreiben an Task/Rule/Blueprint/Workflow/`schemas.yml`
  unter den geschützten designbook-Skill-Bäumen laden (`CLAUDE.md`).
- **Keine Migration/Kompatibilität** — On-Disk-Artefakte sind disposable, Tests laufen from scratch.
- **Core bleibt backend-neutral** — Drupal-Spezifika nur als Command-String/Config in
  `designbook-drupal` bzw. `designbook.config.yml`.

## Verifikation (ausführbarer Check)

```
debo-test run drupal-web sync-verify-scene --validate sync-verify
```

Aus dem Ticket-Worktree. Evidenz: `workflow summary --json`, `ScoreReport`
(`avg_diff_percent`, `max_diff_percent`, `checks_passed`/`checks_total`), HTTP-200 der Seiten-URL,
2. Lauf idempotent. Regression (AC-6): `debo-test run drupal-web sync-node` grün + leerer Diff des
`unit: data-model`-Pfads. `pnpm check` grün (S2). AC-15: Negativ-Grep auf die entfernten
Content-Sync-Artefakte.
