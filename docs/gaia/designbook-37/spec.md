# DESIGNBOOK-37 — Spec: Reference-Screenshots im `spec` und Preview-Links nach dem `coding`

**Task-Art:** skill-authoring (GAIA-Workflow-Step-Prosa) · **Sub-work:** `work:docs`
**Ziel-State nach spec:** `coding`
**Scenario:** none — reine Skill-Instruktions-Prosa, kein Runtime-/UI-Surface
(`scenario_required: false`). Gate ist doc-strukturell: Lesen beider `SKILL.md`
(Frontmatter + `## spec` + `## coding`), `git diff` gegen den Ausgangsstand (Kriterium 10) und
`@gaia/workflow-step`-Contract-Abgleich (Kriterium 11). Kein `debo-test`, keine `.feature`.

## Problem

Die beiden GAIA-Step-Skills unter `.agents/skills/designbook-gaia/skills/` führen durch
`spec` → `coding` → `review`, ohne dass im Ticket je **sichtbar** wird, wogegen designt wurde und
was herauskam:

- **`spec` zeigt keine Referenz** — weder in `debo-designbook-design` noch in `debo-config-sync`
  taucht `reference_folder`, `reference_url` oder ein Screenshot auf.
- **`coding` verlinkt bedingungslos** — `debo-designbook-design` führt den Storybook-Link „mandatory"
  ohne Bezug darauf, ob etwas geändert wurde, und **keinen** Drupal-Preview-Link;
  `debo-config-sync` führt Storybook- **und** Drupal-Link „both mandatory", ebenfalls
  bedingungslos.

Ziel: `spec` listet und verlinkt die Referenz (inkl. zweier frischer Viewport-Screenshots),
`coding` führt Storybook- und Drupal-Preview-Link **bedingt** statt bedingungslos. Rein additive
Sichtbarkeit — **keine** Entscheidung, kein Gate, kein Measurement, keine Transition ändert sich.

## Bindende Standards / Domain-Skills (an die diese Änderung gebunden ist)

- **Keine `CONVENTIONS.md`** im Repo-Root (Lücke — hier explizit vermerkt). Ersatzweise binden
  `CLAUDE.md`/`AGENTS.md` und der `@gaia/workflow-step`-Contract.
- **`@gaia/workflow-step`** ist der maßgebliche Contract: das `when`-Triple ist **unveränderlich**
  (Load-Time-Coverage/Collision-Validator), jeder `inputs`-Wert trägt `description` **und**
  `default` (effective = override ?? default), Prosa-pro-Step inkl. Routing, Handoff-Bodies sind
  Markdown im `gaia_rich`-Format.
- **`designbook-gaia` liegt außerhalb des `designbook-skill-creator`-Guardrails** (`CLAUDE.md`):
  es liefert **nur** GAIA-Workflow-Step-Prosa, keine debo-Task/Rule/Blueprint/Schema-Dateien →
  der skill-creator bindet **nicht**; der `@gaia/workflow-step`-Contract bindet.
- **Kanonischer Editierort** ist `.agents/skills/…`; `.claude/skills/` ist ein Symlink und wird
  **nicht** separat editiert (`CLAUDE.md`).
- **Dokumentationssprache:** beide `SKILL.md` sind in **Englisch** verfasst → neue Prosa bleibt
  Englisch, konsistent mit dem Bestand.

## Wiederverwendete Bausteine (kein neuer Addon-Code)

| Baustein | Ort | Nutzung hier |
|---|---|---|
| `_debo capture screenshot --url <u> --out <png> --width <px>` (eine PNG/Viewport, mandatierter Settle, kein `--selector` ⇒ Full-Page) | `packages/storybook-addon-designbook/src/cli/inspect-register.ts:73–115`, `.../capture-screenshot.ts` | erzeugt die zwei frischen Screenshots |
| Breakpoint→Pixelbreite (`sm` 640/`md` 768/`lg` 1024/`xl` 1280; Token-Werte aus `design-system/design-tokens.yml` gewinnen; aufsteigend sortiert) | `packages/storybook-addon-designbook/src/inspect/breakpoint-widths.ts` | liefert die konkreten `--width`-Pixel für mobile/desktop |
| `reference_url` / `reference_folder` (+ `extract-reference`) | `skills/design-screen/…`, `skills/design-verify/…`, `design/tasks/extract-reference.md` | Quelle der Referenzbilder + der Screenshot-URL |
| `gaia_ticket.links[]` als `{uri,title,options.gaia.kind}`, befüllt über die resolved links von `@gaia/transition-ticket` | GAIA-Kern | trägt Referenz-, Storybook- und Drupal-Links ins Ticket |

