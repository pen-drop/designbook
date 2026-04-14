# Design Spec: designbook-skill-creator — Params, Results & JSON Schema Support

## Problem

Der `designbook-skill-creator` Skill dokumentiert die 4-Level-Architektur (Workflow, Stage, Task, Blueprint, Rule), kennt aber die neue schema-getriebene params/results-Logik nicht. Skill-Autoren haben keine Anleitung wie sie:

- `result:` statt `files:` deklarieren
- `schemas.yml` anlegen und via `$ref` referenzieren
- `extends:`/`provides:`/`constrains:` in Blueprints/Rules nutzen
- Result-Semantik im Task-Body kommunizieren

Zusätzlich basiert `resources/research.md` auf einem eigenständigen Prozess mit OpenSpec-Referenzen, statt auf Superpowers-Skills aufzubauen.

## Scope

Update des `designbook-skill-creator` Skills. Keine Code-Änderungen am Addon oder der Engine.

### Dateien

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `rules/principles.md` | Update | `files:` → `result:`, neue Prinzipien für Schema-basierte Results |
| `rules/structure.md` | Update | `schemas.yml` als Dateityp, Schema-Extension-Felder in Rule/Blueprint-Konventionen |
| `resources/schemas.md` | Neu | schemas.yml Format-Referenz, `$ref`-Syntax, `## Result: <key>` Konvention |
| `resources/schema-composition.md` | Neu | Deep-Dive: Merge-Modell, 3 Operationen, Phasenfolge |
| `resources/research.md` | Rewrite | Superpowers-basiert, OpenSpec entfernt |
| `SKILL.md` | Update | Links und Beschreibungen anpassen |

## Design

### 1. `rules/principles.md` — Änderungen

#### 1a. "Tasks Say WHAT" Beispiel aktualisieren

Das `files:`-Beispiel wird durch `result:` mit typisierten Deklarationen ersetzt:

```yaml
# Correct
params:
  component: { type: string }
result:
  component-yml:
    path: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.component.yml
    validators: [data]
```

```yaml
# Wrong — implementation details in task
params:
  component: { type: string }
---
Use snake_case for the component name. Create the YAML file with these required fields: ...
```

#### 1b. Neues Prinzip: "Results deklarieren Schema, nicht nur Pfade"

Zwei Arten von Results:

- **File results** (mit `path:`) — Dateien die geschrieben werden. Pfad-Template mit `$ENV` und `{{ param }}`. Optionale `validators:` und JSON-Schema-Typ.
- **Data results** (ohne `path:`) — Strukturierte Daten die via `--data` zurückgegeben werden. JSON-Schema-Typ (inline oder `$ref`).

Beide können `$ref` auf `schemas.yml` nutzen. Das Schema im Frontmatter ist die Quelle der Wahrheit — die Engine validiert automatisch.

#### 1c. Neues Prinzip: "Tasks deklarieren Results im Schema, nicht im Body"

Das `result:`-Schema im Frontmatter definiert Form und Typ aller Outputs. Der Task-Body erklärt nie *wie* Results zurückgegeben werden (file schreiben vs. `--data`), darf aber erklären *was* inhaltlich in ein Result gehört, wenn die Semantik nicht aus dem Schema-Typ allein ersichtlich ist.

Einheitliche Markup-Konvention: `## Result: <key>` Abschnitte im Task-Body für Results die semantische Erklärung brauchen. Keys deren Schema selbsterklärend ist, brauchen keinen Abschnitt.

#### 1d. "Stages Flush After Completion" aktualisieren

`files:`-Referenzen → `result:`-Referenzen. Beispiel:

```yaml
# Stage A — produces file result
result:
  component-yml:
    path: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.component.yml

# Stage B — reads flushed output from Stage A
reads:
  - path: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.component.yml
```

#### 1e. "Validation Is Automatic" erweitern

Ergänzen um `validators:` Feld — semantische Validierung neben Schema-Validierung. Verfügbare Validators: `data`, `entity-mapping`, `scene`, `image`, `cmd:<command>`.

### 2. `rules/structure.md` — Änderungen

#### 2a. Dateibaum aktualisieren

`*.schema.json` → `schemas.yml` in beiden Strukturen:

```
# Integration (flat)
.agents/skills/[skill-name]/
├── SKILL.md
├── tasks/
├── rules/
├── blueprints/
├── resources/
└── schemas.yml          # Reusable JSON Schema definitions (PascalCase keys)

# Core (concern-based)
.agents/skills/designbook/
├── SKILL.md
├── resources/
└── <concern>/
    ├── tasks/
    ├── rules/
    ├── resources/
    ├── workflows/
    └── schemas.yml      # Concern-level schema definitions
```

