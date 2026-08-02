# DESIGNBOOK-37 — Spec: Reference-Screenshots im `spec` und Preview-Links nach dem `coding`

**Task-Art:** skill-authoring (`work:docs` — Skill-Instruktions-/Task-Prosa) · **Sub-work:** `work:docs`
**Ziel-State nach spec:** `coding`
**Scenario:** none — reine Instruktions-Prosa (Task + Step-Skills), kein Runtime-/UI-Surface
(`scenario_required: false`). Gate ist doc-strukturell: Lesen der geänderten `.md`
(extract-reference-Task + beide `SKILL.md`), `git diff` gegen den Ausgangsstand (Kriterium 10) und
`@gaia/workflow-step`-Contract-Abgleich (Kriterium 11). Kein `debo-test`, keine `.feature`.

> **Author-approved Scope-Amendment (spec gate).** Ursprünglich schrieb das Ticket vor, die zwei
> Screenshots **im `designbook-gaia`-Spec-Schritt** per `_debo capture screenshot` frisch zu
> erzeugen, und schloss Änderungen an `@designbook/design-*` aus. Auf Autor-Wunsch (cw) wird die
> Screenshot-**Erzeugung** in die **`extract-reference`-Task** verlagert (die in der `reference`-Stage
> jedes Design-`--plan`-Laufs bereits läuft); die `designbook-gaia`-Spec-Schritte **verlinken** dann
> nur noch die von `extract-reference` in den `reference_folder` geschriebenen PNGs. Das
> „Nicht in diesem Ticket"-Carve-out für `@designbook/design-*` ist damit **für `extract-reference`
> aufgehoben** (nur diese eine Task). Kein Addon-Code — `_debo capture screenshot` existiert.

## Problem

Die beiden GAIA-Step-Skills unter `.agents/skills/designbook-gaia/skills/` führen durch
`spec` → `coding` → `review`, ohne dass im Ticket je **sichtbar** wird, wogegen designt wurde und
was herauskam:

- **`spec` zeigt keine Referenz** — weder `reference_folder`, `reference_url` noch ein Screenshot.
- **`coding` verlinkt bedingungslos** — `debo-designbook-design` führt den Storybook-Link „mandatory"
  ohne Änderungsbezug und **keinen** Drupal-Preview-Link; `debo-config-sync` führt Storybook- **und**
  Drupal-Link „both mandatory", ebenfalls bedingungslos.

Zusätzlich (Amendment): eine Reference-**PNG** existiert zum `spec`-Zeitpunkt gar nicht — die
`reference`-Stage ruft `extract-reference` → `_debo extract`, das **nur** `extract.json`/`captured.json`
schreibt und Assets lädt; die eigentlichen Baseline-PNGs nimmt erst `ensure-baseline` (eine
**`design-verify`**-Stage) auf. Damit die `designbook-gaia`-Spec-Schritte etwas zum Verlinken haben,
muss `extract-reference` beim Extrahieren **auch einen Overview-Screenshot je Viewport** aufnehmen.

Ziel: `extract-reference` erzeugt mobile+desktop-Overview-Screenshots; beide `spec`-Schritte listen
und verlinken die Referenz; `coding` führt Storybook-/Drupal-Preview-Link **bedingt**. Rein additive
Sichtbarkeit — **keine** Entscheidung, kein Gate, kein Measurement, keine Transition ändert sich.

## Bindende Standards / Domain-Skills

- **Keine `CONVENTIONS.md`** im Repo-Root (Lücke — hier vermerkt). Ersatzweise binden
  `CLAUDE.md`/`AGENTS.md` und der `@gaia/workflow-step`-Contract.
- **`extract-reference` ist eine debo-Task** unter `.agents/skills/designbook/design/tasks/` →
  vor ihrer Bearbeitung im `coding` **`designbook-skill-creator` laden** (Pflicht laut `CLAUDE.md`;
  `rules/task-files.md` + `rules/common-rules.md`). WHAT-nicht-HOW, keine eigenen Params, Schema als
  SSOT.
- **`@gaia/workflow-step`** bindet die zwei `SKILL.md`: `when`-Triple unveränderlich; jeder
  `inputs`-Wert mit `description` **und** `default` (effective = override ?? default);
  Prosa-pro-Step inkl. Routing; Handoff-Bodies `gaia_rich`-Markdown. `designbook-gaia` liegt
  außerhalb des `designbook-skill-creator`-Guardrails.
