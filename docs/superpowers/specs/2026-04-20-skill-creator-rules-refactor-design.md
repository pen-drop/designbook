# Design: Skill-Creator Rules Refactor — Per-File-Type Rules als Single Source of Truth

## Summary

Die Regeln des `designbook-skill-creator` Skills werden pro Artefakt-Typ organisiert (Task, Blueprint, Rule, Schema, Workflow) und zur alleinigen Quelle für Authoring-Anleitung **und** Validierungsprüfungen. Die bisher in `resources/validate.md` hart kodierten Prüfungen (E01–E07, W01–W09) werden in die jeweiligen Rule-Dateien verschoben und erhalten file-type-spezifische IDs (`TASK-01`, `BLUEPRINT-01`, …). `validate.md` wird zum reinen Runner — es enumeriert Rule-Dateien, lädt deren `## Checks`-Tabellen und führt sie aus, ohne selbst Prüflogik zu halten.

Das löst zwei Probleme gleichzeitig:

1. **Authoring-Klarheit.** Beim Anlegen eines neuen Tasks wird genau eine Rule-Datei (`rules/task-files.md`) geladen, die sowohl das "WAS" (Prinzipien, Beispiele) als auch die Prüfkriterien enthält.
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
│   ├── common-rules.md        # Quer-Regeln für alle File-Types (Frontmatter parsebar, Site-Agnostic, Skill-Root-Struktur)
│   ├── task-files.md          # Alles für tasks/*.md
│   ├── blueprint-files.md     # Alles für blueprints/*.md
│   ├── rule-files.md          # Alles für rules/*.md (außer dieser Skill selbst)
│   ├── schema-files.md        # Alles für schemas.yml
│   └── workflow-files.md      # Alles für workflows/*.md
└── resources/
    ├── validate.md            # Pure Runner — keine eigene Prüflogik
    ├── research.md
    ├── schemas.md
    ├── schema-composition.md
    └── skill-map.md