#### 2b. Neuer Abschnitt: `schemas.yml`

Kurzer Verweis: wo die Datei liegt, wozu sie dient, Link zu `resources/schemas.md` für Details.

#### 2c. `rules/` Abschnitt erweitern — Schema-Extension-Felder

Neben `when:` und `provides: <param>` (Provider Rules) auch die Schema-Extension-Felder:

- `extends:` — Neue Properties zum Result-Schema hinzufügen. Fehler bei Duplikaten. Erlaubt in Rules und Blueprints.
- `provides:` (Schema-Form) — Default-Werte für bestehende Properties setzen. Last writer wins. Erlaubt in Rules und Blueprints.
- `constrains:` — Enum-Werte einschränken (Intersection). **Nur Rules** — Blueprints dürfen `constrains:` nicht verwenden.

Hinweis: `provides: <param>` (String, Provider Rule) vs. `provides:` (Object, Schema-Defaults) sind verschiedene Konzepte.

#### 2d. `blueprints/` Abschnitt erweitern

`extends:` und `provides:` erlaubt, `constrains:` explizit verboten. Verweis auf `resources/schema-composition.md` für Details.

### 3. `resources/schemas.md` — Neue Datei

#### 3a. Zweck

Wiederverwendbare JSON-Schema-Definitionen, referenziert via `$ref` aus Task/Rule/Blueprint-Frontmatter.

#### 3b. Platzierung

- Core Skill: `<concern>/schemas.yml` (pro Concern-Verzeichnis)
- Integration Skills: `schemas.yml` im Skill-Root

#### 3c. Format-Konventionen

- Keys sind PascalCase (`Component`, `Issue`)
- Values sind standard JSON Schema (draft-07)
- Keine Verschachtelung der Top-Level-Keys — jeder Key ist ein eigenständiger Typ

Beispiel:
```yaml
Component:
  type: object
  required: [component, group]
  properties:
    component: { type: string }
    slots:
      type: array
      items: { type: string }
      default: []
    group: { type: string }
```

#### 3d. `$ref`-Syntax

```yaml
$ref: ../schemas.yml#/TypeName                              # relativ zur Datei
$ref: designbook-drupal/components/schemas.yml#/ComponentYml # cross-skill
```

- Pfad relativ zur referenzierenden Datei
- Fragment (`#/TypeName`) selektiert den PascalCase Key
- Aufgelöst und inlined bei `workflow create` — unauflösbare Referenzen = Hard Error

#### 3e. `$ref` in `params:`

Top-Level `$ref` löst Schema-Properties als Param-Deklarationen auf. Explizite Einträge überschreiben/erweitern:

```yaml
params:
  $ref: ../schemas.yml#/Section       # Section.properties → params
  order: { type: integer, default: 1 } # override: Default hinzufügen
  scene: { type: string }              # extend: neuer Param
```

Muss auf ein Object-Schema mit `properties` zeigen.

#### 3f. Task-Body Konvention: `## Result: <key>`

Einheitliche Markup-Struktur im Task-Body für Result-Erklärungen:

- Jeder Result-Key der semantische Erklärung braucht, bekommt `## Result: <key>`
- Erklärt *was* inhaltlich reingehört, nie *wie* es zurückgegeben wird
- Keys deren Schema selbsterklärend ist, brauchen keinen Abschnitt

Beispiel eines vollständigen Tasks:

```markdown
---
params:
  scene: { type: string }
result:
  issues:
    type: array
    items:
      $ref: ../schemas.yml#/Issue
  scene:
    type: string
---
# Compare Screenshots

Compare each screenshot against its design reference.

## Result: issues

Sammle alle visuellen Abweichungen zwischen Screenshot und Referenz.
Jedes Issue braucht eine `severity`:
- `critical` — Layout gebrochen, Inhalt fehlt
- `major` — Deutlich sichtbare Abweichung
- `minor` — Kosmetisch, nur bei genauem Hinsehen erkennbar
```

(Kein `## Result: scene` nötig — der Schema-Typ `string` ist selbsterklärend.)

### 4. `resources/schema-composition.md` — Neue Datei

#### 4a. Konzept

Ein Task-Result-Schema ist nie nur das was im Task steht. Die Engine merged Beiträge aus Tasks, Blueprints und Rules zu einem finalen Schema.

#### 4b. Die drei Operationen

