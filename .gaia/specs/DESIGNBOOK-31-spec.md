# DESIGNBOOK-31 — Spec & Implementation Plan

**Ticket:** data-model: `form_modes` als backend-neutrale Bundle-Deklaration (Drupal-Abbildung: `entity_form_display`)
**Workflow:** `gaia_chore` · **Sub-work:** `work:docs` · **Task-Art:** `skill-authoring`
**Runtime surface:** none (Schema-Beitrag + Blueprint-/Rule-Prosa + Fixture) → doc-strukturelle Verifikation, funktional über einen `debo-test`-Case (`WORKFLOW.md`, State: coding). `scenario_required = false`.

---

## 1. Problem

Ein Bundle hat zwei Display-Hälften: **lesen** und **bearbeiten**. Die Lese-Hälfte ist im data-model
backend-neutral als `view_modes` deklarierbar (`.agents/skills/designbook/skills/data-model/schemas.yml:17`).
Die **Bearbeiten-Hälfte fehlt vollständig** — es gibt keine Möglichkeit, die benannte Edit-Darstellung
eines Bundles (Drupal: `entity_form_display` + `entity_form_mode`) zu modellieren.

`form_modes` ist dasselbe Konzept eine Ebene weiter: eine **benannte Darstellungsvariante eines Bundles
zum Editieren**. Das ist kein Drupal-Konzept — jedes System, das Inhalte bearbeitet, hat Edit-Layouts.
Es gehört damit **symmetrisch zu `view_modes` in den Core-Skill**; die backendspezifische Abbildung
bleibt in `designbook-drupal`.

Dies ist die **Route-Hälfte** der Trennung; die Block-Hälfte (Views-Blöcke, Exposed Filter, User Login)
ist DESIGNBOOK-30 (unabhängig, keine Reihenfolge-Abhängigkeit).

## 2. Kontext — wie `view_modes` heute durch die Pipeline fließt (das Vorbild)

Die Symmetrie-Forderung (AC-2/-7) ist nur präzise erfüllbar, wenn das Vorbild exakt gespiegelt wird.
`view_modes` fließt über **drei** Ebenen — nicht zwei:

| Ebene | Datei | Rolle für `view_modes` |
|---|---|---|
| **Part 1 — Deklaration (neutral)** | `designbook/skills/data-model/schemas.yml:17-28` | Shape: `template` required, `label` optional, `settings` optional, Mode-Objekt geschlossen. `label`-`description` nennt `core.entity_view_mode.<et>.<mode>` als Grund für die required-by-sync-to-Regel (neutraler Text darf Drupal-Namen nennen). |
| | `designbook/skills/data-model/tasks/create-data-model.md:79-110` | WAS: `view_modes`/`template`, Format-Block, Dialog-Prosa. |
| **Part 1 — Emission (sync-to, core)** | `designbook/skills/sync-to/tasks/resolve-filter.md:66-70` | Emittiert pro View-Mode **zwei** Units: `core.entity_view_mode.<et>.<view_mode>` (nur Nicht-Default, dedupliziert, Existence-Filter droppt Core-Modes) **und** `core.entity_view_display.<et>.<bundle>.<view_mode>`. Trägt bereits Drupal-Config-Namen — der Existence-Filter ist der Dependency-Mechanismus. |
| **Part 3 — Transform (drupal)** | `designbook-drupal/data-mapping/blueprints/layout-builder-display.md:7` | `trigger.config_name: 'core.entity_view_display.*'` + `filter.extensions: layout_builder`; das `### to_drupal`-Block formt die Display-Unit in Drupal-Config-YAML. `transform.md:89` wählt das Blueprint per `config_name`-Glob. |

**Konsequenz für den Scope:** „Part 1 kennt keine Drupal-Config-Namen **als Struktur**" (PM-Prinzip,
AC-3) meint die **Deklarations-Schicht** (`schemas.yml` / `create-data-model.md`) — dort schreibt der
Autor `form_modes: { default: { template: form } }`, ohne einen einzigen Drupal-Namen. Die
**sync-to-Emission** (`resolve-filter.md`) ist die *Übersetzungs*-Schicht und trägt für `view_modes`
heute schon Drupal-Config-Namen; sie ist kein „Part 1" im PM-Sinn. `form_modes` muss dieselbe
Drei-Ebenen-Bahn nehmen — alles andere wäre inert (die Deklaration würde nie zu Config).

## 3. Decision (design)

`form_modes` **exakt symmetrisch** zu `view_modes` auf denselben drei Ebenen einführen:

