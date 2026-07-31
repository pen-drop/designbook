# DESIGNBOOK-33 — Spec & Implementation Plan

**Ticket:** `designbook-gaia`: Step-Skills laden das passende designbook-Sub-Skill statt `debo <workflow>` aufzurufen
**Workflow:** `gaia_chore` · **Sub-work:** `work:docs` · **Task-Art:** `skill-authoring` (GAIA-Workflow-Step-Prosa)
**Runtime surface:** **none** — reine Skill-Instruktions-Prosa. `scenario_required = false`, kein DDEV/Browser/PHPUnit/Playwright. Verifikation ist **doc-strukturell** (grep + Frontmatter-Parse + Skill-Load) plus **Contract-Prüfung gegen `@gaia/workflow-step`** (nicht gegen `designbook-skill-creator` — `designbook-gaia` liegt laut `CLAUDE.md` außerhalb dieses Guardrails).

---

## 1. Problem

Die beiden GAIA-Step-Skills unter `.agents/skills/designbook-gaia/skills/` rufen Designbook-Arbeit
als **`debo <workflow>`-Kommando** auf (über den `debo`-Index). Seit der Umstellung auf per-workflow
nested sub-skills (DESIGNBOOK-25) ist jeder Workflow ein **eigenständig adressierbares Sub-Skill**
(`name` = Workflow-ID). Der `debo`-Index sagt es selbst (`.agents/skills/designbook/SKILL.md`,
§ Architecture):

> Each sub-skill is independently addressable (its `name` = the workflow ID) … **To run a workflow,
> load its sub-skill** (e.g. `skills/tokens/SKILL.md`) and follow it — it loads the engine and
> starts `_debo workflow create --workflow <id>` itself.

Die Step-Skills sollen daher das **Sub-Skill laden**, nicht den Index-Aufruf `debo <workflow>` fahren.

**Kein neues Verhalten.** Plan → Build → Validate, RED-/GREEN-Gates, Measurement-Recording,
Transitions, Outtake bleiben unverändert. Es ändert sich ausschließlich die **Aufrufform**. Der
`debo`-Index bleibt bestehen (Auto-Dispatch-Einstieg für Nutzer) — nur die Step-Skills hören auf,
über ihn zu gehen.

**Ist-Zustand (grep, autoritativ über beide Dateien):** je ~20 Vorkommen der alten Aufrufform —
`debo <design/config workflow> --plan`, `… --from-plan <plan>`, `debo design-verify`,
`debo config-verify`, plus bare `debo workflow`/`debo build`-Prosa und die drei Frontmatter-Felder
(`description`, `work_type_term.description`, `inputs.{spec,build,validate}.default` + deren
`description`).

## 2. Decision (design)

Beide Step-Skills **vollständig** von der `debo <workflow>`-Aufrufform auf **Sub-Skill-Laden**
umstellen — Frontmatter **und** Prosa aller vier Step-Abschnitte (`diagnose`, `spec`, `coding`,
`review`). Keine halbe Migration. **Nur** die zwei `SKILL.md`-Dateien werden angefasst; keine
Struktur, kein Flag, kein Helper-Aufruf, kein Measurement-Pfad ändert sich.