| Operation | Wirkung | Erlaubt in |
|-----------|---------|------------|
| `extends:` | Neue Properties hinzufügen (Fehler bei Duplikaten) | Blueprint, Rule |
| `provides:` | Default-Werte setzen (last writer wins) | Blueprint, Rule |
| `constrains:` | Enum-Werte einschränken (Intersection) | Nur Rule |

#### 4c. Syntax

```yaml
# In Blueprint- oder Rule-Frontmatter:
extends:
  result-key:
    properties:
      newField: { type: string }

provides:
  result-key:
    properties:
      existingField:
        default: "value"

constrains:        # nur Rules!
  result-key:
    properties:
      status:
        enum: [active, inactive]
```

`$ref` ist innerhalb von `extends:`/`provides:`/`constrains:` erlaubt.

#### 4d. Merge-Reihenfolge

```
1. Base Task Schema (result: im Task-Frontmatter)
2. Blueprint extends: — neue Properties
3. Rule extends: — neue Properties
4. Blueprint provides: — Defaults setzen
5. Rule provides: — Defaults setzen (überschreibt Blueprint-Defaults)
6. Rule constrains: — Enum-Werte einschränken
```

Blueprints erweitern zuerst, dann Rules — damit Rules die endgültige Kontrolle haben. `constrains:` kommt zuletzt, weil es bestehende Werte einschränkt (nicht hinzufügt).

#### 4e. Konkretes Beispiel

Ein Task definiert ein Result-Schema für `design-tokens`. Eine Blueprint erweitert es mit Stitch-spezifischen Properties. Eine Rule schränkt erlaubte Renderer-Hints ein. Das Ergebnis: ein merged Schema das alle drei Beiträge enthält.

### 5. `resources/research.md` — Rewrite

#### 5a. Konzept

Research = Post-Workflow-Review. Der Workflow läuft normal, danach wird systematisch geprüft ob Skill-Dateien korrekt sind.

#### 5b. Prozess

1. **Workflow normal ausführen**
2. **Audit-Checkliste durchgehen** (Designbook-spezifisch):
   - Type correctness — Task/Rule/Blueprint halten ihre Typgrenzen ein
   - Domain responsibility — Core vs. Integration, keine Grenzüberschreitungen
   - Loading correctness — Alle relevanten Rules geladen, keine falschen
   - Duplication — Keine doppelte Logik über Dateien/Layer/Skills
   - Content coherence — Referenzen aktuell, keine veralteten Step-Namen
3. **Ergebnisse mit User reviewen**
4. **Fixes planen** — `superpowers:brainstorming` für Analyse und Design
5. **Fixes implementieren** — `superpowers:writing-plans` → `superpowers:executing-plans`
6. **Verifikation** — Test-Workspace neu aufsetzen (`./scripts/setup-workspace.sh`), Workflow erneut laufen, `superpowers:verification-before-completion` nutzen, zero friction bestätigen

#### 5c. Audit-Tabelle

Format bleibt wie bisher:

```
| File | Type | Domain | Issues |
|------|------|--------|--------|
| intake--tokens.md | task | core | ... |
```

#### 5d. Kein OpenSpec

Alle OpenSpec-Referenzen entfernt. Multi-File-Fixes laufen über Superpowers writing-plans → executing-plans.

### 6. `SKILL.md` — Änderungen

#### 6a. Key Principles

Neuer Bullet-Point: "Results deklarieren Schema, nicht nur Pfade — file results mit `path:`, data results mit JSON Schema"

#### 6b. Neue Links

```markdown
## Schema Reference
See [`resources/schemas.md`](resources/schemas.md) for schemas.yml format and result conventions.
See [`resources/schema-composition.md`](resources/schema-composition.md) for the merge model deep-dive.
```

#### 6c. Research Flag

Beschreibung aktualisieren: Superpowers-basierter Post-Workflow-Review statt eigenständiger Prozess.

## Entscheidungen

- `files:` wird komplett durch `result:` ersetzt — kein Legacy-Hinweis
- `schemas.yml` bekommt eigene Resource-Datei (nicht in `structure.md` integriert)
- Schema-Komposition: Interface-Level in `structure.md`, Deep-Dive in separater Resource
- `## Result: <key>` als einheitliche Markup-Konvention im Task-Body
- OpenSpec komplett entfernt, ersetzt durch Superpowers
- Audit-Checkliste (5 Checks) bleibt — ist Designbook-spezifisch und wertvoll

## Nicht im Scope

- Bestehende Task-Dateien in anderen Skills auf `## Result: <key>` migrieren (separater Change)
- `skill-map.md` ändern (keine neuen Skills)
- Engine/Addon-Code ändern