Die Screenshot-Erzeugung ist ein **bestehendes** Kommando, die Link-Übergabe ein **bestehender**
Mechanismus. Geändert wird ausschließlich Step-Skill-Prosa **plus** die `inputs`-Deklaration.

## Entscheidungen (schließt die 6 offenen Spec-Punkte)

### D1 — Viewport-Mapping: schmalster (mobile) + breitester (desktop) definierter Breakpoint

„mobile" = der **schmalste** definierte Breakpoint, „desktop" = der **breiteste** definierte
Breakpoint. Die Pixelbreite wird über die bestehende Breakpoint→Pixel-Auflösung ermittelt
(`breakpoint-widths.ts`: Token-Werte aus `design-system/design-tokens.yml` gewinnen vor den
Tailwind-Defaults `sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280; Ergebnis aufsteigend sortiert →
erster Eintrag = mobile-Breite, letzter = desktop-Breite). Jede Breite geht als
`_debo capture screenshot --width <px>`.

- **Warum:** nutzt bestehende Infrastruktur, passt sich dem Token-Set des Projekts an, ist konkret
  benannt (AC-2), und bleibt konsistent mit den Breakpoints, gegen die `design-verify` misst.
- **Verworfen:** feste Pixelbreiten (z. B. 375/1440) — ignorieren Tokens und driften von den
  Breakpoints der Verifikation ab. Ebenfalls verworfen: hartkodiertes Paar `sm`/`xl` — bricht,
  wenn ein Projekt `sm` oder `xl` nicht definiert; „schmalster/breitester" ist robuster.

### D2 — Ablage der Screenshots: nicht-committetes Worktree-Verzeichnis

- **Verzeichnis:** `<worktree>/.gaia/spec-reference/` (dediziert, **nicht committet**).
- **Namenskonvention:** `<viewport>--<breakpoint>-<width>px.png`, z. B.
  `mobile--sm-640px.png`, `desktop--xl-1280px.png`.
- **Commit-Status:** die zwei **frischen Screenshots** werden **nicht** committet — der Link-`uri`
  ist der **absolute Worktree-Pfad**. Die bereits committeten **`reference_folder`-Bilder** werden
  dagegen mit ihrem **committeten Repo-Pfad** verlinkt (bleiben also nach dem Aufräumen des
  Worktrees erreichbar).
- **Bewusst in Kauf genommen** (PM-Rahmen): die frischen Screenshot-Pfade sind nur auf der Maschine
  des Runs öffenbar und nach dem Worktree-Cleanup tot.
- **Verworfene Alternative** (dokumentiert): die Screenshots unter `docs/gaia/designbook-37/reference/`
  committen, um sie über das Worktree-Cleanup hinaus zu erhalten — schwerer, und der PM-Rahmen hat
  „lokal/tot-nach-Cleanup" ausdrücklich akzeptiert.

### D3 — Drupal-Preview im Design-Skill: bedingt-symmetrisch, sonst `not_applicable`

Der Drupal-Preview-Link wird in **beiden** Skills identisch behandelt: geführt **nur**, wenn der
Build **Drupal-Config geändert** hat; sonst explizit als `not_applicable` mit Ein-Zeilen-Begründung
benannt (Link **nicht** hart entfernt, sondern konditioniert). Da eine
`work:design-to-designbook`-Sub-Work für sich genommen keinen Drupal-Render erzeugt, ist der Link
in `debo-designbook-design` **im Normalfall `not_applicable`** — der seltene gemischte Fall
(Config wurde doch geändert) bleibt dadurch trotzdem sichtbar. (Gewählt: „Link führen, wenn
vorhanden — sonst `not_applicable`"; verworfen: „im Design-Skill ganz weglassen", weil das den
gemischten Fall unsichtbar machte und die beiden Skills asymmetrisch ließe.)

### D4 — `options.gaia.kind`-Werte

| Link | `kind` | Step |
|---|---|---|
| `reference_folder`-Bilder | `reference` | spec |
| frische mobile/desktop-Screenshots | `reference` | spec |
| Storybook-Preview | `storybook` | coding |
| Drupal-Preview | `drupal-preview` | coding |

`kind` ist Freitext in `options.gaia.kind` (konsistent mit `@gaia/run-outtake`, das Links per
`kind = MR` auflöst). `reference` benennt die **Eingabe**-Oberfläche treffender als das
DESIGNBOOK-33-Beispiel `kind: design` (das ein **geliefertes** Artefakt meinte). Zusätzlich tragen
alle neuen Links einen **selbstbeschreibenden `title`** (`Reference (mobile) — …`,
`Storybook preview — …`, `Drupal preview — …`), damit die Oberfläche auch dann lesbar bleibt, wenn
ein Konsument nur `title` rendert (siehe R1).

### D5 — Leere `reference_url`

- `reference_url` leer, `reference_folder`-Bilder vorhanden: die zwei frischen Screenshots
  **entfallen** und werden explizit als `not_required` benannt; die `reference_folder`-Bilder
  werden dennoch gelistet und verlinkt.
- **Beide** leer (keine Referenz): die gesamte Spec-Referenz-Oberfläche ist `not_required`,
  explizit benannt — **kein** Ersatz wird erfasst.

### D6 — Deklarationsform: ein neuer überschreibbarer `inputs`-Wert je Skill

- Die Spec-Referenz-Fähigkeit wird als **ein neuer `inputs`-Wert `reference_capture`** je Skill
  deklariert (`description` + `default`), überschreibbar per `WORKFLOW.md`
  (effective = override ?? default). Der `default` kodiert D1/D4/D5: `reference_folder`-Bilder
  listen; schmalsten + breitesten Breakpoint der `reference_url` per `_debo capture screenshot`
  aufnehmen; alle als `kind: reference`-Links übergeben; bei fehlender `reference_url` als
  `not_required` auslassen. → erfüllt AC-9.
- Die **`coding`-Kopplung** (Storybook↔geänderte Designbook-Artefakte, Drupal↔geänderte Config)
  wird als **feste Prosa-Regel** ohne eigenen `inputs`-Wert formuliert — **bewusst**: es ist eine
  harte Sichtbarkeitsregel, kein projekt-abstimmbares Kommando. Dieser Verzicht ist hiermit
  dokumentiert (AC-9, zweite Hälfte).

## Zu ändernde Dateien (nur Prosa + Frontmatter)

### `.agents/skills/designbook-gaia/skills/debo-designbook-design/SKILL.md`

1. **Frontmatter `inputs`:** neuen Wert `reference_capture` ergänzen (`description` + `default` je D6).
2. **`## spec`:** neuer Schritt zwischen Plan-Publish (Schritt 3) und `run-outtake` (Schritt 4):
   `reference_capture` ausführen — `reference_folder`-Bilder listen, zwei Screenshots der
   `reference_url` erzeugen (D1), und alle als `kind: reference`-Link-Einträge sowohl im
   `@gaia/run-outtake` anzeigen **als auch** an `@gaia/transition-ticket` (der spec→coding-Übergang,
   Schritt 6) als resolved links übergeben. `not_required`-Regel je D5.
3. **`## coding` Schritt 5 (`run-outtake`) + Schritt 7 (`transition-ticket`):** Storybook-Link
   **bedingt** an geänderte Designbook-Artefakte koppeln (entfällt → dokumentierte Begründung);
   **neu** den Drupal-Preview-Link bedingt an geänderte Config koppeln (sonst `not_applicable`, D3).
   Beide Links in `run-outtake` **und** transition-ticket-resolved-links (AC-8).
4. **Unverändert:** Frontmatter `when`-Triple, Schritt 4 (`design_verify`-Measurement),
   RED/GREEN-Gates, Transition-Ziele, Merge-Gate, `## diagnose`, `## review`,
   `## Multi-work single transition`.

### `.agents/skills/designbook-gaia/skills/debo-config-sync/SKILL.md`

1. **Frontmatter `inputs`:** identischer neuer Wert `reference_capture`.
2. **`## spec`:** identischer neuer Reference-Schritt (spec→coding-Transition ist Schritt 6).
3. **`## coding` Schritt 5 + 7:** Storybook- **und** Drupal-Preview-Link von „both mandatory"
   (bedingungslos) auf **bedingt** umstellen (Storybook↔geänderte Designbook-Artefakte,
   Drupal↔geänderte Config; je Wegfall dokumentierte Begründung). Beide weiterhin in `run-outtake`
   **und** transition-ticket-resolved-links.
4. **Unverändert:** `when`-Triple, Schritt 4 (`config_verify`-Measurement), Gates,
   Transition-Ziele, Merge-Gate, `## diagnose`, `## review`,
   `## Multi-work single transition`.

Der `designbook-gaia`-Index (`SKILL.md`) und die gaia-Helper-Skills bleiben **unberührt**.

## Risiken

| # | Risiko | Schwere | Gegenmaßnahme |
|---|---|---|---|
| R1 | `@gaia/transition-ticket`-Prosa sagt „links are `{uri,title}` only" → `options.gaia.kind` überlebt den Write evtl. nicht. `@gaia/transition-ticket` darf **nicht** geändert werden (out of scope). | MITTEL | `kind` gemäß Ticket-Mechanismus (`options.gaia.kind`, DESIGNBOOK-33-Präzedenz) übergeben **und** den `kind` zusätzlich im **`title`** kodieren (D4), sodass die Oberfläche auch bei reinem `title`-Rendering lesbar bleibt. In review per Ticket-`links[]`-Inspektion prüfen. |
| R2 | Ein Konsument koppelt die Screenshot-Erzeugung an eine feste Breakpoint-Namensliste statt an „schmalster/breitester". | GERING | D1 als überschreibbarer `reference_capture`-`default` (D6) formuliert — ein Projekt passt das per `WORKFLOW.md` an, ohne Skill-Edit. |
| R3 | Tote Screenshot-Links nach Worktree-Cleanup. | GERING (akzeptiert) | Bewusster PM-Rahmen (D2); `reference_folder`-Bilder nutzen committete Pfade und bleiben erreichbar. |
| R4 | Contract-Bruch durch versehentliche `when`-Triple- oder Gate-Änderung. | HOCH | `git diff` in review (AC-10) belegt Unberührtheit; `when`/Gates/Measurements/Transitions werden nicht angefasst. |

## Verifikation (AC → doc-struktureller Check)

Kein Runtime-Surface → jede AC mappt auf einen Lese-/Diff-/Contract-Check (Detail: `test`-Kommentar).

- AC-1/2/3/4 → `## spec` beider `SKILL.md` lesen: `reference_folder`-Listing, zwei Screenshots mit
  konkretem Viewport-Mapping (D1), Nennung von `_debo capture screenshot`, `not_required`-Regel.
- AC-5 → `reference_capture`-`default` + `## spec`-Prosa: Referenz+Screenshots als
  `kind: reference`-Links an `@gaia/transition-ticket`.
- AC-6/7 → `## coding` beider: Storybook↔geänderte Artefakte (mit Begründungspflicht),
  Drupal↔geänderte Config (für `debo-designbook-design` Regel D3 explizit).
- AC-8 → beide Links in `run-outtake` **und** transition-ticket-resolved-links.
- AC-9 → Frontmatter: `reference_capture` mit `description` **und** `default`; coding-Kopplung als
  dokumentierter `inputs`-Verzicht.
- AC-10 → `git diff` gegen Ausgangsstand: `when`, Gates, `design_verify`/`config_verify`,
  Transition-Ziele, Merge-Gate unberührt.
- AC-11 → `@gaia/workflow-step`-Abgleich: `when`-Triple unverändert, `inputs` mit
  description+default, Prosa-pro-Step inkl. Routing intakt.