- **Part 1 / Deklaration (neutral, Core):** `form_modes` als Geschwister von `view_modes` im
  content-Bundle in `schemas.yml`; identischer Shape; Symmetrie + „`default` ist der immer vorhandene
  Mode" im Task-Doc.
- **Part 1 / Emission (Core sync-to):** ein `form_modes`-Zweig in `resolve-filter.md`, der die
  view-mode-Emission spiegelt: `core.entity_form_display.<et>.<bundle>.<form_mode>` +
  (für Nicht-Default) `core.entity_form_mode.<et>.<form_mode>`, dedupliziert + Existence-Filter.
- **Part 3 / Abbildung (drupal):** Export-Pattern-Blueprint (Transform der `core.entity_form_display.*`-
  Unit) **plus** eine data-model-Rule mit den harten Drupal-Constraints (label-required-für-Nicht-Default,
  Routen-Semantik, Kommentarformular-Fall, Nicht-Ziel Feldauswahl/Widgets).

### Betroffene / neue Artefakte

```
Part 1 — Core (Deklaration, neutral)
  M  .agents/skills/designbook/skills/data-model/schemas.yml
       + form_modes-Block (Geschwister view_modes), Shape identisch, additionalProperties: false
       ~ Kopf-Kommentar (Z. 2) nennt zusätzlich form_modes
  M  .agents/skills/designbook/skills/data-model/tasks/create-data-model.md
       + form_modes im Format-Block + Prosa "view_modes/form_modes"; Symmetrie; default immer vorhanden;
         Beispiele node.article (default) und user.user (default + register)

Part 1 — Core (Emission, sync-to)
  M  .agents/skills/designbook/skills/sync-to/tasks/resolve-filter.md
       + form_modes-Zweig, spiegelt den view_modes-Zweig (Z. 66-70):
         core.entity_form_mode.<et>.<form_mode> (Nicht-Default, dedupliziert) + core.entity_form_display.<et>.<bundle>.<form_mode>

Part 3 — designbook-drupal (Abbildung)
  A  .agents/skills/designbook-drupal/data-mapping/blueprints/form-display.md
       trigger.config_name: 'core.entity_form_display.*', filter.backend: drupal
       ### to_drupal: Export-Pattern für core.entity_form_display.<et>.<bundle>.<form_mode>
       (+ Hinweis auf die gepaarte core.entity_form_mode.<et>.<mode>-Unit für Nicht-Default)
  A  .agents/skills/designbook-drupal/data-model/rules/form-modes.md
       filter.backend: drupal
       - HARTE Regel: label required für JEDEN Nicht-Default-Form-Mode (sync-to emittiert core.entity_form_mode.<et>.<mode>)
       - Routen-Semantik: /node/add/{type}, /node/{node}/edit, /user/{user}/edit, /user/register, comment/reply/{et}/{entity}/{field}
       - Kommentarformular-Fall: rendert über das `comment`-Feld im entity_view_display via core.entity_form_display.comment.<bundle>.default; kein Block, kein Contrib
       - Nicht-Ziel: volle entity_form_display-Feldsemantik (Feldauswahl, -reihenfolge, Widget-Config); KEIN widgets:/Feldauswahl-Feld
       - Core-Beleg: core/modules/user/config/install/core.entity_form_mode.user.register.yml (mehrere Form-Modes = Core-Realität)

Fixture + Verifikation (coding)
  A/M debo-test-Fixture mit einem Bundle, das ein Formular auf einer Edit-Route rendert (form_modes: default, ggf. register)
       — existiert keine passende Fixture, wird sie zuerst autoriert (AC-12/§7).
```

## 4. Resolved open decisions

