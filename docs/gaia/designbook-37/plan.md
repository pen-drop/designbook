# DESIGNBOOK-37 — Implementation Plan

Checkbox-Plan für `coding`. **Task-Art:** skill-authoring (`work:docs`). Instruktions-/Task-Prosa;
kein Addon-Code, kein Runtime-Build. Kanonischer Editierort `.agents/skills/…` (nie
`.claude/skills/`, Symlink). Prosa bleibt **Englisch**. **Nichts** an `when`-Triple, Gates,
Measurements, Transitions oder Merge-Gate anfassen.

> **Author-approved Scope-Amendment:** die Screenshot-Erzeugung liegt in `extract-reference`
> (`@designbook/design`), die `designbook-gaia`-Spec-Schritte verlinken nur. Siehe `spec.md`.

## Phase 0 — Vorbereitung

- [ ] **`designbook-skill-creator` laden** (Pflicht vor jedem Edit an `extract-reference.md` —
      Task-File; `rules/task-files.md` + `rules/common-rules.md`).
- [ ] `design/schemas.yml#/Screenshot` + `#/ReferenceFolder` sichten: passt der bestehende
      `Screenshot`-Typ für die Overview-Einträge, oder braucht `result.reference_screenshots` einen
      Overview-Marker? Schema als SSOT anpassen, nicht in Prosa duplizieren.

## Phase 1 — `extract-reference.md` (Overview-Capture, `@designbook/design`)

- [ ] Nach dem `_debo extract`-Lauf **zwei Full-Page-Overview-Screenshots** der Reference-URL
      aufnehmen: mobile = schmalster, desktop = breitester definierter Breakpoint (Pixel über die
      bestehende Breakpoint→Pixel-Auflösung, Token gewinnt), via
      `_debo capture screenshot --url <reference_url> --out {{ reference_dir }}/overview--<viewport>--<bp>.png --width <px> --full-page`.
- [ ] Overview-PNGs in den `reference_folder` schreiben (committet, D2-Namensschema) und im
      `result` (`reference_screenshots` bzw. Overview-Feld) sichtbar machen.
- [ ] Bestehende Regeln erhalten: „No reference" (leerer `reference_folder` → keine Capture),
      „stable baseline / --refresh-reference" (Reuse bzw. Neu-Capture).
- [ ] D7: falls ein `full`/leer-Selector-Element auf diesen Breakpoints existiert, die Overview-PNGs
      als dessen Baseline registrieren (Reuse durch `ensure-baseline`); sonst eigenständig.

## Phase 2 — `debo-designbook-design/SKILL.md`

- [ ] **Frontmatter `inputs.reference_capture`** (description + default): nach dem Design-`--plan`-Lauf
      die Overview-Screenshots (+ Assets) aus dem `reference_folder` listen, als
      `options.gaia.kind: reference`-Links mit selbstbeschreibendem `title` übergeben; bei fehlender
      Referenz `not_required`.
- [ ] **`## spec`** neuer Schritt (zwischen „Publish spec+test handoff" 3 und `run-outtake` 4):
      `reference_capture` ausführen — Overviews im `@gaia/run-outtake` zeigen **und** an
      `@gaia/transition-ticket` (spec→coding, Schritt 6) als resolved links übergeben.
- [ ] **`## coding` Schritt 5 (`run-outtake`):** Storybook-Link **bedingt** an geänderte
      Designbook-Artefakte (Begründung bei Wegfall); **neu** Drupal-Preview-Link bedingt an geänderte
      Config, sonst `not_applicable` (Design-Normalfall `not_applicable`, D3).
- [ ] **`## coding` Schritt 7 (`transition-ticket`):** dieselben zwei Links als resolved links
      (bedingt) statt des unbedingten „final Storybook link (mandatory)".
- [ ] **Nicht anfassen:** `when`, Schritt 4 (`design_verify`-Measurement), Gates, Transition-Ziele,
      Merge-Gate, `## diagnose`, `## review`, `## Multi-work`.

## Phase 3 — `debo-config-sync/SKILL.md`

- [ ] **Frontmatter `inputs.reference_capture`:** identisch zu Phase 2.
- [ ] **`## spec`** identischer Reference-Schritt (löst mangels `reference_url` immer nach
      `not_required` auf — ehrlich benennen; spec→coding ist Schritt 6).
- [ ] **`## coding` Schritt 5 + 7:** Storybook- **und** Drupal-Preview-Link von „both mandatory"
      auf **bedingt** (Storybook↔geänderte Artefakte, Drupal↔geänderte Config; Begründung bei
      Wegfall). Beide in `run-outtake` **und** transition-links.
- [ ] **Nicht anfassen:** `when`, Schritt 4 (`config_verify`-Measurement), Gates, Transition-Ziele,
      Merge-Gate, `## diagnose`, `## review`, `## Multi-work`.

## Phase 4 — Konsistenz & Verifikation

- [ ] `designbook-gaia/SKILL.md` (Index) prüfen: keine Änderung nötig — nur bestätigen.
- [ ] **Runtime-Sanity (Amendment R2):** einen Design-Familien-`debo-test`-Case bzw. `design-verify`
      laufen lassen und belegen, dass die Overview-Capture in `extract-reference` weder
      `ensure-baseline` regressiert noch die Baseline-Vergleiche bricht.
- [ ] **AC-Abgleich** doc-strukturell: `extract-reference.md` + beide `SKILL.md` gegen AC-1…AC-11
      lesen; AC↔Evidenz-Matrix (Test-Kommentar) abhaken; AC-2/3-Amendment berücksichtigen.
- [ ] **`git diff`** gegen Ausgangsstand: `when`, Gates, Measurements, Transition-Ziele, Merge-Gate
      unberührt (AC-10).
- [ ] **`@gaia/workflow-step`-Contract**: `when` unverändert, `inputs` mit description+default,
      Prosa-pro-Step inkl. Routing (AC-11).
- [ ] `pnpm check` nur, falls ein Manifest-/Loader-/Schema-Test die geänderten `.md`/Schema erfasst
      (kein TS-Change sonst).

## Build-Reihenfolge

Phase 0 → 1 (extract-reference; erzeugt die zu verlinkenden PNGs) → 2/3 (gaia-Steps; unabhängig
voneinander) → 4 (gemeinsamer AC-/Diff-/Contract-Abgleich + Runtime-Sanity).
