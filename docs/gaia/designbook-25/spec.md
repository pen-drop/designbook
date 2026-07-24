# DESIGNBOOK-25 — Spec: jeden debo-Workflow als eigenes Nested-Sub-Skill

**Task-Art:** skill-refactor · **Sub-work:** `work:code` · **Ziel-State nach spec:** `coding`
**Scenario:** none — kein Runtime-/UI-Surface (`scenario_required: false`). Verifikation über
`_debo workflow create` je ID, `debo-test run <suite> <case>` und `pnpm check`.

## Problem

Alle 17 debo-Workflows liegen als flache Concern-Ordner unter
`.agents/skills/designbook/<concern>/`. Einstieg ist ausschließlich das monolithische Parent-
`SKILL.md`, das das gesamte Skill inkl. Engine-Doku lädt und über zwei Tabellen (Sub-Command +
File-to-Workflow) dispatched. Ziel: **jeder Workflow ein eigenes Nested-Sub-Skill** unter
`.agents/skills/designbook/skills/<workflow>/`, das die debo-Engine selbst lädt.

## Recherche-Ergebnisse (bindend für den Umbau)

Die Auflösungs-Engine im Addon (`packages/storybook-addon-designbook/src`) wurde vermessen:

1. **Discovery überlebt die zusätzliche Tiefe.** Alle Globs nutzen `**`:
   - Workflows: `skills/**/workflows/<id>.md` (`workflow-discovery.ts:28,40`)
   - Tasks: `skills/**/tasks/*.md` + Fallback `skills/**/tasks/<stage>.md` (`workflow-resolve.ts:1103,1138,1170,1212`)
   - Rules: `skills/**/rules/*.md` (`:1252`) · Blueprints: `skills/**/blueprints/*.md` (`:1283`)
   → `skills/designbook/skills/<wf>/…` matcht bereits. **Keine Discovery-Änderung nötig.**
2. **Tasks lösen per globalem Bare-Name-Glob** (nicht scoped auf den eigenen Workflow-Ordner) — belegt
   dadurch, dass `design-screen` den Step `create-sample-data` (in `sample-data/tasks/`) und
   `create-scene` (in `scenes/tasks/`) referenziert. **Folge: Task-Namen müssen global eindeutig
   bleiben; Duplizieren geteilter Tasks erzeugt Namenskollisionen — nicht nur SSOT-Bruch.**
3. **Rules/Blueprints matchen per `trigger.domain`** (ortsunabhängig), nicht per Co-Location. Sie müssen
   nur unter irgendeinem `skills/**/rules|blueprints/` liegen.
4. **`$ref`-Auflösung** (`resolveSchemaRef`, `workflow-resolve.ts:234-278`):
   - **Relative Refs** (`../schemas.yml#/X`) → relativ zum Task-File. **Tiefenunabhängig.** 134 Stück;
     sie heilen selbst, **solange jede referenzierte Concern unter `skills/<gleicher-Name>/` landet**
     (das `../../<concern>/schemas.yml`-Muster bildet 1:1 auf `skills/<concern>/` ab).
   - **Skill-qualifizierte Refs** (`designbook/<concern>/schemas.yml#/X`) → `resolve(skillsRoot, filePart)`.
     Der Concern-Pfad muss von `<concern>` auf `skills/<name>` umgeschrieben werden.
5. **Drei erzwungene Code-Änderungen** durch die Extra-Tiefe:
   - `deriveArtifactName` (`workflow-resolve.ts:653-669`) nimmt den Concern aus `parts[1]`; bei
     `designbook/skills/<wf>/tasks/x.md` (5 Segmente) wird das zu `designbook:skills:x` **für alle** →
     Namespace-Kollaps, bricht `as:`-Override-Targeting + Anzeigenamen.
   - `derivePluginArtifactName` (`:147-158`) — gleicher Bug auf dem Plugin-Pfad.
   - `isSkillContentRoot` (`skill-sources.ts:51-74`) erkennt Artifact-Ordner nur ≤1 Ebene tief →
     Plugin-Cache/Symlink-Packaging der Nested-Skills wäre unsichtbar; muss 2 Ebenen tief erkennen.