**Kanonische Sub-Skill-Form** (aus `designbook/SKILL.md` § Global Flags): `--plan` und
`--from-plan <name>` werden von **jedem Sub-Skill selbst aus `$ARGUMENTS` geparst`** — die Flags
bleiben unverändert; es ändert sich nur, *wie* der Workflow gestartet wird.

### Zwei Fälle

- **`validate` ist statisch** — der Skill-Name steht fest: `@designbook/design-verify` bzw.
  `@designbook/config-verify`.
- **`spec` und `build` sind variabel** — der Step-Skill kennt den Workflow nicht vorab. Die
  Anweisung lautet daher: den Workflow **wählen** und dann das **gleichnamige Sub-Skill laden**
  (Sub-Skill-Name = Workflow-ID) und es mit `--plan` bzw. `--from-plan <plan>` fahren.
  - **Design-Kandidaten (aufgeführt, AC4):** `@designbook/design-screen`, `@designbook/design-entity`,
    `@designbook/design-shell`, `@designbook/design-component`.
  - **Config-Kandidat:** `@designbook/sync-to` (der Config-Export-Workflow; deckt sich mit dem
    gespeicherten Term „export … via sync-to").

Alle genannten Sub-Skills existieren unter `.agents/skills/designbook/skills/<name>/SKILL.md`
(verifiziert: `design-screen`, `design-entity`, `design-shell`, `design-component`, `design-verify`,
`config-verify`, `sync-to` — alle OK) → AC10 erfüllbar.

## 3. Resolved open decisions

| # | Decision | Choice | Rationale | Rejected alternative |
|---|---|---|---|---|
| **D1 — offene Spec-Entscheidung: `work_type_term.description`-Drift** | Richtung der Auflösung | **Frontmatter an den gespeicherten `gaia_term` angleichen** (Term **nicht** ändern) | Der gespeicherte Term ist die von `@gaia/qualify-ticket` als Klassifikationsregel gelesene **Quelle der Wahrheit** und **bereits `debo`-frei**; die Frontmatter ist die gedriftete Kopie. Angleichen der Kopie an die Quelle hält die Klassifikationsregel stabil **und** die gesamte Änderung innerhalb `.agents/skills/designbook-gaia/` → AC12 erfüllt, **ohne** die „begründete `gaia_term`-Aktualisierung"-Ausnahme zu bemühen; minimaler, risikoärmster Diff. | **Term aktualisieren** → Backend-Schreiben auf `gaia_labels`, berührt die Klassifikationsregel selbst, bemüht die AC12-Ausnahme unnötig, höheres Risiko. |
| **D2** | Config-Fall: welche Sub-Skills als spec/build-Kandidaten | **`@designbook/sync-to`** benennen | Einziger Config-Export-Workflow; deckt sich mit dem gespeicherten Term. „Workflow wählen → gleichnamiges Sub-Skill" bleibt als Formulierung erhalten (zukunftssicher). | Generisch `<config workflow>` ohne konkreten Namen — verletzt AC4 (explizite Benennung). |
| **D3** | bare `debo workflow`/`debo build`-Prosa (Zeilen 29, 80, 81) | **Ebenfalls neutralisieren** („chosen design/config sub-skill" / „the design/config build") | AC5 + PM-Rahmen „keine halbe Migration, bei der die Prosa noch `debo …` sagt". Der Index wird namentlich **nicht mehr** referenziert (er bleibt bestehen, wird aber von den Step-Skills nicht mehr genannt). | Nur die spezifischen grep-Muster aus AC1 entfernen, bare `debo …`-Prosa stehen lassen — Mischform, AC5-Verstoß. |

### Gespeicherte Terme (Backend, bestätigt via `gaia dropsh search gaia_term --bundle gaia_labels`)

| Term | gespeicherter `gaia_term` (Ziel-Frontmatter nach D1) |
|---|---|
| `work:design-to-designbook` | `Sub-work: build or fix the Designbook/SDC component; acceptance in Storybook, validated via design-verify.` |
| `work:designbook-to-config` | `Sub-work: export Designbook display to Drupal config via sync-to; validate via config-verify.` |

## 4. Transformation — was sich pro Vorkommen ändert

Grep-getrieben auf **null** `debo …`-Aufrufform. Ersetzungsregeln (identisch für beide Dateien,
`design`/`config` entsprechend):

| heute | soll |
|---|---|
| `description:` (Frontmatter, Z. 3) | `debo --plan`/`--from-plan`/`debo design-verify` entfernen → „plan by loading the chosen design/config sub-skill … in `--plan` mode, build with `--from-plan <plan>`, validate with `@designbook/design-verify` bzw. `@designbook/config-verify`" |
| `work_type_term.description` (Z. 10) | **exakt** der gespeicherte Term aus §3 (debo-frei, identisch) |
| `inputs.spec.description` (Z. 13) | „(load the design/config sub-skill, run to the last interactive stage, writing a plan file)" |
| `inputs.spec.default = debo <… workflow> --plan` (Z. 14) | „load the chosen design/config sub-skill (Kandidatenliste) and run it with `--plan`" |
| `inputs.build.default = debo <… workflow> --from-plan <plan>` (Z. 17) | „load the chosen design/config sub-skill and run it with `--from-plan <plan>`" |
| `inputs.validate.default = debo design-verify` / `debo config-verify` (Z. 20) | `@designbook/design-verify` / `@designbook/config-verify` (statisch) |
| Prosa `debo <… workflow> --plan` | „load the chosen sub-skill and run it with `--plan`" |
| Prosa `debo <… workflow> --from-plan <plan>` | „load the chosen sub-skill and run it with `--from-plan <plan>`" |
| Prosa `debo design-verify` / `debo config-verify` | `@designbook/design-verify` / `@designbook/config-verify` |
| Prosa `the debo workflow` (Z. 29) | „the chosen design/config sub-skill" |
| Prosa `build directly with the debo workflow` (Z. 80) | „build directly with the chosen design/config sub-skill" |
| Prosa `The debo build is no exception` (Z. 81) | „The design/config build is no exception" |

**Flag-Semantik erhalten (AC8):** `--plan` und `--from-plan <plan>` erscheinen weiterhin als
Argumente, jeweils mit dem Hinweis, dass das Sub-Skill sie aus `$ARGUMENTS` parst (aus
`designbook/SKILL.md` § Global Flags).

**Unangetastet (Contract, AC9):** `when`-Tripel (`work_type` × `workflow` × `step`), die vier
`inputs`-Schlüssel + `provision: ddev init`, Shared Start (`@gaia/ensure-qualification` für
`spec`/`diagnose`/`coding`, **nicht** `review`), RED/GREEN-Gate, Measurement-Recording vor der
Transition (`design_verify`/`config_verify`, Definitions-Pfad `measurements/definitions/*.json`
bleibt **gaia-relativ**), `@gaia/run-outtake`, Bestätigung, Transitionsziel, `@gaia/publish-origin-*`,
STOP, „Multi-work single transition". Nur die Aufrufform in `spec`/`build`/`validate` und in der
Verdict-/Measurement-Prosa (`… ScoreReport`, „… verdict") wird auf die Sub-Skill-Form gebracht.

## 5. Risks

- **R1 — Restliche Mischform.** Ein übersehenes `debo …` lässt AC1/AC5 fehlschlagen.
  *Mitigation:* AC1-grep-Gate ist der harte GREEN-Check; zusätzlich bare `debo`-Wort-grep.
- **R2 — Frontmatter parst nicht mehr.** Ein `@designbook/…`-Wert mit `:` oder unquotierter Doppelpunkt
  bricht YAML. *Mitigation:* Frontmatter-Parse-Check in coding; `work_type_term.description` bleibt
  gequotet.
- **R3 — Term-Drift-Auflösung falsch herum.** Wenn statt Frontmatter der Term geändert würde, käme eine
  Backend-Schreiboperation außerhalb des Repos ins Spiel (AC12-Ausnahme). *Mitigation:* D1 fixiert die
  Richtung „Frontmatter → Term"; kein Backend-Schreiben.
- **R4 — Nicht existentes Artefakt referenziert.** *Mitigation:* AC10 — jeder genannte Sub-Skill-Name
  ist gegen `.agents/skills/designbook/skills/<name>/SKILL.md` verifiziert (bereits erfolgt, §2).

## 6. Acceptance ↔ evidence matrix (doc-strukturell, `scenario_required = false`)

| AC | What proves it |
|---|---|
| 1 — keine `debo <…>`-Aufrufform | `grep -nE 'debo <\|debo design-verify\|debo config-verify\|debo --plan\|debo --from-plan' <beide Dateien>` = 0 Treffer; ergänzend `grep -n 'debo '` = 0 |
| 2 — `inputs.validate.default` statisch | grep `default: @designbook/design-verify` bzw. `@designbook/config-verify` |
| 3 — `inputs.spec/build.default` = Sub-Skill-Laden | grep der beiden `default:`-Zeilen: „load … sub-skill … `--plan`/`--from-plan <plan>`", kein Index-Aufruf |
| 4 — Workflow-Auswahl explizit; Design-Kandidaten aufgeführt | grep der vier `@designbook/design-*` im Design-Skill; Config `@designbook/sync-to` |
| 5 — Prosa aller vier Step-Abschnitte konsistent, keine Mischform | grep je Abschnitt; `grep -c 'debo '` = 0 |
| 6 — `description:`-Frontmatter ohne `debo --plan`/`--from-plan` | grep Z. 3 beider Dateien |
| 7 — `work_type_term.description` debo-frei **und** = gespeicherter Term | diff Frontmatter-Wert vs. Backend-Term (§3) |
| 8 — Flag-Semantik erhalten | grep `--plan`, `--from-plan <plan>`, `$ARGUMENTS`-Hinweis vorhanden |
| 9 — `@gaia/workflow-step`-Contract unverändert | grep `when`/`inputs`/Step-Headings/`ensure-qualification`/`run-outtake`/`transition-ticket`/`Multi-work single transition`; `when`-Tripel diff-clean vs. HEAD |
| 10 — jeder Sub-Skill-Name existiert | `ls .agents/skills/designbook/skills/<name>/SKILL.md` je genanntem Namen |
| 11 — beide Skills laden fehlerfrei | Skill-Load-Check bzw. dokumentierter äquivalenter Nachweis (Frontmatter parst + Marketplace-Registrierung intakt) |
| 12 — Standing `work:docs` | grep + `git diff --name-only`: keine Datei außerhalb `.agents/skills/designbook-gaia/` (D1 vermeidet die `gaia_term`-Ausnahme); Frontmatter parst |

## 7. Implementation plan (checkbox — für den coding-Step)

- [ ] `debo-designbook-design/SKILL.md`: Frontmatter (Z. 3, 10, 13, 14, 17, 20) + Prosa (Z. 29, 31,
      48, 53, 65, 68, 78, 80, 81, 87, 89, 90, 96, 110, 113, 115) auf Sub-Skill-Form (§4); Design-Kandidaten
      aufführen; `work_type_term.description` = gespeicherter Term (D1/§3).
- [ ] `debo-config-sync/SKILL.md`: Frontmatter (Z. 3, 10, 13, 14, 17, 20) + Prosa (alle `debo …`-Zeilen
      per grep) auf Sub-Skill-Form (§4); Config-Kandidat `@designbook/sync-to`; `work_type_term.description`
      = gespeicherter Term (D1/§3).
- [ ] GREEN-grep-Gate: `grep -nE 'debo <|debo design-verify|debo config-verify|debo --plan|debo --from-plan'`
      **und** `grep -n 'debo '` über beide Dateien = 0.
- [ ] Frontmatter-Parse-Check beider Dateien; `when`-Tripel + `inputs`-Struktur diff-clean vs. HEAD.
- [ ] Skill-Load-Nachweis (AC11) + `git diff --name-only` bestätigt: nur die zwei Dateien geändert (AC12).

## 8. Artifacts

- Diese Spec: `.gaia/specs/DESIGNBOOK-33-spec.md` (committed).
- In coding geändert: `.agents/skills/designbook-gaia/skills/debo-designbook-design/SKILL.md`,
  `.agents/skills/designbook-gaia/skills/debo-config-sync/SKILL.md`. **Sonst nichts** (kein Backend-Term,
  kein Helper, kein Measurement-Pfad).
