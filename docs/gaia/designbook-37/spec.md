# DESIGNBOOK-37 — Spec: Reference-Screenshots im `spec` und Preview-Links nach dem `coding`

**Task-Art:** skill-authoring (`work:docs` — Instruktions-/Task-Prosa) · **Sub-work:** `work:docs`
**Ziel-State nach spec:** `coding`
**Scenario:** none — reine Instruktions-Prosa (zwei debo-Tasks + zwei GAIA-Step-`SKILL.md`), kein
Runtime-/UI-Surface (`scenario_required: false`). Gate doc-strukturell: Lesen der geänderten `.md`,
`git diff` gegen den Ausgangsstand (Kriterium 10), `@gaia/workflow-step`-Contract-Abgleich
(Kriterium 11), plus ein Runtime-**Sanity**-Lauf (`design-verify`) als R2-Evidenz. Kein `debo-test`,
keine `.feature`.

**Design-Methode:** über `superpowers:brainstorming` erarbeitet und vom Autor (cw) am spec gate
freigegeben; der Plan (`plan.md`) über `superpowers:writing-plans`.

> **Author-approved Scope-Amendment (spec gate).** Ursprünglich: die zwei Screenshots **im
> `designbook-gaia`-Spec-Schritt** frisch erzeugen; `@designbook/design-*` ausgeschlossen. **Neu:**
> die Capture-Verantwortung wandert in die Design-Familie — `extract-reference` **erzeugt** die
> Referenz-Screenshots, `ensure-baseline` **prüft** nur noch (Capture nur als Fallback); die
> `designbook-gaia`-Spec-Schritte **verlinken**. Das „Nicht in diesem Ticket"-Carve-out für
> `@designbook/design-*` ist für `extract-reference` **und** `ensure-baseline` aufgehoben. Kein
> Addon-Code — `_debo capture matrix` / `_debo capture screenshot` existieren.

## Problem

Die beiden GAIA-Step-Skills unter `.agents/skills/designbook-gaia/skills/` führen durch
`spec` → `coding` → `review`, ohne dass im Ticket je **sichtbar** wird, wogegen designt wurde und
was herauskam:

- **`spec` zeigt keine Referenz** — weder `reference_folder`, `reference_url` noch ein Screenshot.
- **`coding` verlinkt bedingungslos** — `debo-designbook-design` führt den Storybook-Link „mandatory"
  ohne Änderungsbezug und **keinen** Drupal-Link; `debo-config-sync` führt beide „both mandatory".

Ursache-Kette (verifiziert): Reference-**PNGs** existieren zum `spec`-Zeitpunkt gar nicht. Die
`reference`-Stage ruft `extract-reference` → `_debo extract`, das **nur** `extract.json`/`captured.json`
schreibt + Assets lädt + die element×state×breakpoint-Matrix als **Metadaten** materialisiert. Die
eigentlichen Baseline-PNGs nimmt erst `ensure-baseline` (`design-verify`-Stage) auf. Verschiebt man
den Capture nach `extract-reference`, existieren die PNGs schon nach dem `--plan`-Lauf — die
Step-Skills haben etwas zu verlinken, und `ensure-baseline` muss nur noch prüfen.

## Bindende Standards / Domain-Skills

- **Keine `CONVENTIONS.md`** im Repo-Root (Lücke — hier vermerkt). Ersatzweise binden
  `CLAUDE.md`/`AGENTS.md` und der `@gaia/workflow-step`-Contract.
- **`extract-reference` + `ensure-baseline` sind debo-Tasks** unter
  `.agents/skills/designbook/design/tasks/` → vor Bearbeitung im `coding` **`designbook-skill-creator`
  laden** (`rules/task-files.md` + `rules/common-rules.md`): WHAT-nicht-HOW, keine eigenen Params
  außerhalb des `params:`-Blocks, Schema (`design/schemas.yml`) als SSOT.