| # | Decision | Choice | Rationale | Rejected alternative |
|---|---|---|---|---|
| **D1** | Wo lebt der `form_modes`-**Shape**? | **Core** `schemas.yml`, Geschwister von `view_modes`, identisch | v2-Ownership-Flip: „benannte Edit-Darstellung" ist backend-neutral; `view_modes` steht aus demselben Grund dort (AC-1/-2). | Beitrag von `designbook-drupal` via `extends`/`constrains` (das war Handoff v1; explizit ersetzt). |
| **D2** | Wo lebt die **Emission** (`core.entity_form_*`-Units)? | **Core** `sync-to/resolve-filter.md`, spiegelt den `view_modes`-Zweig | Die einzige Content→Config-Expansion ist `resolve-filter`; `view_modes` trägt dort schon Drupal-Namen. Ohne diesen Zweig ist `form_modes` inert (nie Config → `debo-test` nie grün). Blueprints hooken nur die **transform**-Stufe (per `config_name`), nicht `resolve-filter` — es gibt keinen Drupal-Override-Punkt für die Emission. | Emission nach `designbook-drupal` verschieben → erfordert einen neuen Extension-Point in `resolve-filter` (großer Refactor, out of scope) und wäre asymmetrisch zu `view_modes`. **Siehe R1 — dies ist der zu bestätigende Punkt.** |
| **D3** | Wo lebt die Regel **„label required für Nicht-Default"** + Routen + Kommentarformular? | **`designbook-drupal`** (`data-model/rules/form-modes.md`), nicht im Core-Schema | AC-3/-5: Drupal-spezifisch (die required-Bedingung folgt aus der Drupal-Config-Emission). Der Core-Schema-`label` bleibt optional (Default-Modes brauchen kein Label). | Regel ins Core-Schema (würde `label` fälschlich global erzwingen oder Backend-Wissen in Part 1 ziehen). |
| **D4** | Export-Pattern als **Blueprint** oder Rule? | **Blueprint** (`data-mapping/blueprints/form-display.md`, `config_name`-getriggert) für die Config-Form; **Rule** für die harten Constraints | Spiegelt `layout-builder-display.md` (view-display-Transform ist ein `config_name`-Blueprint). Skill-creator-Trennung: Blueprint = überschreibbarer Startpunkt (WIE die YAML aussieht), Rule = harte Constraints. | Alles in eine Rule (mischt WAS/WIE; skill-creator-Verstoß). |
| **D5** | `label`-`description` im Core-Schema | Darf `core.entity_form_mode.<et>.<mode>` **nennen** (nicht als Struktur) | AC-3: „dieselbe Freiheit, die `view_modes.label` heute schon nutzt" (`schemas.yml:26`). | Drupal-Namen aus der Beschreibung verbannen → inkonsistent mit `view_modes`. |

## 5. Risks

- **R1 — Emissions-Placement (der zu bestätigende Punkt).** D2 legt Drupal-Config-Namen in die
  **Core**-`resolve-filter.md`. Das folgt dem `view_modes`-Präzedenzfall und ist die einzige
  funktionale Bahn (kein anderer Extension-Point existiert), steht aber in **Wortlaut-Spannung** zum
  PM-Prinzip „Part 1 kennt keine Drupal-Config-Namen als Struktur", wenn man „Part 1" auf das gesamte
  Core-Plugin statt nur die Deklarations-Schicht liest. *Auflösung:* §2 grenzt Deklaration (neutral)
  von Emission (Übersetzung) ab; `view_modes` verhält sich identisch. **Bei der Bestätigung
  entscheiden**, ob diese Lesart mitgetragen wird.
- **R2 — Kein Fixture mit Edit-Route.** AC-12 braucht einen `debo-test`-Case, der ein Formular auf
  einer Edit-Route ausübt. Existiert keiner, wird er in coding **zuerst autoriert** (§7).
- **R3 — skill-creator-Konformität (AC-11).** Neue Rule/Blueprint müssen WAS-statt-WIE trennen und
  dürfen keine Schemas inline duplizieren. *Mitigation:* `designbook-skill-creator` in coding laden
  (Pflicht laut `CLAUDE.md` beim Editieren jeder task/rule/blueprint/schemas.yml unter
  `designbook*/`), passende per-file-type-Rule vorher lesen.
- **R4 — Existence-Filter droppt `user.register`.** `core.entity_form_mode.user.register` existiert im
  Stock-Drupal; der Existence-Filter droppt die Definition-Unit automatisch (wie bei Core-View-Modes
  `teaser`/`full`). Das ist korrekt — die Symmetrie-Doku muss das benennen, nicht „umgehen".

## 6. Acceptance ↔ evidence matrix (aus dem acceptance-Kommentar, v2)

