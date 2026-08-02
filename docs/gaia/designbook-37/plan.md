# DESIGNBOOK-37 — Implementation Plan

Checkbox-Plan für `coding`. **Task-Art:** skill-authoring (`work:docs`). Reine Prosa-/Frontmatter-
Edits an zwei `SKILL.md`; kein Addon-Code, kein Runtime-Build. Kanonischer Editierort
`.agents/skills/…` (nie `.claude/skills/`, Symlink). Prosa bleibt **Englisch**. Es wird **nichts**
an `when`-Triple, Gates, Measurements, Transitions oder Merge-Gate angefasst.

## Phase 1 — `debo-designbook-design/SKILL.md`

- [ ] **Frontmatter `inputs`:** `reference_capture` ergänzen — `description` (kurz: die Spec-Referenz-
      Oberfläche) + `default` (Prosa): `reference_folder`-Bilder listen; schmalsten + breitesten
      definierten Breakpoint der `reference_url` per `_debo capture screenshot --url … --out
      <worktree>/.gaia/spec-reference/<viewport>--<bp>-<px>px.png --width <px>` (Breite über die
      bestehende Breakpoint→Pixel-Auflösung, Token-Werte gewinnen) aufnehmen; alle als
      `options.gaia.kind: reference`-Links mit selbstbeschreibendem `title` übergeben; bei fehlender
      `reference_url` die Screenshots als `not_required` auslassen, bei zusätzlich leerem
      `reference_folder` die gesamte Referenz-Oberfläche `not_required`.
- [ ] **`## spec` — neuer Schritt** zwischen „Publish spec+test handoff" (3) und `run-outtake` (4):
      `reference_capture` ausführen; die Referenz-Bilder + zwei Screenshots **im `@gaia/run-outtake`
      anzeigen** und **an `@gaia/transition-ticket`** (spec→coding, Schritt 6) als resolved links
      übergeben (`kind: reference`).
- [ ] **`## coding` Schritt 5 (`run-outtake`):** den **final Storybook link** **bedingt** an
      geänderte Designbook-Artefakte (Scene-/Component-Dateien) koppeln; entfällt er → dokumentierte
      Begründung. **Neu:** Drupal-Preview-Link bedingt an geänderte Drupal-Config; sonst
      `not_applicable` (im Design-Normalfall `not_applicable`, D3).
- [ ] **`## coding` Schritt 7 (`transition-ticket`):** dieselben zwei Links als resolved links
      (bedingt) statt des bisher unbedingten „final Storybook link (mandatory)". Storybook + Drupal
      erscheinen in `run-outtake` **und** hier (AC-8).
- [ ] **Nicht anfassen:** `when`-Triple, Schritt 4 (`design_verify`-Measurement, session PATCH),
      RED/GREEN-Gates, Transition-Ziele, `@gaia/merge-mr`-Gate, `## diagnose`, `## review`,
      `## Multi-work single transition`.

## Phase 2 — `debo-config-sync/SKILL.md`

- [ ] **Frontmatter `inputs`:** identischer `reference_capture`-Wert (description + default wie
      Phase 1).
- [ ] **`## spec` — neuer Schritt** analog Phase 1 (spec→coding-Transition ist hier Schritt 6);
      Referenz + zwei Screenshots in `run-outtake` **und** an `transition-ticket`.
- [ ] **`## coding` Schritt 5 + 7:** Storybook- **und** Drupal-Preview-Link von „both mandatory"
      (bedingungslos) auf **bedingt** umstellen — Storybook↔geänderte Designbook-Artefakte,
      Drupal↔geänderte Config; je Wegfall dokumentierte Begründung. Beide weiterhin in `run-outtake`
      **und** transition-ticket-resolved-links.
- [ ] **Nicht anfassen:** `when`-Triple, Schritt 4 (`config_verify`-Measurement), Gates,
      Transition-Ziele, Merge-Gate, `## diagnose`, `## review`,
      `## Multi-work single transition`.

## Phase 3 — Konsistenz & Verifikation

- [ ] `designbook-gaia/SKILL.md` (Index) prüfen: keine Änderung nötig (Cross-Plugin-Helper-Liste
      unberührt) — nur bestätigen.
- [ ] **AC-Abgleich** doc-strukturell: beide `SKILL.md` (Frontmatter + `## spec` + `## coding`)
      gegen AC-1…AC-11 lesen; die AC↔Evidenz-Matrix aus dem `test`-Kommentar abhaken.
- [ ] **`git diff`** gegen den Ausgangsstand: belegen, dass `when`, Gates, Measurements,
      Transition-Ziele, Merge-Gate unberührt sind (AC-10).
- [ ] **`@gaia/workflow-step`-Contract**: `when`-Triple unverändert, jeder `inputs`-Wert mit
      `description` **und** `default`, Prosa-pro-Step inkl. Routing intakt (AC-11).
- [ ] Kein `pnpm check` erforderlich (kein TS/Addon-Change); falls die Skill-Frontmatter von einem
      Manifest-/Loader-Test erfasst wird, diesen laufen lassen.

## Build-Reihenfolge

Phase 1 und 2 sind unabhängig (zwei Dateien); Phase 3 verifiziert beide gemeinsam. Reihenfolge
egal; empfohlen Design-Skill zuerst (er bekommt den Drupal-Link erstmals), dann Config-Skill
(dort nur Kopplung), dann gemeinsamer AC-/Diff-/Contract-Abgleich.
