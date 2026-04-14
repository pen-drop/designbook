# Unify Design Workflows

Vereinheitlichung der design-screen, design-shell, design-component und design-verify Workflows mit maximaler Task-Wiederverwendung.

## Motivation

Die aktuellen Design-Workflows (design-screen, design-shell, design-component) haben erhebliche Duplikation: Reference-Extraktion ist in jeden Intake eingebettet, Scene-Erstellung existiert als zwei fast identische Tasks, und design-component hat eine inline Test-Stage die design-verify dupliziert. Ausserdem plant der Screen-Intake mehrere Scenes gleichzeitig, was die Komplexitaet unnoetig erhoeht.

## Design-Prinzipien

1. **Struktur zuerst aus Reference** -- der Workflow analysiert Screenshot/Markup und extrahiert daraus die Komponentenstruktur, statt spekulativ zu planen
2. **Eine Scene pro Durchlauf** -- reduziert Komplexitaet, jeder Workflow-Run baut genau eine Scene
3. **Maximale Task-Wiederverwendung** -- jeder Task existiert einmal, Workflows komponieren ueber `when.steps` und Params
4. **Zentrale Schemas** -- alle Datenstrukturen in `schemas.yml`, Tasks referenzieren per `$ref`
5. **`$ref` in params** -- wenn ein Task `each:` mit Schema-Referenz nutzt, sollen `params:` das gleiche Schema per `$ref` referenzieren statt Properties zu duplizieren

## Workflow-Definitionen

### design-component

```
reference → intake → component
after: design-verify(component=X)
```

### design-shell

```
reference → intake → component → scene
after: design-verify(scene=design-system:shell)
```

### design-screen

```
reference → intake → component → sample-data → entity-mapping → scene
after: design-verify(scene=<section>:<screen>)
```

### design-verify

```
reference → intake → setup-compare → capture → compare → triage → polish → outtake
```

Funktioniert sowohl fuer Components als auch fuer Scenes.

## Task-Inventar

### Gemeinsame Tasks

| Task | Genutzt in | Beschreibung |
|------|-----------|--------------|
| `extract-reference` | alle 4 Workflows | Reference-URL aus vision.md aufloesen, User bestaetigen lassen, Struktur extrahieren |
| `create-component` | design-component, design-shell, design-screen | Iteriert ueber `component[]`, baut Komponentendateien |
| `create-scene` | design-shell, design-screen | Baut Scene-YAML, Output-Pfad per Param |
| `setup-compare` | design-verify | Story + Checks erzeugen |
| `capture-reference` | design-verify | Reference-Screenshots pro Check |
| `compare-screenshots` | design-verify | Visueller Vergleich pro Check |
| `triage` | design-verify | Issues konsolidieren |
| `polish` | design-verify | Einzelne Issues fixen |
| `outtake` | design-verify | Ergebnis-Summary |

### Workflow-spezifische Tasks (nur Intakes)

| Task | Workflow |
|------|----------|
| `intake--design-component` | design-component |
| `intake--design-shell` | design-shell |
| `intake--design-screen` | design-screen |
| `intake--design-verify` | design-verify |

## Neuer Task: `extract-reference`

Eigenstaendiger Task als erste Stage in allen Workflows. Ersetzt die bisherige Resource `extract-reference.md` und die eingebetteten Reference-Steps in den Intakes.

### Frontmatter

```yaml
when:
  steps: [extract-reference]
params:
  scene: { type: string }      # optional
  component: { type: string }  # optional
reads:
  - path: $DESIGNBOOK_DATA/vision.md
  - path: $STORY_DIR/design-reference.md
    optional: true
```

Einer von beiden Params muss gesetzt sein. `$STORY_DIR` wird per CLI aufgeloest: `_debo story --scene <id>` oder `_debo story --component <id>`.

### Results

```yaml
result:
  design-reference:
    path: $STORY_DIR/design-reference.md
  reference:
    type: array
    items:
      $ref: ../schemas.yml#/Reference
  screenshot:
    path: $STORY_DIR/reference-full.png
```

