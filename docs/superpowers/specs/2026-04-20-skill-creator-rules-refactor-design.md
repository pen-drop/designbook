# Design: Skill-Creator Rules Refactor — Per-File-Type Rules als Single Source of Truth

## Summary

Die Regeln des `designbook-skill-creator` Skills werden pro Artefakt-Typ organisiert (Task, Blueprint, Rule, Schema, Workflow) und zur alleinigen Quelle für Authoring-Anleitung **und** Validierungsprüfungen. Die bisher in `resources/validate.md` hart kodierten Prüfungen (E01–E07, W01–W09) werden in die jeweiligen Rule-Dateien verschoben und erhalten file-type-spezifische IDs (`TASK-01`, `BLUEPRINT-01`, …). `validate.md` wird zum reinen Runner — es enumeriert Rule-Dateien, lädt deren `## Checks`-Tabellen und führt sie aus, ohne selbst Prüflogik zu halten.

Das löst zwei Probleme gleichzeitig:

1. **Authoring-Klarheit.** Beim Anlegen eines neuen Tasks wird genau eine Rule-Datei (`rules/task.md`) geladen, die sowohl das "WAS" (Prinzipien, Beispiele) als auch die Prüfkriterien enthält.
2. **Validator-Kohärenz.** Prüfungen leben an genau einer Stelle. Der Validator dupliziert nichts; Änderungen an Regeln sind automatisch für Validator und Authoring wirksam.

## Motivation (aus review.md, Zeile 68)

> skill-creator: Hier muss viel klarer sein was in tasks drin stehen und was in blueprints und was in rules. Das steht schon im validate resource. Das gehört in rule dateien damit diese auch beim erstellen der jeweiligen dateien validiert werden. In validate sollte auch ein verweis auf die jeweiligen rules geben.

## Bisheriger Zustand

```
.agents/skills/designbook-skill-creator/
├── SKILL.md
├── rules/
│   ├── principles.md          # ~365 Zeilen, Prinzipien quer über alle File-Types
│   ├── structure.md           # ~200 Zeilen, Struktur-Konventionen quer über alle File-Types
│   └── validate-params.md     # 19 Zeilen, task-spezifische Param-Checks
└── resources/
    ├── validate.md            # 172 Zeilen, 16 hart kodierte Checks mit Querverweisen auf principles/structure
    ├── research.md
    ├── schemas.md
    ├── schema-composition.md
    └── skill-map.md
```

Probleme:

- `validate.md` dupliziert die Regeln: Die Check-Tabelle enthält "Source: principles.md (Tasks Say WHAT)" und die vollständige Prüfbeschreibung. Geht die Regel in `principles.md` auseinander, bleibt der Check hinter.
- `principles.md` und `structure.md` mischen Regeln für Tasks, Blueprints, Rules, Schemas und Workflow-Dateien in einem Fluss — beim Anlegen einer Rule-Datei ist unklar, welche Abschnitte relevant sind.
- Die check-IDs (`E01`, `W07`) geben keinen Hinweis auf den File-Type — `W07` betrifft sowohl Task-Params als auch `schemas.yml`-Typen.
- `validate-params.md` ist bereits eine file-type-spezifische Rule, aber außerhalb des einheitlichen Schemas.

## Ziel-Architektur

### Verzeichnisstruktur

```
.agents/skills/designbook-skill-creator/
├── SKILL.md
├── rules/
│   ├── common-rules.md        # Quer-Regeln für alle File-Types (Frontmatter parsebar, Site-Agnostic)
│   ├── task.md                # Alles für tasks/*.md
│   ├── blueprint.md           # Alles für blueprints/*.md
│   ├── rule.md                # Alles für rules/*.md (außer dieser Skill selbst)
│   ├── schema.md              # Alles für schemas.yml
│   └── workflow.md            # Alles für workflows/*.md
└── resources/
    ├── validate.md            # Pure Runner — keine eigene Prüflogik
    ├── research.md
    ├── schemas.md
    ├── schema-composition.md
    └── skill-map.md
```

`rules/principles.md`, `rules/structure.md`, `rules/validate-params.md` werden **ersatzlos entfernt** (CLAUDE.md: keine Backwards-Compat-Shims). Ihr Inhalt wird in die neuen Dateien migriert.

### Rule-Datei-Format

Jede Rule-Datei hat denselben Aufbau:

```markdown
---
name: <file-type>-rules
description: Authoring- und Validierungsregeln für <file-type>-Dateien
applies-to: tasks/*.md            # Glob relativ zum Skill-Root (Runner-Dispatch)
---

# <File-Type> Rules

## Prinzip 1 — <Name>
[Narrativ mit Wrong/Correct-Beispielen wie bisher in principles.md]

## Prinzip 2 — <Name>
…

## Checks

| ID | Severity | What to verify | Where |
|---|---|---|---|
| TASK-01 | error | `result:` schema uses `$ref` when matching type exists in `schemas.yml` | frontmatter |
| TASK-02 | warning | Body enthält keine Implementierungsdetails (CSS-Klassen, Twig-Code, Framework-Syntax) | body |
| … | | | |
```