- **`@gaia/workflow-step`** bindet die zwei `SKILL.md`: `when`-Triple unveränderlich; jeder
  `inputs`-Wert mit `description` **und** `default` (effective = override ?? default);
  Prosa-pro-Step inkl. Routing; Handoff-Bodies `gaia_rich`-Markdown. `designbook-gaia` liegt
  außerhalb des `designbook-skill-creator`-Guardrails.
- Kanonischer Editierort `.agents/skills/…` (nie `.claude/skills/`, Symlink). Prosa **Englisch**.

## Wiederverwendete Bausteine (kein neuer Addon-Code)

| Baustein | Ort | Nutzung |
|---|---|---|
| `_debo capture matrix <meta.yml> --url <u> --out <dir>` (Matrix aus `meta.yml`, Reuse frozen, ein Browser-Pass) | `capture-matrix.ts` / `inspect-register.ts:37–70` | Reference-Capture in `extract-reference` |
| `_debo capture screenshot --url <u> --out <png> --width <px> [--full-page]` (eine PNG/Viewport) | `inspect-register.ts:73–115` | garantierter mobile/desktop-Overview |
| Breakpoint→Pixelbreite (Token-Werte gewinnen; aufsteigend) | `inspect/breakpoint-widths.ts` | mobile = schmalster, desktop = breitester Breakpoint |
| `reference_folder` (committet: `extract.json`, `meta.yml`, Baseline-PNGs, `assets/`) | `design/schemas.yml#/ReferenceFolder` | Ablage der Reference-PNGs (persistente Links) |
| `gaia_ticket.links[]` als `{uri,title,options.gaia.kind}` via resolved links von `@gaia/transition-ticket` | GAIA-Kern | trägt Referenz-, Storybook-, Drupal-Links ins Ticket |

## Entscheidungen

### D1 — Viewport-Mapping: schmalster (mobile) + breitester (desktop) definierter Breakpoint

Für die **Ticket-Link-Oberfläche** garantiert `extract-reference` einen Full-Page-Overview an mobile
= schmalstem, desktop = breitestem **definierten** Breakpoint; Pixel über die bestehende
Breakpoint→Pixel-Auflösung (`breakpoint-widths.ts`: Token-Werte aus `design-system/design-tokens.yml`
gewinnen vor Tailwind-Defaults; aufsteigend → erster = mobile, letzter = desktop).
*Verworfen:* feste 375/1440 px (ignoriert Tokens); hartes Paar `sm`/`xl` (bricht bei fehlendem
Breakpoint).

### D2 — Ablage: Reference-PNGs im `reference_folder` (committet, persistent)

Alle Reference-PNGs (Baseline-Matrix + die zwei Overviews) liegen im `reference_folder` — dieselbe
committete Ablage wie `extract.json`/`meta.yml`. Matrix-PNGs behalten das bestehende Namensschema
`<breakpoint>--<element>--<state>.png` (damit `compare` unberührt bleibt); die Overviews
`overview--<viewport>--<bp>.png`. **Committet** → Ticket-Links nutzen committete Repo-Pfade und
bleiben nach dem Worktree-Cleanup erreichbar. Reuse über die bestehende „stable baseline"-Regel.

### D3 — Capture-Verantwortung: `extract-reference` erzeugt, `ensure-baseline` prüft (+ Fallback)

- **`extract-reference`** nimmt nach `_debo extract` die Reference-Baseline-Matrix an den
  bereitgestellten Breakpoints auf (`_debo capture matrix meta.yml`) **und** garantiert die zwei
  Overviews (D1). `--refresh-reference` (Neu-Capture) und die „No reference"-Regel wandern hierher.