```

**Namenskonvention:** Alle File-Type-Regeln tragen den Suffix `-files.md` — das vermeidet die Kollision zwischen dem Dateinamen `rule.md` und dem Konzept "Rule". `common-rules.md` behält seinen Namen, da es nicht nur einen File-Type beschreibt.

`rules/principles.md`, `rules/structure.md`, `rules/validate-params.md` werden **ersatzlos entfernt** (CLAUDE.md: keine Backwards-Compat-Shims). Ihr Inhalt wird in die neuen Dateien migriert.

### Rule-Datei-Format

Jede Rule-Datei hat denselben Aufbau:

```markdown
---
name: <file-type>-rules
description: Authoring- und Validierungsregeln für <file-type>-Dateien
applies-to:
  - tasks/*.md
  - <weitere globs>
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

- Beim Authoring (z. B. `skill-creator` lädt `rules/task-files.md` vor dem Anlegen eines neuen Tasks) liest Claude die Prinzipien + Beispiele und versteht, was zu produzieren ist.
- Beim Validieren lädt `validate.md` dieselbe Datei, extrahiert die `## Checks`-Tabelle und wendet die Zeilen auf jede passende Datei an.

### `## Checks` — Format-Kontrakt

Die Tabelle wird vom Runner mechanisch gelesen (durch Claude als LLM-Runner, nicht durch einen Parser). Damit das zuverlässig funktioniert, gilt ein verbindlicher Kontrakt pro Rule-Datei:

- **Fester Spaltensatz in fester Reihenfolge:** `ID | Severity | What to verify | Where`.
- **Header case-sensitive** (exakt wie oben).
- **Keine zusätzlichen Spalten.** Wenn eine Regel längere Erklärung braucht, gehört das in das Narrativ im oberen Teil der Datei, nicht in eine neue Spalte.
- **Severity-Werte:** nur `error` oder `warning`. Kein `info`, kein `hint`.
- **`Where`-Werte:** nur `frontmatter`, `body`, oder `filename` (wo der Check am File greift).
- **Jede Datei hat genau eine `## Checks`-Tabelle** — kein Splitten über mehrere Abschnitte.

### `applies-to` als Dispatch-Schlüssel

Das `applies-to` Frontmatter ist eine Glob-Liste relativ zum zu validierenden Skill-Root. Beispiele:

| Rule-Datei | applies-to |
|---|---|
| `common-rules.md` | `tasks/*.md`, `**/tasks/*.md`, `blueprints/*.md`, `**/blueprints/*.md`, `rules/*.md`, `**/rules/*.md`, `**/schemas.yml`, `**/workflows/*.md` |
| `task-files.md` | `tasks/*.md`, `**/tasks/*.md` |
| `blueprint-files.md` | `blueprints/*.md`, `**/blueprints/*.md` |
| `rule-files.md` | `rules/*.md`, `**/rules/*.md` |
| `schema-files.md` | `schemas.yml`, `**/schemas.yml` |
| `workflow-files.md` | `workflows/*.md`, `**/workflows/*.md` |

Der Runner baut daraus das Dispatch-Mapping. Wenn `common-rules.md` und `task-files.md` beide auf `tasks/create-component.md` matchen, laufen beide Check-Sets.

### Check-IDs — Konvention und Eindeutigkeit

- **Präfix = File-Type in Großbuchstaben** (`TASK`, `BLUEPRINT`, `RULE`, `SCHEMA`, `WORKFLOW`, `COMMON`).
- **Counter = zweistellig**, innerhalb der Datei sequentiell (`TASK-01`, `TASK-02`, …).
- **IDs sind global eindeutig** über alle Rule-Dateien. `COMMON-*` ist per Konstruktion disjunkt von File-Type-spezifischen Checks — ein Check, der für mehrere File-Types gilt, lebt ausschließlich in `common-rules.md` als `COMMON-*`, nie parallel in Typ-Dateien.
- **Kein Überlappen** zwischen `TASK-*`, `BLUEPRINT-*` etc.: Wenn dieselbe Bedingung für Tasks und Blueprints geprüft werden muss, wird sie zu `COMMON-*` promoted.

### Identisches Prädikat über Typ-Dateien

In Ausnahmefällen ist dieselbe Prüflogik aus Authoring-Sicht sinnvoll in zwei Typ-Dateien zu haben (nicht in `common-rules.md`, weil die jeweilige Erklärung file-type-spezifisch ist). Beispiel:

- `TASK-09` — Property in `params:`/`result:` eines Tasks fehlen Teaching-Signale.
- `SCHEMA-02` — Property eines Top-Level-Typs in `schemas.yml` fehlen Teaching-Signale.

Das Prädikat ("Property hat weder `description`, `enum`, `pattern` noch `examples`") ist identisch, der Anwendungsort unterscheidet sich. **Invariante:** Wenn die Definition des Prädikats (was als "Teaching-Signal" zählt) sich ändert, müssen beide Checks gleichzeitig angepasst werden. Diese Invariante wird als Kommentar-Zeile über jedem der beiden Checks dokumentiert und im Runner-Abschnitt unter "Wartung" aufgeführt.

### `validate.md` als Runner

Neue Struktur der `validate.md`:

```markdown
# Skill Validator — Runner

## Prozess

1. Skill-Verzeichnis scannen (Dateien + schemas.yml).
2. Für jede Datei: alle Rule-Dateien in `.agents/skills/designbook-skill-creator/rules/` laden,
   deren `applies-to` Glob matcht.
3. Für jede geladene Rule-Datei: `## Checks`-Tabelle parsen, jede Zeile auf die Datei anwenden.
4. Findings, Metriken und Score-Berechnung anwenden (siehe unten).

## Runner-eigene Konzepte (KEINE Checks — verbleiben in validate.md)

- **Metrik-Definitionen** pro Datei: `lines`, `frontmatter_lines`, `body_lines`, `body_ratio`.
- **Schema-Audit-Metriken** pro Typ: `properties_total`, `properties_described`, `coverage`, `has_title_or_description`, `refs_out`, `refs_in`, `completeness`.
- **Schema-Graph**: `refs_in`/`refs_out` Kanten zwischen Schema-Typen.
- **Score-Berechnung**: Start 100, Error −20, Warning −10, `body_ratio > 0.8` bei Tasks −5, Minimum 0.
- **Output-Format**: Markdown-Tabellen mit Findings, Metrics, Schema Audit, Schema Graph, Summary.
- **Abgrenzung zu research.md**: Tabelle am Ende der Datei bleibt unverändert.

## Referenzen

- Task-Regeln: [rules/task-files.md](../rules/task-files.md)
- Blueprint-Regeln: [rules/blueprint-files.md](../rules/blueprint-files.md)
- Rule-Regeln: [rules/rule-files.md](../rules/rule-files.md)
- Schema-Regeln: [rules/schema-files.md](../rules/schema-files.md)
- Workflow-Regeln: [rules/workflow-files.md](../rules/workflow-files.md)
- Gemeinsame Regeln: [rules/common-rules.md](../rules/common-rules.md)

## Wartung

Checks mit identischem Prädikat in zwei Rule-Dateien (aktuell: `TASK-09` + `SCHEMA-02`)
werden zusammen angepasst. Die Prädikat-Definition steht jeweils als Kommentar-Zeile
über dem Check in beiden Dateien.
```

Keine Check-Tabelle mehr in `validate.md`. Metrik-Definitionen, Score-Berechnung, Output-Format, Schema-Graph und die Abgrenzung zu `research.md` bleiben erhalten — das sind Runner-Konzepte, nicht Regeln.

## Content-Migration — Inhaltliche Zuordnung

### `principles.md` → Ziel-Dateien

| Abschnitt in principles.md | Ziel-Datei |
|---|---|
| Tasks Say WHAT, Never HOW | `task-files.md` |
| Results Declare Schema, Not Just Paths | `task-files.md` |
| Tasks Declare Results in Schema, Not in Body | `task-files.md` |
| Schemas Must Teach the AI | `schema-files.md` |
| Blueprints Are Overridable Starting Points | `blueprint-files.md` |
| Rules Are Hard Constraints | `rule-files.md` |
| Rules Never Declare `params:` | `rule-files.md` |
| Concrete Implementations Belong in Blueprints | `task-files.md` + `blueprint-files.md` + `rule-files.md` (gespiegelt, siehe unten) |
| Skills Are Site-Agnostic | `common-rules.md` |
| Stages Flush After Completion | `task-files.md` |
| Workflow Steps Are Plain Names | `workflow-files.md` |
| Stage = Filename, No Duplication | `task-files.md` |
| Validation Is Automatic | `task-files.md` |

**Zur dreifachen Zuordnung von "Concrete Implementations Belong in Blueprints":**
Dieses Prinzip ist das einzige, dessen Aussage aus Sicht aller drei File-Types relevant ist (ein Task-Author muss wissen: kein konkreter Code im Task; ein Rule-Author muss wissen: kein konkreter Code in der Rule; ein Blueprint-Author muss wissen: hier gehört konkreter Code hin). Die Migration spiegelt den Kerntext in allen drei Dateien mit file-type-spezifischer Perspektive. Die daraus abgeleiteten Checks `TASK-06` (body enthält keine HOW) und `BLUEPRINT-02` (body enthält Implementierungsdetails — hier ist das ok, aber markerzeilen für Agnostic-Check) bleiben file-type-spezifisch.

### `structure.md` → Ziel-Dateien

| Abschnitt in structure.md | Ziel-Datei |
|---|---|
| Integration Skills Layout | `common-rules.md` (Skill-Root-Struktur) |
| Core Skill Layout | `common-rules.md` |
| `schemas.yml` — Schema Definitions | `schema-files.md` |
| `tasks/` — Naming Rule (Dateiname = Stage) | `task-files.md` |
| `tasks/` — Workflow-qualified tasks (`<step>--<workflow>.md`) | `task-files.md` (eigene Unterüberschrift, siehe unten) |
| `rules/` — Trigger + Filter Matching | `rule-files.md` |
| `rules/` — Consumer Semantics (domain) | `rule-files.md` |
| `rules/` — Strict Trigger Matching | `rule-files.md` |
| `rules/` — Domain Subcontexts | `rule-files.md` |
| `rules/` — Provider Rules (Legacy) | `rule-files.md` |
| `rules/` — Schema Extension Fields (extends/provides/constrains) | `rule-files.md` + `blueprint-files.md` |
| `blueprints/` — Trigger + Filter Matching | `blueprint-files.md` |
| `SKILL.md` — Index Only | `common-rules.md` |
| Naming Conventions | `common-rules.md` |

### Workflow-qualified tasks — eigene Unterüberschrift in `task-files.md`

Der Abschnitt "Workflow-qualified tasks" in `structure.md` (Zeilen 52–67) enthält eine harte Regel, die **nur für Task-Dateien mit `--` im Dateinamen** gilt: `trigger.steps:` muss den voll qualifizierten Step-Namen inkl. Workflow-Prefix tragen. Bei der Migration:

- Eigener Abschnitt `### Workflow-qualified tasks` in `task-files.md`.
- Einleitender Satz: "Dieser Abschnitt gilt nur für Task-Dateien, deren Dateiname `--` enthält (z. B. `intake--design-verify.md`). Nicht-qualifizierte Task-Dateien ignorieren diesen Abschnitt."
- Zugehöriger Check `TASK-02` in der Checks-Tabelle trägt denselben Scope-Hinweis in der `Where`-Spalte (`filename`, scope: "filename contains `--`").

### `validate-params.md` → `task-files.md`

Alle fünf Checks (hardcoded paths, missing params, missing `$ref`, redundant body references, flat map format) sind task-spezifisch und wandern in die `## Checks` Tabelle von `task-files.md`.

### Check-ID-Mapping (alt → neu)

Vollständige Umnummerierung. Die Migration ist disposable (keine Altlasten), daher einmalige komplette Neunummerierung nach File-Type:

| Alt | Regel | Neu |
|---|---|---|
| E01 | Frontmatter fehlt/ungültig | `COMMON-01` |
| E02 | Pflichtfelder fehlen (when, result) | `TASK-01` |
| E03 | `$ref` zeigt ins Leere | `SCHEMA-01` |
| E04 | `trigger.steps` referenziert unbekannten Step | `TASK-02` (scope: filename contains `--`) |
| E05 | `stage:` in Frontmatter | `TASK-03` |
| E06 | `constrains:` in Blueprint | `BLUEPRINT-01` |
| E07 | Inline schema duplicates `schemas.yml` type | `TASK-04` |
| W01 | Body wiederholt Result-Schema | `TASK-05` |
| W02 | HOW statt WHAT | `TASK-06` |
| W03 | Site-specific content in core | `COMMON-02` |
| W04 | Cross-Layer-Duplikat | `TASK-07` |
| W05 | Validation steps in body | `TASK-08` |
| W06 | Workflow-Prefix in Workflow-Definition | `WORKFLOW-01` |
| W07 | Property lacks teaching signals (Task-params/result) | `TASK-09` |
| W07 | Property lacks teaching signals (schemas.yml types) | `SCHEMA-02` |
| W08 | Type missing title/description | `SCHEMA-03` |
| W09 | `additionalProperties: true` undokumentiert | `SCHEMA-04` |
| — | validate-params.md #1 (hardcoded paths) | `TASK-10` |
| — | validate-params.md #2 (missing param) | `TASK-11` |
| — | validate-params.md #3 (missing `$ref`) | `TASK-12` |
| — | validate-params.md #4 (redundant body) | `TASK-13` |
| — | validate-params.md #5 (flat map format) | `TASK-14` |

## SKILL.md Anpassung

Die "Key Principles" und "File Structure Conventions" Abschnitte in `SKILL.md` verweisen heute auf `principles.md` und `structure.md`. Nach der Migration wird dieser Abschnitt wie folgt aufgebaut:

```markdown
## Rule Files by Artifact Type

Load the matching rule file **before** creating or editing any file of that type.
Common rules apply on top in every case.

| Creating/editing | Load |
|---|---|
| `tasks/*.md` | [rules/common-rules.md](rules/common-rules.md) + [rules/task-files.md](rules/task-files.md) |
| `blueprints/*.md` | [rules/common-rules.md](rules/common-rules.md) + [rules/blueprint-files.md](rules/blueprint-files.md) |
| `rules/*.md` | [rules/common-rules.md](rules/common-rules.md) + [rules/rule-files.md](rules/rule-files.md) |
| `schemas.yml` | [rules/common-rules.md](rules/common-rules.md) + [rules/schema-files.md](rules/schema-files.md) |
| `workflows/*.md` | [rules/common-rules.md](rules/common-rules.md) + [rules/workflow-files.md](rules/workflow-files.md) |

## Validation

See [resources/validate.md](resources/validate.md) for the static validator runner.
The runner dispatches to the same rule files via `applies-to` globs — the rules
above are the single source of truth for both authoring and validation.
```

Die SKILL.md-Frontmatter-`description` wird aktualisiert, um die neuen Rule-Dateien zu benennen statt "the 4-level model… tasks say WHAT not HOW, rules never declare params:, schema \$ref conventions".

## Nicht im Scope

- Änderungen am Runtime-Verhalten des Workflow-Engine oder der Rule-Loading-Logik im Addon.
- Andere Review-Punkte aus `review.md` (CSS, Image Styles, Extract-Reference, Capture, CLI-Workflow — jeweils eigene Change).
- Neue Checks hinzufügen. Die Migration ist 1:1 inhaltlich identisch (Ausnahme: W07 wird sauber gesplittet in TASK-09 + SCHEMA-02, siehe oben).
- Automatisches Fixen von Findings. Das bleibt wie bisher Aufgabe der Nutzer/Agenten.

## Erfolgs-Kriterien

1. Nach der Migration existieren nur noch die sechs neuen Rule-Dateien in `rules/` (`common-rules.md`, `task-files.md`, `blueprint-files.md`, `rule-files.md`, `schema-files.md`, `workflow-files.md`). `principles.md`, `structure.md`, `validate-params.md` sind entfernt.
2. `validate.md` enthält keine `## Errors`, `## Warnings` oder `## Checks` Tabelle mehr. Verbleiben: Runner-Prozess, Metrik-Definitionen, Schema-Audit-Metriken, Schema-Graph, Score-Berechnung, Output-Format, Referenz-Links zu den Rule-Dateien, Abgrenzung zu `research.md`, Wartungs-Hinweis zu Prädikat-Duplikaten.
3. Validator auf den bestehenden Skills (`designbook`, `designbook-drupal`, `designbook-css-tailwind`, `designbook-stitch`, `designbook-devtools`, `designbook-skill-creator` selbst) produziert dieselben Findings wie vorher, nur mit neuen IDs gemäß Mapping-Tabelle.
4. Beim Anlegen eines neuen Tasks lädt der skill-creator **nur** `rules/task-files.md` + `rules/common-rules.md` — nicht mehr `principles.md` + `structure.md` pauschal.
5. Alle `## Checks`-Tabellen folgen dem Format-Kontrakt (`ID | Severity | What to verify | Where`, `error`/`warning`, `frontmatter`/`body`/`filename`).
6. Check-IDs sind global eindeutig; `COMMON-*` überlappen nicht mit file-type-spezifischen Checks.
7. `SKILL.md` verweist auf die neuen Rule-Dateien mit einer Tabelle pro Artefakt-Typ.

## Offene Punkte

Keine. Alle Design-Entscheidungen (Scope = B+A, Granularität = per-file-type ohne shared.md, Format = Narrativ + Checks-Tabelle, Naming = `*-files.md` Suffix, Format-Kontrakt, ID-Eindeutigkeit) sind im Brainstorming + Codex-Review bestätigt.