| AC | What proves it |
|---|---|
| 1 — `form_modes` im Core `schemas.yml`, Geschwister `view_modes` | `git diff` zeigt Block in `data-model/schemas.yml`; **nicht** als Integrations-Beitrag |
| 2 — Shape identisch zu `view_modes` (template req, label opt, settings opt, geschlossen) | Schema-Diff; `additionalProperties: false` am Mode-Objekt |
| 3 — Part 1 bleibt backend-neutral (keine Drupal-Namen als Struktur) | `schemas.yml`/`create-data-model.md`: keine Drupal-Config-Namen als Keys/Struktur (Beschreibungen dürfen sie nennen) |
| 4 — `designbook-drupal` trägt Export-Pattern für **beide** Config-Namen | grep im Blueprint/Rule: `core.entity_form_display.<et>.<bundle>.<form_mode>` **und** `core.entity_form_mode.<et>.<mode>` |
| 5 — Regel „label required für Nicht-Default" in `designbook-drupal`, nicht im Core-Schema | `data-model/rules/form-modes.md` enthält die Regel; Core-`label` bleibt optional |
| 6 — Routen-Semantik in `designbook-drupal` | grep der fünf Routen im Rule-Doc |
| 7 — Symmetrie zu `view_modes` benannt; `default` immer vorhanden | `create-data-model.md`-Prosa |
| 8 — kein `widgets:`/Feldauswahl im Schema; Feldsemantik explizit Nicht-Ziel | Schema-Diff (nur template/label/settings) + Nicht-Ziel-Satz im Doc |
| 9 — Kommentarformular-Fall dokumentiert | Rule-Doc: `comment`-Feld im `entity_view_display` → `core.entity_form_display.comment.<bundle>.default`, kein Block |
| 10 — Beispiele `node.article` + `user.user` (default+register) validieren; `core.entity_form_mode.user.register.yml` referenziert | Schema lädt + validiert die Beispiele; grep der Beleg-Referenz |
| 11 — skill-creator-Konformität (Part-1-vs-Part-3-Trennung), mit geladenem Skill | Review mit geladenem `designbook-skill-creator` |
| 12 — `debo-test`-Case grün (Fixture Formular auf Edit-Route), Tester-Output am Ticket | `debo-test run <suite> <case>` → `workflow summary --json` (coding) |
| 13 — Standing `work:docs`: doc-strukturell grün | grep/git diff + Schema lädt/validiert die Beispiele |

## 7. Implementation plan (checkbox — für den coding-Step)

- [ ] **`designbook-skill-creator` laden** + `rules/common-rules.md` sowie `rules/schema-files.md` /
      `rules/rule-files.md` / `rules/blueprint-files.md` / `rules/task-files.md` je betroffenem
      Dateityp lesen (Pflicht vor jeder Edit unter `designbook*/`).
- [ ] **Core-Schema:** `form_modes`-Block als Geschwister von `view_modes` in
      `data-model/schemas.yml`; Shape identisch (`template` required, `label` optional mit
      `description` die `core.entity_form_mode.<et>.<mode>` nennt, `settings` optional,
      `additionalProperties: false`); Kopf-Kommentar (Z. 2) ergänzen.
- [ ] **Core-Task:** `form_modes` in `create-data-model.md` — Format-Block + Prosa-Sektion
      „`view_modes` / `form_modes`", Symmetrie, `default` als immer vorhandener Mode; Beispiele
      `node.article` (`default`) und `user.user` (`default` + `register`).
- [ ] **Core-Emission:** `form_modes`-Zweig in `sync-to/tasks/resolve-filter.md`, den `view_modes`-
      Zweig spiegelnd — Definition-Unit `core.entity_form_mode.<et>.<form_mode>` (nur Nicht-Default,
      dedupliziert) + Display-Unit `core.entity_form_display.<et>.<bundle>.<form_mode>`; Existence-
      Filter droppt Stock-Modes (z. B. `user.register`).
- [ ] **Drupal-Blueprint:** neu `data-mapping/blueprints/form-display.md`
      (`trigger.config_name: 'core.entity_form_display.*'`, `filter.backend: drupal`) mit `### to_drupal`-
      Export-Pattern für beide Config-Namen.
- [ ] **Drupal-Rule:** neu `data-model/rules/form-modes.md` — label-required-für-Nicht-Default,
      Routen-Semantik, Kommentarformular-Fall, Nicht-Ziel (Feldauswahl/Widgets), Core-Beleg
      `core.entity_form_mode.user.register.yml`.
- [ ] **Fixture:** `debo-test`-Case mit Formular auf einer Edit-Route (falls nicht vorhanden, zuerst
      autorieren); `debo-test run <suite> <case>` grün, `workflow summary --json` ans Ticket.
- [ ] **Verifikation:** doc-strukturell (grep/git diff) + Schema lädt und validiert beide Beispiele;
      auf Addon/TS-Berührung `pnpm check` (hier nicht erwartet — reine Skill-Markdown/Schema-Änderung).

## 8. Artifacts

- Diese Spec: `.gaia/specs/DESIGNBOOK-31-spec.md` (committed).
- In coding zu erstellen/ändern: die 3 Core-Edits (`schemas.yml`, `create-data-model.md`,
  `resolve-filter.md`), die 2 neuen `designbook-drupal`-Dateien (`form-display.md` Blueprint,
  `form-modes.md` Rule), die `debo-test`-Fixture.