### Ablauf

1. **$STORY_DIR aufloesen** -- per CLI mit dem gesetzten Param
2. **Reuse-Check** -- wenn `$STORY_DIR/design-reference.md` existiert: User zeigen und fragen ob verwenden oder neu extrahieren
3. **Reference-URL finden** -- `vision.md` lesen, dem User zeigen: "In der Vision ist `<url>` als Reference hinterlegt. Ist das die richtige Reference, oder moechtest du eine andere URL/Screenshot verwenden?"
4. **Struktur extrahieren** -- Playwright/Screenshot/Vision je nach Capability (bestehende extract-reference Resource-Logik)
5. **Results schreiben** -- `design-reference.md`, `reference-full.png`, `reference[]` Array

### Wiederverwendung in design-verify

Wenn ein Build-Workflow vorher gelaufen ist, existiert `design-reference.md` bereits im `$STORY_DIR`. Der Verify-Intake liest es und ueberspringt die Reference-Frage.

## Vereinheitlichter `create-scene` Task

Ersetzt `create-scene--design-shell` und `create-scene--design-screen`.

### Frontmatter

```yaml
when:
  steps: [create-scene]
params:
  output_path: { type: string }
  scene: { type: string }
  section_id: { type: string }      # optional, nur Screen
  section_title: { type: string }   # optional, nur Screen
  reference: { type: array, default: [] }
```

### Result

```yaml
result:
  scene-file:
    path: "{{ output_path }}"
    validators: [scene]
```

### Reads

```yaml
reads:
  - path: $DESIGNBOOK_DIRS_COMPONENTS
  - path: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
    optional: true
  - path: $STORY_DIR/design-reference.md
    optional: true
  - path: $DESIGNBOOK_DATA/data-model.yml
    optional: true
```

### Unterschiede ueber Rules

**Shell-spezifisch** -- Rule `shell-scene-constraints.md` mit `when: steps: [design-shell:create-scene]`:
- Root-Komponente MUSS genau einen `$content`-Slot haben
- Alle Sub-Komponenten-Slots muessen inline expandiert werden
- `group: "Designbook/Design System"`

**Screen-spezifisch** -- Rule `screen-scene-constraints.md` mit `when: steps: [design-screen:create-scene]`:
- Scene MUSS mit `scene: design-system:<shell>` starten und `content` fuellen
- Entity-Nodes erlaubt (`entity:`, `view_mode:`)
- `group: "Designbook/Sections/{{ section_title }}"`

## Schema-Erweiterungen

Neues Schema in `schemas.yml`:

```yaml
EntityMapping:
  type: object
  required: [entity_type, bundle, view_mode]
  properties:
    entity_type: { type: string }
    bundle: { type: string }
    view_mode: { type: string }
```

Bestehende Schemas bleiben unveraendert: `Component`, `Scene`, `Reference`, `Check`, `Issue`.

## `$ref` in params -- Konsistenz mit `each`

Alle Tasks die `each:` mit Schema-Referenz nutzen, stellen `params:` auf den gleichen `$ref` um:

| Task | `each` Key | `params.$ref` |
|------|-----------|---------------|
| `create-component` | `component` | `../schemas.yml#/Component` |
| `map-entity` | `entity_mappings` | `../schemas.yml#/EntityMapping` |
| `polish` | `issues` | `../schemas.yml#/Issue` |
| `capture-reference` | `checks` | `../schemas.yml#/Check` |
| `compare-screenshots` | `checks` | `../schemas.yml#/Check` |

Task-spezifische Ergaenzungen (z.B. `design_hint`) koennen als explizite Siblings den `$ref` erweitern.

## Intake-Aenderungen

Alle drei Build-Intakes werden schlanker weil `extract-reference` vorgelagert ist. Sie lesen `design-reference.md` und leiten daraus Vorschlaege ab.

### `intake--design-component`

**Results:**
```yaml
result:
  component:
    type: array
    items:
      $ref: ../schemas.yml#/Component
```

