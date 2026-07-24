# DESIGNBOOK-25 — Implementation Plan

Checkbox plan for `coding`. Task-Art: skill-refactor. Build order minimizes broken intermediate
states; verify at the end. All `git mv` to preserve history.

## Phase 1 — Addon-Engine-Code (`designbook-addon-skills`)

- [ ] `deriveArtifactName` (`workflow-resolve.ts:653-669`): Concern aus dem Ordner ableiten, der den
      Artifact-Typ-Ordner (`tasks|rules|blueprints|workflows`) enthält — nicht `parts[1]`.
- [ ] `derivePluginArtifactName` (`:147-158`): dieselbe Ableitung auf dem Plugin-Pfad.
- [ ] `isSkillContentRoot` (`skill-sources.ts:51-74`): Artifact-Ordner auch 2 Ebenen tief erkennen
      (`<root>/skills/<name>/tasks/…`), bestehende ≤1-Ebene-Fälle intakt.
- [ ] Unit-Tests für alle drei anpassen/ergänzen (nested-Pfad-Fälle, `as:`-Override, Plugin-Detection).

## Phase 2 — Geteilten Content verschieben (workflow-los)

- [ ] `git mv .agents/skills/designbook/scenes .agents/skills/designbook/skills/scenes`
- [ ] `skills/design/` anlegen; `git mv designbook/design/{tasks,rules,blueprints,schemas.yml}`
      → `designbook/skills/design/`.

## Phase 3 — 17 Workflow-Sub-Skills anlegen

Für jeden 1:1-Concern (`vision, tokens, data-model, sample-data, css-generate, install, import,
sections, shape-section, sb`) und `sync`→`sync-to`:

- [ ] `git mv designbook/<concern>` → `designbook/skills/<workflow>/` (bei `sync`→`sync-to`,
      `sections`/`shape-section` teilen sich den alten `sections/`-Inhalt: `sections`-Dir behält
      `intake--sections.md`, `shape-section` wird thin).
- [ ] Für die 6 design-Workflows je `skills/<wf>/workflows/` anlegen und die Workflow-Datei
      aus `design/workflows/` hineinschieben.
- [ ] Je Sub-Skill ein `SKILL.md` verfassen (`designbook-skill-creator` laden):
  - benennt Workflow-ID; weist an, `../../resources/workflow-execution.md` zu laden und
    `_debo workflow create --workflow <id>` zu starten (AC2);
  - `description` trägt die Auto-Dispatch-Trigger dieses Workflows (D2);
  - weist das Parsen globaler Flags aus `$ARGUMENTS` an (D3/AC9).
- [ ] `sb/SKILL.md`: CLI-Dispatch-Sonderfall (kein `workflow create`), Engine-Pointer + Workflow-ID `sb`.

## Phase 4 — `$ref`-Rewrites (exhaustiv, AC6)

- [ ] 3× sync skill-qualifiziert → `designbook/skills/data-model/schemas.yml#/DataModel`.
- [ ] drupal `create-component.md` (3) + `create-variant-story.md` (4) → `designbook/skills/design/…`.
- [ ] drupal `data-mapping/blueprints/ui-patterns.md:28` (Prosa) → `designbook/skills/scenes/…`.
- [ ] css-tailwind `compile-css.md:14` relativ → `../../designbook/skills/css-generate/schemas.yml#/CompiledCss`.
- [ ] `skills/design-component/workflows/design-component.md` → `../../design/schemas.yml#/Component`.

## Phase 5 — Parent-`SKILL.md` verschlanken (AC9)

- [ ] File-to-Workflow-Tabelle + Sub-Command-Dispatch-Scan entfernen.
- [ ] Behalten/aktualisieren: globale Flags (`--optimize`/`--plan`/`--from-plan`), Sub-Skill-Index
      (Verweise, keine Kopien), Engine-Pointer. `argument-hint` anpassen.

## Phase 6 — Doku-Nachzug

- [ ] `designbook-skill-creator/resources/{schemas.md,validate.md,skill-map.md}` auf `skills/<name>/`.
- [ ] Projekt-`CLAUDE.md` „Before creating…"-Pfadliste auf Nested-Pfade.

## Phase 7 — Verifikation (Gates)

- [ ] AC1/2/3/9: Struktur-Grep — je 17 `skills/<wf>/SKILL.md`; alte `<concern>/` frei von
      Workflow-Artefakten (außer `resources/`, `workflow/schemas.yml`); Parent ohne Kopien.
- [ ] AC4: Discovery liefert exakt 17 Workflow-IDs.
- [ ] AC5: `_debo workflow create --workflow <id>` je 17 → `step_resolved` vollständig, kein „not found".
- [ ] AC6: grep aller `$ref` → Ziel existiert; drupal + css-tailwind `create` lösen auf.
- [ ] AC7: `pnpm check` grün.
- [ ] AC8: `debo-test run <suite> <case>` grün für 1 Design-Familien-Case + 1 Nicht-Design-Case
      (bei Symlink-Auflösungslücke R3: lokalen physischen Skills-Override nutzen).
- [ ] Standing AC10: `work:code`-Validator (AC7 + AC8) grün.