**Zwei Zwecke, eine Datei:**

- Beim Authoring (z. B. `skill-creator` lädt `rules/task.md` vor dem Anlegen eines neuen Tasks) liest Claude die Prinzipien + Beispiele und versteht, was zu produzieren ist.
- Beim Validieren lädt `validate.md` dieselbe Datei, extrahiert die `## Checks`-Tabelle und wendet die Zeilen auf jede passende Datei an.

### `applies-to` als Dispatch-Schlüssel

Das `applies-to` Frontmatter ist eine Glob-Liste relativ zum zu validierenden Skill-Root. Beispiele:

| Rule-Datei | applies-to |
|---|---|
| `common-rules.md` | `tasks/*.md`, `blueprints/*.md`, `rules/*.md`, `**/*.yml` |
| `task.md` | `tasks/*.md`, `**/tasks/*.md` |
| `blueprint.md` | `blueprints/*.md`, `**/blueprints/*.md` |
| `rule.md` | `rules/*.md`, `**/rules/*.md` |
| `schema.md` | `schemas.yml`, `**/schemas.yml` |
| `workflow.md` | `workflows/*.md`, `**/workflows/*.md` |

Der Runner baut daraus das Dispatch-Mapping. Wenn `common-rules.md` und `task.md` beide auf `tasks/create-component.md` matchen, laufen beide Check-Sets.

### Check-ID-Konvention

- Präfix = File-Type in Großbuchstaben (`TASK`, `BLUEPRINT`, `RULE`, `SCHEMA`, `WORKFLOW`, `COMMON`).
- Counter = zweistellig, innerhalb der Datei sequentiell (`TASK-01`, `TASK-02`, …).
- Severity steht in einer eigenen Spalte, nicht in der ID — das ersetzt die bisherige `E`/`W` Trennung. Findings-Reports gruppieren weiterhin nach Severity.

### `validate.md` als Runner

Neue Struktur der `validate.md`:

```markdown
# Skill Validator — Runner

## Prozess

1. Skill-Verzeichnis scannen (Dateien + schemas.yml).
2. Für jede Datei: alle Rule-Dateien in `.agents/skills/designbook-skill-creator/rules/` laden,
   deren `applies-to` Glob matcht.
3. Für jede geladene Rule-Datei: `## Checks`-Tabelle parsen, jede Zeile auf die Datei anwenden.
4. Findings, Metriken und Score-Berechnung wie bisher.

## Referenzen

- Task-Regeln: [rules/task.md](../rules/task.md)
- Blueprint-Regeln: [rules/blueprint.md](../rules/blueprint.md)
- Rule-Regeln: [rules/rule.md](../rules/rule.md)
- Schema-Regeln: [rules/schema.md](../rules/schema.md)
- Workflow-Regeln: [rules/workflow.md](../rules/workflow.md)
- Gemeinsame Regeln: [rules/common-rules.md](../rules/common-rules.md)
```

Keine Check-Tabelle mehr in `validate.md`. Metrik-Definitionen, Score-Berechnung, Output-Format und die Abgrenzung zu `research.md` bleiben erhalten — das sind Runner-Konzepte, nicht Regeln.

## Content-Migration — Inhaltliche Zuordnung

### `principles.md` → Ziel-Dateien

| Abschnitt in principles.md | Ziel-Datei |
|---|---|
| Tasks Say WHAT, Never HOW | `task.md` |
| Results Declare Schema, Not Just Paths | `task.md` |
| Tasks Declare Results in Schema, Not in Body | `task.md` |
| Schemas Must Teach the AI | `schema.md` |
| Blueprints Are Overridable Starting Points | `blueprint.md` |
| Rules Are Hard Constraints | `rule.md` |
| Rules Never Declare `params:` | `rule.md` |
| Concrete Implementations Belong in Blueprints | `blueprint.md` + `rule.md` (Referenz) |
| Skills Are Site-Agnostic | `common-rules.md` |
| Stages Flush After Completion | `task.md` |
| Workflow Steps Are Plain Names | `workflow.md` |
| Stage = Filename, No Duplication | `task.md` |
| Validation Is Automatic | `task.md` |

### `structure.md` → Ziel-Dateien

| Abschnitt in structure.md | Ziel-Datei |
|---|---|
| Integration Skills Layout | `common-rules.md` (Skill-Root-Struktur) |
| Core Skill Layout | `common-rules.md` |
| `schemas.yml` — Schema Definitions | `schema.md` |
| `tasks/` — Naming Rule + Workflow-qualified | `task.md` |
| `rules/` — Trigger + Filter Matching | `rule.md` |
| `rules/` — Consumer Semantics (domain) | `rule.md` |
| `rules/` — Strict Trigger Matching | `rule.md` |
| `rules/` — Domain Subcontexts | `rule.md` |
| `rules/` — Provider Rules (Legacy) | `rule.md` |
| `rules/` — Schema Extension Fields (extends/provides/constrains) | `rule.md` + `blueprint.md` |
| `blueprints/` — Trigger + Filter Matching | `blueprint.md` |
| `SKILL.md` — Index Only | `common-rules.md` |
| Naming Conventions | `common-rules.md` |

### `validate-params.md` → `task.md`

Alle fünf Checks (hardcoded paths, missing params, missing `$ref`, redundant body references, flat map format) sind task-spezifisch und wandern in die `## Checks` Tabelle von `task.md`.