**Ablauf:**
1. Lese `design-reference.md` -- leite Komponenten-Struktur ab (Slots, Props, Variants)
2. Praesentiere dem User zur Bestaetigung
3. Falls keine Reference: Quick-Description oder Step-by-Step
4. Result: `component[]` (1 Item)

### `intake--design-shell`

**Results:**
```yaml
result:
  component:
    type: array
    items:
      $ref: ../schemas.yml#/Component
  output_path:
    type: string
```

**Ablauf:**
1. Lese `design-reference.md` -- leite Layout-Pattern ab
2. Praesentiere Layout-Vorschlag (oder frage bei fehlender Reference)
3. Plane Komponenten (page, header, footer, nav) + Embed-Dependencies
4. Sammle Shell-Details (Nav-Items, Footer, Responsive)
5. Structure Preview (ASCII-Tree)
6. Result: `component[]` + `output_path`

`output_path` wird auf `$DESIGNBOOK_DATA/design-system/design-system.scenes.yml` gesetzt.

### `intake--design-screen`

**Results:**
```yaml
result:
  component:
    type: array
    items:
      $ref: ../schemas.yml#/Component
  output_path:
    type: string
  entity_mappings:
    type: array
    items:
      $ref: ../schemas.yml#/EntityMapping
  section_id:
    type: string
  section_title:
    type: string
```

**Ablauf:**
1. Section bestaetigen (aus Workflow-Param oder User fragen)
2. Lese `design-reference.md` -- leite Screen-Struktur ab
3. Bestimme Screen-Typ (eine Scene pro Durchlauf)
4. Plane Entities + Mappings
5. Plane Komponenten (gruppiert per Entity)
6. Structure Preview (ASCII-Tree)
7. Result: `component[]` + `output_path` + `entity_mappings[]` + `section_id` + `section_title`

`output_path` wird auf `$DESIGNBOOK_DATA/sections/{{ section_id }}/{{ section_id }}.section.scenes.yml` gesetzt.

## design-verify -- Component- und Scene-Modus

### Workflow-Params

```yaml
params:
  scene: { type: string }      # optional
  component: { type: string }  # optional
```

### `intake--design-verify`

**Results:**
```yaml
result:
  scene:
    type: string
  component:
    type: string
  reference:
    type: array
    items:
      $ref: ../schemas.yml#/Reference
  breakpoints:
    type: array
    items: { type: string }
```

**Ablauf:**
1. Pruefe ob `scene` oder `component` gesetzt -- Modus ableiten
2. Wenn keins gesetzt: User fragen
3. Wenn `design-reference.md` existiert: Reference uebernehmen, nicht nochmal fragen
4. Breakpoints abfragen
5. Results weitergeben

### Modus-Unterschiede

| Aspekt | Scene-Modus | Component-Modus |
|--------|-------------|-----------------|
| Story-Aufloesung | `_debo story --scene <id>` | `_debo story --component <id>` |
| Regions | Shell: `header`, `footer`. Screen: `full` | `full` |
| Reference-Source | `design-reference.md` aus Build-Workflow | `design-reference.md` aus Build-Workflow |
| Polish-Scope | Scene-YAML + Component-Templates | Nur Component-Templates |

### `setup-compare` Anpassung

Regions-Logik wird erweitert:
- Component → immer `full`
- Scene + Shell → `header`/`footer`
- Scene + Screen → `full`

Story-Aufloesung ueber den passenden CLI-Befehl je nach gesetztem Param.

## Result-Flow -- Gesamtuebersicht