- **`ensure-baseline`** wird auf **Prüfen** reduziert: liest `meta.yml`, verifiziert dass jede
  geplante PNG vorliegt (image-Validator). **Fehlt** eine PNG (z. B. `design-verify` standalone ohne
  vorherigen `extract-reference`-Lauf), capturet es sie **doch** (heutiges `_debo capture matrix` als
  **Fallback**) — so bleibt `design-verify` selbst-heilend. Reihenfolge: prüfen zuerst, capturen nur
  bei Lücke.
- **`compare`** unberührt (liest PNGs per festem Pfad); **`config-verify`/`ensure-baseline-live`**
  unberührt (separater Live-Storybook-Reference-Pfad).

### D4 — Drupal-Preview im Design-Skill: bedingt-symmetrisch, sonst `not_applicable`

In **beiden** Skills identisch: Drupal-Preview-Link nur bei **geänderter Drupal-Config**, sonst
explizit `not_applicable` mit Ein-Zeilen-Begründung (konditioniert, nicht hart entfernt). Eine
`work:design-to-designbook`-Sub-Work erzeugt normal keinen Drupal-Render → in
`debo-designbook-design` im Normalfall `not_applicable`; der gemischte Fall bleibt sichtbar.
*Verworfen:* im Design-Skill ganz weglassen (macht gemischten Fall unsichtbar, Skills asymmetrisch).

### D5 — `options.gaia.kind`-Werte

| Link | `kind` | Step |
|---|---|---|
| Overview-Screenshots + `reference_folder`-Assets | `reference` | spec |
| Storybook-Preview | `storybook` | coding |
| Drupal-Preview | `drupal-preview` | coding |

`kind` ist Freitext in `options.gaia.kind` (wie `@gaia/run-outtake` `kind = MR`). Alle neuen Links
tragen zusätzlich einen selbstbeschreibenden `title` (Fallback bei reinem `title`-Rendering, R1).

### D6 — Leere Referenz / `config-sync` ohne `reference_url`