- Kanonischer Editierort `.agents/skills/…` (nie `.claude/skills/`, Symlink). Prosa bleibt
  **Englisch**.

## Wiederverwendete Bausteine (kein neuer Addon-Code)

| Baustein | Ort | Nutzung hier |
|---|---|---|
| `_debo capture screenshot --url <u> --out <png> --width <px> [--full-page]` (eine PNG/Viewport, mandatierter Settle) | `packages/storybook-addon-designbook/src/cli/inspect-register.ts:73–115` | Overview-Capture in `extract-reference` |
| Breakpoint→Pixelbreite (`sm` 640/`md` 768/`lg` 1024/`xl` 1280; Token-Werte gewinnen; aufsteigend) | `packages/storybook-addon-designbook/src/inspect/breakpoint-widths.ts` | liefert die `--width`-Pixel für mobile/desktop |
| `extract-reference` (`reference`-Stage, läuft im `--plan` vor dem interaktiven `intake`) | `design/tasks/extract-reference.md` | **Erweiterungspunkt** — nimmt die Overview-Screenshots auf |
| `reference_folder` (committet: `extract.json`, `meta.yml`, Baseline-PNGs, `assets/`) | `design/schemas.yml#/ReferenceFolder` | Ablage der Overview-PNGs (committet → persistente Links) |
| `gaia_ticket.links[]` als `{uri,title,options.gaia.kind}`, über resolved links von `@gaia/transition-ticket` | GAIA-Kern | trägt Referenz-, Storybook-, Drupal-Links ins Ticket |

## Entscheidungen

### D1 — Viewport-Mapping: schmalster (mobile) + breitester (desktop) definierter Breakpoint

„mobile" = **schmalster**, „desktop" = **breitester** definierter Breakpoint; Pixelbreite über die
bestehende Breakpoint→Pixel-Auflösung (`breakpoint-widths.ts`: Token-Werte aus
`design-system/design-tokens.yml` gewinnen vor Tailwind-Defaults; aufsteigend → erster = mobile,
letzter = desktop). Jede Breite → `_debo capture screenshot --width <px>`.
*Verworfen:* feste 375/1440 px (ignoriert Tokens); hartes Paar `sm`/`xl` (bricht bei fehlendem
Breakpoint). Diese Auflösung lebt jetzt **in `extract-reference`**.

### D2 — Ablage: Overview-PNGs im `reference_folder` (committet, persistent)