```
design-component
  extract-reference(component=X)
    → design-reference.md, reference-full.png, reference[]
  intake--design-component
    → component[]
  create-component (each: component)
    → component-yml, component-twig, component-story

design-shell
  extract-reference(scene=design-system:shell)
    → design-reference.md, reference-full.png, reference[]
  intake--design-shell
    → component[], output_path
  create-component (each: component)
    → component-yml, component-twig, component-story
  create-scene(output_path, scene, reference[])
    → scene-file

design-screen
  extract-reference(scene=<section>:<screen>)
    → design-reference.md, reference-full.png, reference[]
  intake--design-screen
    → component[], output_path, entity_mappings[], section_id, section_title
  create-component (each: component)
    → component-yml, component-twig, component-story
  create-sample-data
    → sample-data files
  map-entity (each: entity_mappings)
    → entity-mapping jsonata files
  create-scene(output_path, scene, reference[], section_id, section_title)
    → scene-file

design-verify
  extract-reference(scene=X or component=X)
    → design-reference.md, reference-full.png, reference[]
  intake--design-verify
    → reference[], breakpoints[]
  setup-compare
    → checks[]
  capture-reference (each: checks)
    → screenshot files
  compare-screenshots (each: checks)
    → issues[]
  triage
    → issues[] (consolidated)
  polish (each: issues)
    → file fixes
  outtake
    → summary + verdict
```

## Datei-Aenderungen

| Aktion | Datei |
|--------|-------|
| **NEU** | `tasks/extract-reference.md` |
| **NEU** | `schemas.yml` + `EntityMapping` |
| **NEU** | `rules/shell-scene-constraints.md` |
| **NEU** | `rules/screen-scene-constraints.md` |
| **REWRITE** | `tasks/create-scene.md` (vereinheitlicht) |
| **REWRITE** | `tasks/intake--design-component.md` (Reference-Step raus) |
| **REWRITE** | `tasks/intake--design-shell.md` (Reference-Step raus, output_path rein) |
| **REWRITE** | `tasks/intake--design-screen.md` (Reference-Step raus, eine Scene, output_path, entity_mappings) |
| **REWRITE** | `tasks/intake--design-verify.md` (Component-Modus, Reference-Reuse) |
| **REWRITE** | `tasks/setup-compare.md` (Component-Modus) |
| **UPDATE** | `tasks/map-entity.md` (params per $ref auf EntityMapping) |
| **UPDATE** | `tasks/capture-reference.md` (params per $ref auf Check) |
| **UPDATE** | `tasks/compare-screenshots.md` (params per $ref auf Check) |
| **UPDATE** | `tasks/polish.md` (params per $ref auf Issue) |
| **UPDATE** | `tasks/create-component` (params per $ref auf Component) |
| **UPDATE** | `workflows/design-component.md` (reference-Stage, after-Hook, Test-Stage entfernt) |
| **UPDATE** | `workflows/design-shell.md` (reference-Stage) |
| **UPDATE** | `workflows/design-screen.md` (reference-Stage, eine Scene) |
| **UPDATE** | `workflows/design-verify.md` (reference-Stage, Component-Modus) |
| **DELETE** | `tasks/create-scene--design-shell.md` |
| **DELETE** | `tasks/create-scene--design-screen.md` |
| **CONVERT** | `resources/extract-reference.md` -- Logik wird in den neuen `tasks/extract-reference.md` uebernommen, Resource-Datei wird geloescht |

Die design-component Test-Stage (`storybook-preview, screenshot, resolve-reference, visual-compare, polish`) hatte keine eigenen Task-Dateien -- war nicht implementiert. Wird komplett durch den `design-verify` After-Hook ersetzt.

## Workflow-Start UX

Alle Workflows bekommen `scene` oder `component` als Workflow-Level-Params, die beim Start mitgegeben werden:

```bash
# design-component
debo design-component --component card

# design-shell (scene ist implizit)
debo design-shell
# → engine setzt scene=design-system:shell automatisch

# design-screen
debo design-screen --section blog --screen overview
# → engine setzt scene=blog:overview

# design-verify
debo design-verify --scene design-system:shell
debo design-verify --component card
```

Die Workflow-Frontmatter deklariert die Params:

```yaml
# design-component
params:
  component: { type: string }

# design-shell
params:
  scene: { type: string, default: "design-system:shell" }

# design-screen
params:
  scene: { type: string }    # aus --section + --screen abgeleitet

# design-verify
params:
  scene: { type: string }      # optional
  component: { type: string }  # optional
```