- Leere Referenz: `extract-reference` schreibt keine PNGs (bestehende „No reference"-Regel); der
  `designbook-gaia`-Spec-Schritt benennt die Referenz-Oberfläche explizit `not_required`.
- **`debo-config-sync` hat keine `reference_url`/`reference`-Stage** (`sync-to` arbeitet aus dem
  Data-Model). Sein Spec-Schritt trägt die **gleiche Instruktion** (Symmetrie/AC-Prosa), löst zur
  Laufzeit aber **immer** nach `not_required` auf — ehrlich benannt.

### D7 — Deklarationsform

- **`designbook-gaia`-Seite:** ein neuer überschreibbarer `inputs`-Wert **`reference_capture`** je
  Skill (`description` + `default`), per `WORKFLOW.md` überschreibbar. Der `default` kodiert: nach dem
  Design-`--plan`-Lauf die vom `reference_folder` gelisteten Overview-Screenshots (+ Assets) als
  `kind: reference`-Links im `run-outtake` **und** an `transition-ticket` übergeben; bei fehlender
  Referenz `not_required`. → AC-9.
- **`extract-reference`/`ensure-baseline`-Seite:** **kein** neuer Param/Input — die Capture/Check-
  Änderung ist Kern-Verhalten (WHAT), gesteuert über die bestehenden `breakpoints`/`elements`-Params.
- **`coding`-Kopplung** (Storybook↔geänderte Artefakte, Drupal↔geänderte Config) = **feste
  Prosa-Regel** ohne `inputs`-Wert — bewusst dokumentiert (harte Sichtbarkeitsregel, kein Kommando).

## Zu ändernde Dateien

1. **`design/tasks/extract-reference.md`** — Capture rein: Baseline-Matrix (`_debo capture matrix`) +
   garantierte Overviews (D1/D2); `--refresh-reference` + „No reference" hierher; `result`
   (`reference_screenshots`/Overview) sichtbar machen.
2. **`design/tasks/ensure-baseline.md`** — auf Prüfen reduzieren (image-Validator); Capture nur als
   Fallback bei fehlender PNG (D3). Result-Schema-Pfad unverändert (compare-Kompatibilität).
3. **`designbook-gaia/skills/debo-designbook-design/SKILL.md`** — `inputs.reference_capture`;
   `## spec` Reference-Link-Schritt (run-outtake **und** transition-ticket); `## coding` 5+7
   Storybook **bedingt** + Drupal-Preview **neu bedingt** (D4).
4. **`designbook-gaia/skills/debo-config-sync/SKILL.md`** — `inputs.reference_capture`; `## spec`
   Reference-Schritt (immer `not_required`, D6); `## coding` 5+7 Storybook+Drupal „both mandatory"
   → **bedingt**.

**Unverändert:** `when`-Triples, `design_verify`/`config_verify`-Measurement (Schritt 4),
RED/GREEN-Gates, Transition-Ziele, Merge-Gate, `## diagnose`/`## review`/`## Multi-work` beider
`SKILL.md`; `compare`, `capture`, `ensure-baseline-live`; `designbook-gaia`-Index; gaia-Helper.

## Risiken

| # | Risiko | Schwere | Gegenmaßnahme |
|---|---|---|---|
| R1 | `@gaia/transition-ticket`: „links {uri,title} only" → `options.gaia.kind` überlebt evtl. nicht (Helper out-of-scope). | MITTEL | `kind` per `options.gaia.kind` **und** im `title` kodieren; review prüft `links[]`. |
| R2 | Capture-Verschiebung + `ensure-baseline`-Reduktion regressiert `design-verify` (Doppel-Capture, Freeze, fehlende Baseline). | HOCH | Fallback erhält Selbst-Heilung (D3); Namensschema unverändert → `compare` intakt; `design-verify`-Case in coding als Sanity-Lauf (Evidenz). |
| R3 | AC-2/3 nennen `_debo capture screenshot` im gaia-Schritt; Erzeugung wandert in die Design-Tasks. | MITTEL | Author-approved Amendment; AC-2/3 gelten auf `extract-reference`- (nennt `_debo capture …`) + gaia-Link-Ebene; in Test-Matrix dokumentiert. Ticket-Text „Nicht in diesem Ticket" überstimmt — bei Bedarf nachziehen. |
| R4 | Task-Edit ohne `designbook-skill-creator` → invalide Task. | MITTEL | coding lädt `designbook-skill-creator` vor jedem Task-Edit. |
| R5 | Versehentliche `when`/Gate/Measurement-Änderung. | HOCH | `git diff` in review (AC-10). |

## Verifikation (AC → doc-struktureller Check)

- **AC-1** → `## spec` beider `SKILL.md`: `reference_folder`-Overviews listen + im `run-outtake` zeigen.
- **AC-2/AC-3** (amended, R3) → `extract-reference.md`: Overviews (mobile+desktop, D1) via
  `_debo capture …`; gaia-Spec-Schritte verlinken.
- **AC-4** → `not_required`-Regel bei fehlender Referenz in beiden gaia-`## spec` (config-sync immer).
- **AC-5** → `reference_capture`-`default` + `## spec`: Referenz als `kind: reference`-Links an
  `@gaia/transition-ticket`.
- **AC-6/AC-7** → `## coding` beider: Storybook↔geänderte Artefakte (Begründungspflicht),
  Drupal↔geänderte Config (Design-Skill Regel D4 explizit).
- **AC-8** → beide Links in `run-outtake` **und** transition-links.
- **AC-9** → `reference_capture` mit `description`+`default`; coding-Kopplung als dokumentierter
  `inputs`-Verzicht; Tasks param-frei.
- **AC-10** → `git diff`: `when`, Gates, Measurements, Transition-Ziele, Merge-Gate unberührt.
- **AC-11** → `@gaia/workflow-step`-Abgleich: `when` unverändert, `inputs` description+default,
  Prosa-pro-Step inkl. Routing intakt.