## Entscheidungen

### D1 — Geteilter Content: workflow-lose Shared-Roots **neben** `skills/` beim Parent (amended)

Die 6-Workflow-`design`-Familie teilt einen Satz Tasks/Rules/Blueprints/Schema; `scenes/` ist
geteilter Content **ohne eigenen Workflow** (genutzt von design, sections, cross-skill von drupal).

- **Gewählt (amended, coding):** `designbook/design/` und `designbook/scenes/` liegen **neben** `skills/`
  beim Parent — **nicht** unter `skills/`. Damit enthält `skills/` **ausschließlich** die 17 echten
  Workflow-Sub-Skills (alle mit `SKILL.md`); die zwei Shared-Roots maskieren sich nicht als Skills.
  Die 6 design-Workflow-Sub-Skills bleiben **dünn** (`SKILL.md` + `workflows/<id>.md`).
- **Ursprünglich (spec):** beide unter `skills/design/` + `skills/scenes/`. Auf Author-Wunsch geändert,
  weil workflow-lose Ordner unter `skills/` (ohne `SKILL.md`) verwirren.
- **Warum überhaupt Shared-Roots:** Duplizieren ist durch die Engine ausgeschlossen (globaler
  Task-Name-Glob, Recherche #2) und verletzt SSOT. Ein einziger Content-Home je geteiltem Concern.
- **Engine-Verträglichkeit:** Discovery-Globs sind `skills/**/…` = `.agents/skills/**`; `designbook/design/…`
  liegt weiter darunter → wird unverändert gefunden (kein Glob-Change). `deriveArtifactName` nimmt den
  Concern aus dem Dir über dem Kind-Dir → `designbook:design:…` bleibt identisch (kein Code-/Namens-Change).
- **Ref-Kosten der Verlagerung:** relative Refs heilen nur bei **einheitlicher** Tiefe. Da die Shared-Roots
  jetzt eine Ebene höher als die Workflow-Sub-Skills liegen, werden 8 Cross-Level-Refs angepasst:
  Workflow→Shared (`../../design` → `../../../design`, 2×) und Shared→Workflow (`../../vision` →
  `../../skills/vision`, 6×). Skill-qualifizierte Refs von drupal bleiben auf `designbook/design/…`,
  `designbook/scenes/…` (= Original).
- **AC-Verträglichkeit:** AC1 (17 Workflow-Dirs mit `SKILL.md`) erfüllt; AC4 (exakt 17 Workflow-IDs) erfüllt
  (Shared-Roots haben kein `workflows/`). **AC3-Amendment (Author-approved):** die zulässigen Parent-
  Ausnahmen sind jetzt `resources/`, `workflow/schemas.yml` **und die workflow-losen Shared-Content-Roots
  `design/` + `scenes/`** — sie sind keine „alten Concern-Ordner mit Workflow-Artefakten", sondern
  bewusst geteilte Engine-Content-Roots.

### D2 — Auto-Dispatch wandert in die Sub-Skill-`description`

Die File-to-Workflow-Tabelle (User erwähnt `vision.yml`/`data-model.yml`/Tokens … → Workflow startet)
verschwindet aus dem Parent. **Jedes Sub-Skill deklariert seine Trigger-Keywords + Pfad-Hinweise in
seiner eigenen `description`**; Claude Code triggert per description-Match. Verteilte Ownership pro
Workflow; der Parent bleibt schlank.

### D3 — Sub-Skills sind eigenständig adressierbar

Jedes Sub-Skill ist ein eigenständig registriertes Nested-Skill (`/design-component`, `/tokens`, …),
Name = Workflow-ID. Der Parent `debo` wird zum **dünnen Index** (Sub-Skill-Liste + globale Flags +
Engine-Pointer). **Globale Flags (`--optimize`/`--plan`/`--from-plan`) bleiben wirksam**, indem jedes
Sub-Skill-`SKILL.md` das Parsen aus `$ARGUMENTS` anweist und auf die Engine-Doku verweist (AC9).

## Zielstruktur

```
.agents/skills/designbook/
  SKILL.md                       # dünn: Sub-Skill-Index + globale Flags + Engine-Pointer
  resources/                     # UNVERÄNDERT (Engine-Doku)
  workflow/schemas.yml           # UNVERÄNDERT (engine-weiter Typ WorkflowOutput)
  design/            tasks/ rules/ blueprints/ resources/ schemas.yml   # SHARED, workflow-los (neben skills/)
  scenes/            tasks/ schemas.yml                                 # SHARED, workflow-los (neben skills/)
  skills/                        # NUR die 17 Workflow-Sub-Skills (alle mit SKILL.md)
    design-component/  SKILL.md  workflows/design-component.md      # thin
    design-screen/     SKILL.md  workflows/design-screen.md         # thin
    design-entity/     SKILL.md  workflows/design-entity.md         # thin
    design-shell/      SKILL.md  workflows/design-shell.md          # thin
    design-verify/     SKILL.md  workflows/design-verify.md         # thin
    config-verify/     SKILL.md  workflows/config-verify.md         # thin
    vision/       SKILL.md workflows/ tasks/ rules/ schemas.yml
    tokens/       SKILL.md workflows/ tasks/ rules/ schemas.yml
    data-model/   SKILL.md workflows/ tasks/ rules/ blueprints/ schemas.yml
    sample-data/  SKILL.md workflows/ tasks/ schemas.yml
    css-generate/ SKILL.md workflows/ tasks/ fonts/google/{tasks,rules}/ schemas.yml
    install/      SKILL.md workflows/ tasks/ rules/ schemas.yml
    import/       SKILL.md workflows/ tasks/ schemas.yml
    sync-to/      SKILL.md workflows/ tasks/ schemas.yml            # aus Concern sync/
    sections/     SKILL.md workflows/sections.md tasks/intake--sections.md
    shape-section/ SKILL.md workflows/shape-section.md              # thin (nutzt scenes/create-scene-file)
    sb/           SKILL.md workflows/sb.md                          # track:false CLI-Dispatch (s.u.)
```

**Sonderfall `sb`:** `track: false`, kein `workflow create` — reiner CLI-Passthrough
(`_debo storybook start|stop|…`). Sein `SKILL.md` nennt die Workflow-ID `sb` und den Engine-Pointer,
dispatcht aber direkt auf die Storybook-CLI statt `workflow create`. AC2-Wortlaut („`workflow create`
starten") gilt für die 16 track-baren Workflows; `sb` behält seine Dispatch-Natur.

## Exhaustive `$ref`-Rewrites (AC6)

Da `data-model`/`css-generate` unter `skills/` wandern, aber `design`/`scenes` als Shared-Roots beim
Parent bleiben (D1 amended), ergeben sich diese Sites. Alle übrigen relativen Refs heilen selbst.

**Skill-qualifizierte + Workflow-Refs:**

| Datei | alt | neu |
|---|---|---|
| `sync-to/tasks/intake.md:12,29` | `designbook/data-model/schemas.yml#/DataModel` | `designbook/skills/data-model/schemas.yml#/DataModel` |
| `sync-to/tasks/resolve-filter.md:10` | `designbook/data-model/schemas.yml#/DataModel` | `designbook/skills/data-model/schemas.yml#/DataModel` |
| `designbook-css-tailwind/tasks/compile-css.md:14` | `../../designbook/css-generate/schemas.yml#/CompiledCss` | `../../designbook/skills/css-generate/schemas.yml#/CompiledCss` |
| `skills/design-component/workflows/design-component.md:18` | `../schemas.yml#/Component` | `../../../design/schemas.yml#/Component` |

drupal `create-component.md`, `create-variant-story.md` (`designbook/design/…`) und `ui-patterns.md`
(`designbook/scenes/…`) bleiben auf dem **Original**-Pfad (design/scenes wandern nicht).

**Cross-Level relative Refs (durch die asymmetrische Tiefe Shared-Root↔Sub-Skill):**

| Datei | alt | neu |
|---|---|---|
| `skills/tokens/tasks/create-tokens.md:17` | `../../design/schemas.yml#/DesignReference` | `../../../design/schemas.yml#/DesignReference` |
| `skills/sections/tasks/intake--sections.md:23` | `../../scenes/schemas.yml#/SceneFile` | `../../../scenes/schemas.yml#/SceneFile` |
| `design/tasks/extract-reference.md:18` | `../../vision/schemas.yml#/Vision` | `../../skills/vision/schemas.yml#/Vision` |
| `design/tasks/intake--design-screen.md:14,22,45` | `../../{data-model,vision,sample-data}/…` | `../../skills/{data-model,vision,sample-data}/…` |
| `design/tasks/intake--design-entity.md:24,40` | `../../{data-model,sample-data}/…` | `../../skills/{data-model,sample-data}/…` |

`designbook/workflow/schemas.yml#/WorkflowOutput` (Prosa in `outtake--design-workflow.md:47`) bleibt —
Parent-Whitelist-Datei. Verifiziert: alle 148 real-artifact `$ref`s lösen auf.

## Erzwungene Addon-Code-Änderungen (Part 2 — `designbook-addon-skills`)

1. `deriveArtifactName` — Concern aus dem Segment **direkt über** dem Artifact-Typ-Ordner ableiten
   (Ordner, der `tasks/|rules/|blueprints/|workflows/` enthält), nicht aus `parts[1]`.
2. `derivePluginArtifactName` — dieselbe Ableitung auf dem Plugin-Pfad.
3. `isSkillContentRoot` — Artifact-Ordner auch 2 Ebenen tief erkennen (`<root>/skills/<name>/tasks/…`).
4. Betroffene Unit-Tests aktualisieren (Concern-Namen/Pfad-Assertions, `as:`-Override-Fälle).

## Doku-Nachzug (Wahrheitspflicht)

- `designbook-skill-creator/resources/schemas.md` + `resources/validate.md` beschreiben die
  `<concern>/`-Ablage — auf `skills/<name>/` aktualisieren.
- `designbook-skill-creator/resources/skill-map.md` (Skill-Liste) nachziehen.
- Projekt-`CLAUDE.md` „Before creating…"-Pfadliste (`.agents/skills/designbook/<concern>/`) auf die
  Nested-Pfade aktualisieren.

## Risiken

| # | Risiko | Schwere | Gegenmaßnahme |
|---|---|---|---|
| R1 | `deriveArtifactName`-Änderung bricht `as:`-Override-Targeting (drupal überschreibt Core-Tasks) | HOCH | Unit-Test + `_debo workflow create` für einen überschriebenen Task, Override greift |
| R2 | Claude Code registriert Nested-Skills über `.claude`→`.agents`-Symlink nicht | MITTEL | Nach Umbau Registrierung prüfen (Ticket-Randbedingung #6); ggf. auf physischen Pfad ausweichen |
| R3 | `debo-test`-Workspace löst neue Nested-Skills über `.agents`-Symlink nicht auf (bekanntes Muster) | MITTEL | Bei AC8 lokalen Skills-Override (physische Kopie) einplanen |
| R4 | `isSkillContentRoot`-Änderung regressiert Plugin-Cache-Detection anderer Skills | MITTEL | Bestehende skill-sources-Tests grün halten + Fall 2-tief ergänzen |
| R5 | `sb` `track:false` passt nicht auf AC2-Wortlaut | GERING | In Spec dokumentiert; sb behält CLI-Dispatch |

## Verifikation (AC → ausführbarer Check)

Kein UI-Runtime-Surface → ACs mappen auf CLI/Test-Checks (Detail: `test`-Kommentar).

- AC1/AC2/AC3/AC9 → Struktur-/Grep-Checks über `skills/<wf>/SKILL.md` + geleerte alte Concerns.
- AC4 → Discovery-Glob `skills/**/workflows/*.md` liefert exakt 17 IDs.
- AC5 → `_debo workflow create --workflow <id>` je 17 IDs: `step_resolved` aufgelöst, kein „not found".
- AC6 → grep aller `$ref` → Zielpfad existiert; cross-skill drupal/css-tailwind `create` lösen auf.
- AC7 → `pnpm check` grün.
- AC8 → `debo-test run <suite> <case>` grün für einen Design-Familien-Case + einen Nicht-Design-Case
  (z. B. `tokens`/`css-generate`).