### Check-ID-Mapping (alt → neu)

Vollständige Umnummerierung. Die Migration ist disposable (keine Altlasten), daher einmalige komplette Neunummerierung nach File-Type:

| Alt | Regel | Neu |
|---|---|---|
| E01 | Frontmatter fehlt/ungültig | `COMMON-01` |
| E02 | Pflichtfelder fehlen (when, result) | `TASK-01` |
| E03 | `$ref` zeigt ins Leere | `SCHEMA-01` |
| E04 | `when.steps` referenziert unbekannten Step | `TASK-02` |
| E05 | `stage:` in Frontmatter | `TASK-03` |
| E06 | `constrains:` in Blueprint | `BLUEPRINT-01` |
| E07 | Inline schema duplicates `schemas.yml` type | `TASK-04` |
| W01 | Body wiederholt Result-Schema | `TASK-05` |
| W02 | HOW statt WHAT | `TASK-06` |
| W03 | Site-specific content in core | `COMMON-02` |
| W04 | Cross-Layer-Duplikat | `TASK-07` |
| W05 | Validation steps in body | `TASK-08` |
| W06 | Workflow-Prefix in Workflow-Definition | `WORKFLOW-01` |
| W07 | Property lacks teaching signals | `SCHEMA-02` (+ `TASK-09` für Task-Params/Result) |
| W08 | Type missing title/description | `SCHEMA-03` |
| W09 | `additionalProperties: true` undokumentiert | `SCHEMA-04` |
| — | validate-params.md #1 (hardcoded paths) | `TASK-10` |
| — | validate-params.md #2 (missing param) | `TASK-11` |
| — | validate-params.md #3 (missing `$ref`) | `TASK-12` |
| — | validate-params.md #4 (redundant body) | `TASK-13` |
| — | validate-params.md #5 (flat map format) | `TASK-14` |

## SKILL.md Anpassung

`SKILL.md` verweist heute auf `principles.md` und `structure.md`. Diese Verweise werden durch Verweise auf die neuen Rule-Dateien ersetzt. Die "Key Principles" Bullet-Liste wird knapper gehalten und verweist auf die passende Rule-Datei statt pauschal auf `principles.md`.

## Nicht im Scope

- Änderungen am Runtime-Verhalten des Workflow-Engine oder der Rule-Loading-Logik im Addon.
- Andere Review-Punkte aus `review.md` (CSS, Image Styles, Extract-Reference, Capture, CLI-Workflow — jeweils eigene Change).
- Neue Checks hinzufügen. Die Migration ist 1:1 inhaltlich identisch.
- Automatisches Fixen von Findings. Das bleibt wie bisher Aufgabe der Nutzer/Agenten.

## Erfolgs-Kriterien

1. Nach der Migration existieren nur noch die sechs neuen Rule-Dateien in `rules/`. `principles.md`, `structure.md`, `validate-params.md` sind entfernt.
2. `validate.md` enthält keine `## Errors` oder `## Warnings` Tabelle mehr — nur noch Runner-Prozess, Metriken, Score, Output-Format.
3. Validator auf den bestehenden Skills (`designbook`, `designbook-drupal`, `designbook-css-tailwind`, `designbook-stitch`, `designbook-devtools`, `designbook-skill-creator` selbst) produziert dieselben Findings wie vorher, nur mit neuen IDs.
4. Beim Anlegen eines neuen Tasks lädt der skill-creator **nur** `rules/task.md` + `rules/common-rules.md` — nicht mehr `principles.md` + `structure.md` pauschal.

## Offene Punkte

Keine. Alle drei Kern-Design-Entscheidungen (Scope = B+A, Granularität = per-file-type ohne shared.md, Format = Narrativ + Checks-Tabelle) sind im Brainstorming bestätigt.