`extract-reference` schreibt die zwei Overview-PNGs in den `reference_folder` — dieselbe committete
Ablage wie `extract.json`/`meta.yml`/Baseline-PNGs. Namensschema `overview--<viewport>--<bp>.png`
(z. B. `overview--mobile--sm.png`, `overview--desktop--xl.png`). **Committet** → die Ticket-Links
nutzen **committete Repo-Pfade** und bleiben nach dem Worktree-Cleanup erreichbar (löst die
ursprünglich in Kauf genommene Tote-Link-Problematik). Reuse-Verhalten: existiert die PNG bereits
neben `meta.yml` und ist `--refresh-reference` nicht gesetzt, wird sie eingefroren wiederverwendet
(bestehende „stable baseline"-Regel).

### D3 — Drupal-Preview im Design-Skill: bedingt-symmetrisch, sonst `not_applicable`

In **beiden** Skills identisch: Drupal-Preview-Link nur bei **geänderter Drupal-Config**, sonst
explizit `not_applicable` mit Ein-Zeilen-Begründung (konditioniert, nicht hart entfernt). Eine
`work:design-to-designbook`-Sub-Work erzeugt normal keinen Drupal-Render → in
`debo-designbook-design` im Normalfall `not_applicable`; der gemischte Fall bleibt sichtbar.
*Verworfen:* im Design-Skill ganz weglassen (macht gemischten Fall unsichtbar, Skills asymmetrisch).

### D4 — `options.gaia.kind`-Werte

| Link | `kind` | Step |
|---|---|---|
| Overview-Screenshots + `reference_folder`-Bilder/Assets | `reference` | spec |
| Storybook-Preview | `storybook` | coding |
| Drupal-Preview | `drupal-preview` | coding |

`kind` ist Freitext in `options.gaia.kind` (wie `@gaia/run-outtake` `kind = MR`). Alle neuen Links
tragen zusätzlich einen selbstbeschreibenden `title` (Fallback bei reinem `title`-Rendering, R1).

### D5 — Leere Referenz / `config-sync` ohne `reference_url`

- `reference_url` leer bzw. `reference_folder` leer: `extract-reference` schreibt keine Overview-PNGs
  (bestehende „No reference"-Regel: `reference_dir: ""`, leere `reference_screenshots`, keine
  Dateien); der `designbook-gaia`-Spec-Schritt benennt die Referenz-Oberfläche explizit als
  `not_required`.
- **`debo-config-sync` hat gar keine `reference_url`/`reference`-Stage** (`sync-to` arbeitet aus dem
  Data-Model). Sein Spec-Schritt trägt die **gleiche Instruktion** (Symmetrie/AC-Prosa), löst zur
  Laufzeit aber **immer** nach `not_required` auf — ehrlich benannt.

### D6 — Deklarationsform

- **`designbook-gaia`-Seite:** ein neuer überschreibbarer `inputs`-Wert **`reference_capture`** je
  Skill (`description` + `default`), per `WORKFLOW.md` überschreibbar. Der `default` kodiert: nach dem
  Design-`--plan`-Lauf die vom `reference_folder` gelisteten Overview-Screenshots (+ Assets) als
  `kind: reference`-Links im `run-outtake` **und** an `transition-ticket` übergeben; bei fehlender
  Referenz `not_required`. → AC-9.
- **`extract-reference`-Seite:** **kein** neuer Param/Input — die Overview-Capture ist Kern-Verhalten
  der Task (WHAT), gesteuert über die bestehenden `breakpoints`/`elements`-Params. Bewusst kein
  Task-Param (Task-Files tragen keine eigenen Params außerhalb ihres `params:`-Blocks; die Breite
  kommt aus der bestehenden Breakpoint-Auflösung).
- **`coding`-Kopplung** (Storybook↔geänderte Artefakte, Drupal↔geänderte Config) = **feste
  Prosa-Regel** ohne `inputs`-Wert — bewusst dokumentiert (harte Sichtbarkeitsregel, kein Kommando).

### D7 — `extract-reference`-Capture-Umfang: zwei Full-Page-Overviews, additiv zu `ensure-baseline`

`extract-reference` nimmt **genau zwei** Full-Page-Overview-Screenshots auf (mobile+desktop, D1),
zusätzlich zu seinen bestehenden Outputs. Das **dupliziert `ensure-baseline` nicht**: jenes captured
die element×state×breakpoint-**Vergleichs**-Matrix in `design-verify`; die Overviews sind eine
menschenlesbare Gesamtansicht. Existiert im Matrix ein `full`/leer-Selector-Element auf diesen
Breakpoints, **dürfen** die Overview-PNGs dessen Baseline sein (von `ensure-baseline` eingefroren
wiederverwendet) — sonst stehen sie eigenständig. Details klärt `coding`.

## Zu ändernde Dateien

### `.agents/skills/designbook/design/tasks/extract-reference.md` (NEU im Scope)

- Nach dem `_debo extract`-Lauf **zwei Overview-Screenshots** der Reference-URL aufnehmen
  (`_debo capture screenshot`, mobile+desktop je D1, Full-Page), in den `reference_folder` schreiben
  (D2-Namensschema), in `reference_screenshots`/`result` sichtbar machen. „No reference"- und
  „stable baseline"-Regeln bleiben. **`designbook-skill-creator` vor dem Edit laden.**

### `.agents/skills/designbook-gaia/skills/debo-designbook-design/SKILL.md`

1. **Frontmatter `inputs`:** `reference_capture` neu (D6).
2. **`## spec`:** neuer Schritt zwischen Plan-Publish (3) und `run-outtake` (4): die vom
   Design-`--plan`-Lauf in den `reference_folder` geschriebenen Overview-Screenshots (+ Assets)
   listen, im `run-outtake` zeigen **und** an `transition-ticket` (spec→coding, Schritt 6) als
   `kind: reference`-Links übergeben. `not_required` je D5.
3. **`## coding` 5 (`run-outtake`) + 7 (`transition-ticket`):** Storybook-Link **bedingt** an
   geänderte Designbook-Artefakte (Begründung bei Wegfall); **neu** Drupal-Preview-Link bedingt an
   geänderte Config (sonst `not_applicable`, D3). Beide in `run-outtake` **und** transition-links.
4. **Unverändert:** `when`, Schritt 4 (`design_verify`-Measurement), Gates, Transition-Ziele,
   Merge-Gate, `## diagnose`, `## review`, `## Multi-work`.

### `.agents/skills/designbook-gaia/skills/debo-config-sync/SKILL.md`

1. **Frontmatter `inputs`:** identischer `reference_capture`-Wert.
2. **`## spec`:** identischer Reference-Schritt (löst mangels `reference_url` immer nach
   `not_required` auf, D5; spec→coding ist Schritt 6).
3. **`## coding` 5 + 7:** Storybook- **und** Drupal-Preview-Link von „both mandatory" auf **bedingt**
   (Storybook↔geänderte Artefakte, Drupal↔geänderte Config; Begründung bei Wegfall). Beide in
   `run-outtake` **und** transition-links.
4. **Unverändert:** `when`, Schritt 4 (`config_verify`-Measurement), Gates, Transition-Ziele,
   Merge-Gate, `## diagnose`, `## review`, `## Multi-work`.

Der `designbook-gaia`-Index (`SKILL.md`) und die gaia-Helper bleiben **unberührt**.

## Risiken

| # | Risiko | Schwere | Gegenmaßnahme |
|---|---|---|---|
| R1 | `@gaia/transition-ticket`-Prosa: „links are `{uri,title}` only" → `options.gaia.kind` überlebt evtl. nicht; Helper out-of-scope. | MITTEL | `kind` per `options.gaia.kind` (DESIGNBOOK-33-Präzedenz) **und** im `title` kodieren; in review per `links[]`-Inspektion prüfen. |
| R2 | `extract-reference`-Capture überschneidet/regressiert `ensure-baseline` (Doppel-Capture, Baseline-Freeze). | MITTEL | Overviews additiv + wiederverwendbar als `full`-Baseline (D7); `design-verify`-Case in `coding` als Sanity-Check laufen. |
| R3 | AC-2/AC-3 nennen `_debo capture screenshot` **im gaia-Spec-Schritt**; die Erzeugung wandert nach `extract-reference`. | MITTEL | Author-approved Amendment (spec gate): AC-2/3 gelten auf der `extract-reference`-Ebene (nennt `_debo capture screenshot`) + der gaia-Link-Ebene; in der Test-Matrix dokumentiert. Ticket-Text „Nicht in diesem Ticket" ist überstimmt — bei Bedarf Beschreibung nachziehen. |
| R4 | Task-Edit ohne `designbook-skill-creator` → invalide Task (HOW-in-WHAT, eigener Param). | MITTEL | `coding` lädt `designbook-skill-creator` vor dem `extract-reference`-Edit (Pflicht). |
| R5 | Versehentliche `when`/Gate/Measurement-Änderung. | HOCH | `git diff` in review (AC-10); nichts davon wird angefasst. |

## Verifikation (AC → doc-struktureller Check)

- **AC-1** → `## spec` beider `SKILL.md`: `reference_folder`-Overviews listen + im `run-outtake` zeigen.
- **AC-2/AC-3** (amended, R3) → `extract-reference.md`: zwei Overview-Screenshots (mobile+desktop, D1)
  via `_debo capture screenshot`; die gaia-Spec-Schritte verlinken sie.
- **AC-4** → `not_required`-Regel bei fehlender Referenz in beiden gaia-`## spec` (config-sync immer).
- **AC-5** → `reference_capture`-`default` + `## spec`: Referenz als `kind: reference`-Links an
  `@gaia/transition-ticket`.
- **AC-6/AC-7** → `## coding` beider: Storybook↔geänderte Artefakte (Begründungspflicht),
  Drupal↔geänderte Config (Design-Skill: Regel D3 explizit).
- **AC-8** → beide Links in `run-outtake` **und** transition-links.
- **AC-9** → `reference_capture` mit `description`+`default`; coding-Kopplung als dokumentierter
  `inputs`-Verzicht; `extract-reference` bewusst param-frei.
- **AC-10** → `git diff`: `when`, Gates, `design_verify`/`config_verify`, Transition-Ziele,
  Merge-Gate unberührt.
- **AC-11** → `@gaia/workflow-step`-Abgleich: `when` unverändert, `inputs` description+default,
  Prosa-pro-Step inkl. Routing intakt.
