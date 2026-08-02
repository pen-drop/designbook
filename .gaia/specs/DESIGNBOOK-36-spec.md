# DESIGNBOOK-36 — Spec & Implementation Plan

**Ticket:** block_plugin: config-Schema öffnen — keine erzwungenen Props, wie andere config types
**Workflow:** `gaia_chore` · **Sub-work:** `work:docs` · **Task-Art:** `skill-authoring` (docs)
**Runtime surface:** none for the docs artifact itself (blueprint Markdown + schema YAML) → doc-structural + schema-load verification. Functional proof runs in coding through a `debo-test` **data-model** case (WORKFLOW.md State: coding, runtime-surface branch), never ad-hoc.
**Querbezug:** Follow-up / Teil-Reversal von **DESIGNBOOK-30** (PR #142). Kalibriert an dessen Spec (`.gaia/specs/DESIGNBOOK-30-spec.md`).

---

## 1. Problem

DESIGNBOOK-30 machte `block_plugin` zum **einzigen** Config-Type mit einem **erzwungenen** Data-Model-Schema: der Typ `#/BlockPlugin` in `.agents/skills/designbook-drupal/data-model/schemas.yml`, per `extends:` in `blueprints/block_plugin.md` in `config.block_plugin` injiziert. Er erzwingt feste Props: `plugin` + `component` required, `plugin`-Pattern, `layout`-Enum, optionales `module`.

Alle anderen Config-Types (`view`, `canvas_page`, `block_content`, `media`) haben **kein** `extends:` und **kein** Schema — sie fallen auf das offene Config-Modell zurück. Das Core-Data-Model (`.agents/skills/designbook/skills/data-model/schemas.yml`) hält explizit fest: `config` ist `additionalProperties: true` („Config stays open — each config type brings its own schema via extends/constrains"). `block_plugin` ist damit der Ausreißer.

**Ziel:** `block_plugin` verhält sich **genauso wie jeder andere Config-Type** — keine festen Props, offenes Schema, nur Bundles/Keys pro Type. Die dynamische Auflösung der Block-`settings` pro Plugin bleibt eine **Runtime**-Concern (config-verify), nicht authoring-time.

## 2. Decision (design)

Reversal der DESIGNBOOK-30-Enforcement in exakt zwei Skill-Dateien; der generische Addon-Fix bleibt unberührt:

```
.agents/skills/designbook-drupal/data-model/
  blueprints/block_plugin.md   # EDIT — frontmatter `extends:` (die #/BlockPlugin-Injektion in
                               #   config.block_plugin) entfernen; `suggests: component_by_family`
                               #   BLEIBT (weiche Discovery, keine Enforcement — wie media.md);
                               #   Prosa vom „hard contract"/erzwungenen Shape auf „offener Eintrag,
                               #   wie andere config types" umschreiben.
  schemas.yml                  # DELETE — `BlockPlugin` ist der einzige Inhalt; nach Entfernen des
                               #   Typs ist die Datei leer → gelöscht. config.block_plugin fällt auf
                               #   config.additionalProperties: true zurück.
```

**Unverändert (AC6):** der generische `$ref`-Hoisting-Fix in `packages/storybook-addon-designbook/src/workflow-schema-merge.ts` (aus DESIGNBOOK-30, Mirror des DESIGNBOOK-29-Fixes). Er ist **nicht** block_plugin-spezifisch (`grep` findet keinen `block_plugin`/`BlockPlugin`-Bezug darin) und trägt jede intra-file `$ref`-Auflösung — bleibt.

**Referenz-Integrität (AC4).** `BlockPlugin`/`#/BlockPlugin` wird nur an drei Stellen genannt: `schemas.yml` (Typ-Definition + Header-Kommentar) und `block_plugin.md` (die `extends:`-`$ref`-Zeile + ein Prosa-Satz). Beide Dateien werden hier angefasst → **kein dangling `$ref`** verbleibt (Skill-Validierung SCHEMA-01 grün).

**Parität (AC3).** Nach dem Edit hat kein Config-Blueprint (`block_content`, `canvas_page`, `media`, `node`, `taxonomy_term`, `view`) ein `extends:` in `config`. `field-types.md` behält sein `extends:` — das betrifft Feld-Constraints, keinen Config-Type, und ist nicht Teil der Parität. `block_plugin` ist nicht länger der Ausreißer.

## 3. Resolved decisions

| # | Decision | Choice | Rationale | Rejected alternative |
|---|---|---|---|---|
| **D1** | Enforcement-Rücknahme | `extends:`-Block aus `block_plugin.md` **entfernen**; `config.block_plugin` fällt auf `config.additionalProperties: true` zurück | AC1/AC2 — offen, keine required-Props/Pattern/Enum. | `extends:` behalten, Constraints lockern → bliebe ein Schema, verfehlt „offen wie andere". |
| **D2** | `schemas.yml` | **Löschen** (Datei wird durch Entfernen des einzigen Typs leer) | AC4 — leere Datei entfernen; kein toter `$ref`. | Leere `schemas.yml` behalten → toter Skill-Artefakt, SCHEMA-Validierung-Rauschen. |
| **D3** | `suggests: component_by_family` | **Behalten** | AC5 — weiche Discovery-Hinweise, keine Enforcement; konsistent mit `media.md` (`suggests:` ohne `extends:`). | Mitentfernen → verliert nützliche, unschädliche Discovery ohne Not. |
| **D4** | Prosa in `block_plugin.md` | Vom „hard contract"/„static per-entry shape … injected … by `extends:`" auf **offener Eintrag** umschreiben; Authoring-time-vs-runtime-Split bleibt (settings dynamisch pro Plugin, config-verify) | AC5 — kein erzwungener Shape mehr beschrieben; Runtime-Split bleibt fachlich korrekt. | Prosa unangetastet lassen → widerspräche dem entfernten Schema (Doku lügt). |
| **D5** | `workflow-schema-merge.ts` | **Unverändert** | AC6 — generisch, nicht block_plugin-spezifisch. | Anfassen → Scope-Verletzung, Regressionsrisiko am generischen Hoisting. |
| **D6** | Funktionaler Nachweis | **`debo-test` (data-model)** in coding, Suite **`drupal-web`**, neuer Case **`data-model-block-plugin`**; zusätzlich **`--validate design-verify`** gegen eine **Config-Entity** | AC8 + Auftraggeber-Zusatz (s. §4). drupal-web trägt die Drupal-Config/Sync/design-verify-Infrastruktur. | petshop-Suite / bestehenden Case erweitern → Auftraggeber wählte drupal-web + dedizierten Case; Erweitern vermischt Concerns. |

## 4. Verifikations-Vehikel (coding) — vom Auftraggeber präzisiert

Der funktionale Nachweis in coding hat **zwei Facetten**, beide über `debo-test` in der Suite `drupal-web`, aus **diesem Worktree** ausgeführt (isolierte `workspaces/`):

1. **Schema-offen-Nachweis (AC8, RED→GREEN des Reversals).** Neuer Case `fixtures/drupal-web/cases/data-model-block-plugin.yaml`: die `/debo data-model`-Ausführung erzeugt einen `config.block_plugin`-Eintrag mit einem **Shape, der unter `#/BlockPlugin` gescheitert wäre** (z. B. fehlendes required `plugin`/`component`, oder ein `plugin` außerhalb des alten Patterns, oder ein `layout` außerhalb des alten Enums). Assert: der Eintrag wird **akzeptiert** (unter dem offenen Modell), landet in `designbook/data-model.yml`, Workflow completed.

2. **Config-Entity-Render-Nachweis (Auftraggeber-Zusatz).** Post-DESIGNBOOK-35 (#146) rendern Config-Entities durch **denselben** Renderer-Pfad wie Content-Entities (`buildEntityModule → buildEntityCsfModule`) — einziger Unterschied: Sidebar-Gruppe `Config/<type>/<bundle>` + Tag `config`. Ein `--validate design-verify` gegen eine **Config-Entity** (analog zum bestehenden `design-verify-entity-signage`-Muster: gebaute Entity vorseeden, dann `design-verify` als Hauptworkflow) belegt „Config-Entities werden genauso gerendert wie normale Entities".

**Aufgezeichnete Invocation (coding):** `debo-test run drupal-web data-model-block-plugin --validate design-verify`.

## 5. Risks

- **R1 — design-verify-Komposition (höchstes).** `--validate design-verify` verifiziert eine **gerenderte Story vs. Referenz**. Ein reiner `data-model`-Lauf erzeugt noch keine gerenderte Config-Entity-Story (keine sample-data/component/Referenz). *Mitigation:* coding folgt dem `design-verify-entity-signage`-Muster (Fixtures `vision, data-model, tokens, css-generate, design-entity/-component` vorseeden, sodass die `Config/block_plugin/<key>`-Story existiert), oder splittet den Render-Nachweis in einen dedizierten `design-verify-block-plugin`-Case. Ist der Render-Nachweis für `block_plugin` nicht sinnvoll herstellbar, meldet coding das zurück statt zu erzwingen — die AC8-Facette (Facette 1) steht davon unabhängig.
- **R2 — versehentliche Enforcement-Rückkehr über Tests.** Falls ein bestehender Addon/TS-Test das alte `block_plugin`-Schema referenziert, wird der Test an das **offene** Modell angepasst — **keine** Enforcement zurückgeschmuggelt (AC7). *Mitigation:* `grep -rn "BlockPlugin\|block_plugin" packages/**/__tests__`; `pnpm check` grün.
- **R3 — Prosa-Drift.** Nach Schema-Entfernung darf die `block_plugin.md`-Prosa keinen „hard contract"/erzwungenen Shape mehr behaupten (AC5). *Mitigation:* Prosa-Sweep; grep auf „hard contract"/„required"/„enforce" im Body.

## 6. Acceptance ↔ evidence matrix

| AC | What proves it |
|---|---|
| 1 — `extends:` (#/BlockPlugin-Injektion) aus `block_plugin.md` entfernt | `git diff` block_plugin.md; grep Absenz `extends:` |
| 2 — `config.block_plugin` offen (fällt auf `additionalProperties: true`); keine required/Pattern/Enum | `workflow create` data-model → Schema-Merge zeigt kein block_plugin-Constraint; ein früher scheiternder Eintrag validiert jetzt |
| 3 — Parität zu view/canvas_page/block_content/media (kein Config-Schema) | grep: kein Config-Blueprint mit `extends:` außer field-types (kein Config-Type) |
| 4 — kein `BlockPlugin`-Typ mehr; leere `schemas.yml` entfernt; kein dangling `$ref` | `ls` zeigt Datei weg; `grep -rn BlockPlugin .agents/` leer; SCHEMA-01 grün |
| 5 — Prosa offen; `suggests: component_by_family` bleibt | `git diff` block_plugin.md; grep `suggests:` vorhanden, „hard contract" weg |
| 6 — `workflow-schema-merge.ts` unverändert | `git diff` zeigt Datei untouched |
| 7 — Skill-Validierung grün; `pnpm check` grün (Test ggf. ans offene Modell angepasst) | Skill-Validierung + `pnpm check` |
| 8 — debo-test (data-model): früher scheiternder `config.block_plugin`-Eintrag jetzt akzeptiert | `debo-test run drupal-web data-model-block-plugin` (+ `--validate design-verify`); `workflow summary --json` am Ticket |

## 7. Implementation plan (checkbox — for coding)

- [ ] **Load `designbook-skill-creator`** (Pflicht vor Editieren von blueprint/schemas.yml — CLAUDE.md) + `rules/blueprint-files.md`, `rules/schema-files.md`, `rules/common-rules.md`.
- [ ] `blueprints/block_plugin.md`: `extends:`-Block aus dem Frontmatter entfernen; `suggests: component_by_family` **behalten**; Body-Prosa vom „hard contract"/erzwungenen Shape auf „offener Eintrag, wie andere config types" umschreiben (Authoring-vs-runtime-Split + config-verify bleiben).
- [ ] `data-model/schemas.yml`: `BlockPlugin`-Typ entfernen; da einziger Inhalt → **Datei löschen**.
- [ ] Bestätigen, dass `workflow-schema-merge.ts`, `view.md`, `canvas_page.md`, `block_content.md`, `media.md` **unverändert** sind (`git diff`).
- [ ] `grep -rn "BlockPlugin" .agents/ packages/` == leer (kein dangling `$ref`, keine Test-Referenz); ggf. Addon-Test ans offene Modell anpassen (keine Enforcement zurück).
- [ ] `designbook-skill-creator`-Konformität (BLUEPRINT-/SCHEMA-/common-rules) grün.
- [ ] Fixture-Case `fixtures/drupal-web/cases/data-model-block-plugin.yaml` autoren: erzeugt einen `config.block_plugin`-Eintrag, der unter `#/BlockPlugin` gescheitert wäre, und assertet Akzeptanz (AC8).
- [ ] Für die Render-Facette (R1): Config-Entity-Story + Referenz nach dem `design-verify-entity-signage`-Muster vorseeden (oder dedizierten `design-verify-block-plugin`-Case), sodass `--validate design-verify` gegen die Config-Entity läuft.
- [ ] Aus **diesem Worktree**: `debo-test run drupal-web data-model-block-plugin --validate design-verify`; `workflow summary --json` ans Ticket.
- [ ] `pnpm check` (typecheck → lint → test), falls Addon/TS berührt.

## 8. Artifacts

- Diese Spec: `.gaia/specs/DESIGNBOOK-36-spec.md` (committed).
- In coding editiert/gelöscht: `data-model/blueprints/block_plugin.md` (edit), `data-model/schemas.yml` (delete).
- In coding erstellt: `fixtures/drupal-web/cases/data-model-block-plugin.yaml` (+ ggf. Config-Entity-Render-/Referenz-Fixtures für die design-verify-Facette).

## 9. Standards / Domain skills binding

- **`designbook-skill-creator`** — verbindlich für jedes Editieren von blueprint/schemas.yml unter `.agents/skills/designbook-*/` (CLAUDE.md „Skills"). Coding lädt es **vor** dem Editieren.
- **`designbook-test`** — Vehikel für den funktionalen Nachweis (`debo-test run …` aus dem Worktree).
- Kein `CONVENTIONS.md` im Repo-Root — Bindung ergibt sich aus `CLAUDE.md` (Breaking Changes: keine Migrations-/Kompat-Shims; `pnpm check` vor Commit).
