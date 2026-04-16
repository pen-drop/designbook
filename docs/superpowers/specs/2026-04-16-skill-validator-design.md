# Design: Skill Validator im designbook-skill-creator

## Summary

Eine neue Resource `validate.md` im `designbook-skill-creator` Skill, die eine statische Analyse aller Task-, Rule- und Blueprint-Dateien eines Skills durchführt — ohne Workflow-Ausführung. Der Agent liest die Dateien, prüft sie gegen die bestehenden Regeln in `principles.md` und `structure.md`, und gibt einen strukturierten Report mit Findings und Metriken aus.

Pendant zu `research.md` (Runtime-Audit), aber rein statisch auf Dateiebene.

## Einordnung

```
designbook-skill-creator/
├── resources/
│   ├── research.md        ← Runtime-Audit (existiert)
│   ├── validate.md        ← Statische Analyse (NEU)
│   ├── schemas.md
│   ├── schema-composition.md
│   └── skill-map.md
├── rules/
│   ├── principles.md      ← Prüfregeln-Quelle
│   └── structure.md       ← Struktur-Regeln-Quelle
└── SKILL.md
```

## Aufruf

Manuell durch den Benutzer, z.B.: "Validiere den designbook-drupal Skill" oder "Prüfe alle Skills". Der Agent lädt die `validate.md` Resource, scannt den angegebenen Skill, und gibt den Report aus.

## Prüfregeln

Alle Regeln leiten sich aus `principles.md` und `structure.md` ab. Keine neuen Erfindungen.

### Errors (Regelverletzung)

| ID | Regel | Quelle | Prüfung |
|---|---|---|---|
| `E01` | Frontmatter fehlt/ungültig | structure.md | YAML-Frontmatter muss parsebar sein |
| `E02` | Pflichtfelder fehlen | structure.md | Tasks brauchen `when`; Tasks mit Outputs brauchen `result:` |
| `E03` | `$ref` zeigt ins Leere | principles.md (Results Declare Schema) | Jeder `$ref` in `schemas.yml` muss auf existierenden Key zeigen |
| `E04` | `when.steps` referenziert unbekannten Step | structure.md (Naming Rule) | Step-Name muss in einem Workflow existieren |
| `E05` | `stage:` in Frontmatter | principles.md (Stage = Filename) | Redundant, darf nicht existieren |
| `E06` | `constrains:` in Blueprint | structure.md (Schema Extension) | Nur Rules dürfen `constrains:` nutzen |

### Warnings (Prinzipien-Abweichung)

| ID | Regel | Quelle | Prüfung |
|---|---|---|---|
| `W01` | Body wiederholt Result-Schema | principles.md (Results in Schema, Not in Body) | `## Result:` Section vorhanden + Schema ist selbsterklärend (einfacher Typ ohne semantische Mehrdeutigkeit) |
| `W02` | Task enthält HOW statt WHAT | principles.md (Tasks Say WHAT) | Body enthält Implementierungsdetails: CSS-Klassen, Twig-Code, Framework-spezifische Syntax, Style-Anweisungen |
| `W03` | Site-spezifischer Inhalt in Core-Skill | principles.md (Site-Agnostic) | Hardcoded Markennamen, URLs, projektspezifische Referenzen in `designbook/` |
| `W04` | Cross-Layer-Duplikat | research.md (3d) | Task-Body wiederholt was eine geladene Rule bereits erzwingt |
| `W05` | Validierungsschritte im Body | principles.md (Validation Is Automatic) | Body beschreibt manuelle Validierung die der Engine automatisch macht |
| `W06` | Workflow-Prefix in Workflow-Definition | principles.md (Workflow Steps Are Plain Names) | `stages.*.steps` enthält qualifizierte Namen |

### Metriken (pro Datei)

| Metrik | Beschreibung |
|---|---|
| `lines` | Gesamtzeilen |
| `frontmatter_lines` | Zeilen im YAML-Frontmatter |
| `body_lines` | Zeilen im Markdown-Body |
| `body_ratio` | body_lines / lines (0.0–1.0) |

### Score-Berechnung

Pro Datei: Start bei 100.

| Finding | Abzug |
|---|---|
| Error | −20 |
| Warning | −10 |
| body_ratio > 0.8 bei Tasks | −5 |

Minimum: 0. Skill-Score = Durchschnitt aller Datei-Scores.

## Output-Format

Der Agent gibt den Report als Markdown-Tabelle aus (wie `research.md`):

```
## Skill: designbook-drupal — Score: 78/100

### Findings

| Datei | Typ | ID | Severity | Beschreibung |
|---|---|---|---|---|
| tasks/create-component.md | task | W02 | warning | Body enthält Twig-Code (Zeile 45-60) |
| tasks/intake--design-component.md | task | W01 | warning | `## Result: component` redundant — Schema via $ref selbsterklärend |

### Metriken

| Datei | Typ | Lines | Body | Ratio | Score |
|---|---|---|---|---|---|
| tasks/create-component.md | task | 116 | 89 | 0.77 | 70 |
| tasks/intake--design-component.md | task | 163 | 130 | 0.80 | 75 |
| rules/sdc-conventions.md | rule | 45 | 38 | 0.84 | 100 |
| blueprints/header.md | blueprint | 30 | 22 | 0.73 | 100 |

### Zusammenfassung

| Metrik | Wert |
|---|---|
| Dateien gesamt | 12 |
| Errors | 0 |
| Warnings | 3 |
| Ø Body-Ratio | 0.72 |
| Skill-Score | 78/100 |
```

## Abgrenzung zu research.md

| | validate.md (NEU) | research.md (existiert) |
|---|---|---|
| Wann | Jederzeit, ohne Workflow | Nach Workflow-Ausführung |
| Input | Skill-Verzeichnis scannen | `workflows/archive/*/tasks.yml` |
| Prüft | Dateistruktur, Frontmatter, Body-Redundanz, Prinzipien | Typ-Korrektheit, Domain, Loading, Duplikation, Kohärenz |
| Fokus | Sind die Dateien richtig aufgebaut? | Hat der Workflow die richtigen Dateien geladen? |
| Output | Findings + Metriken + Score | Audit-Tabelle + Superpowers-Fix-Workflow |

## Nicht im Scope

- CLI-Integration (kommt in Phase 2 mit besserem Logging)
- Automatisches Fixen (der Agent kann basierend auf Findings manuell fixen)
- Runtime-Metriken (bleibt bei research.md)
