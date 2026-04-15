# Param Resolvers

## Problem

Workflows arbeiten mit internen Identifiern (`story_id`, `reference_folder`), aber User geben kurze, unscharfe Namen ein (`shell`, `landing`, `card`). Aktuell passiert die Aufloesung manuell in Intake-Tasks oder per Bash-Scripting. Das fuehrt zu:

- Doppelter Aufloeungslogik in verschiedenen Workflows (design-verify, design-screen)
- `story_id` wird erst spaet abgeleitet (setup-compare), obwohl sie frueher gebraucht wird
- Manuelle Hash-Berechnung fuer Reference-Ordner in extract-reference
- Kein einheitlicher Mechanismus fuer Input-Validierung + Kandidaten-Vorschlaege

## Loesung: Param Resolver als Core-CLI-Konzept

Ein Param Resolver ist ein Engine-Feature das einen Param-Wert validiert und in seine kanonische Form bringt. Resolver werden pro Param im Workflow-YAML deklariert und von der CLI-Engine ausgefuehrt.

### Kernprinzip

1. Die AI interpretiert den User-Input und liefert einen Best-Guess als Param-Wert
2. Die Engine sieht `resolve:` auf dem Param und ruft den Resolver auf
3. Der Resolver validiert, ersetzt den Wert durch die kanonische Form, oder gibt einen Fehler mit Kandidaten zurueck
4. Bei Erfolg: Workflow startet. Bei Fehler: AI praesentiert Kandidaten und fragt nach.

## Workflow-Deklaration

Resolver werden pro Param im Workflow-YAML konfiguriert. Alles neben `type` und `resolve` ist resolver-spezifische Config:

```yaml
# design-verify.md
params:
  story_id:
    type: string
    resolve: story_id
    # keine sources → Default: [scenes, components]

# design-screen.md
params:
  story_id:
    type: string
    resolve: story_id
    sources: [scenes]  # nur Scenes durchsuchen

# design-verify.md / design-shell.md
params:
  reference_url:
    type: string
  reference_folder:
    type: string
    resolve: reference_folder
    from: reference_url  # Input-Param fuer den Resolver
```

## Resolver-Interface

```typescript
interface ParamResolver {
  name: string;
  resolve(input: string, config: Record<string, unknown>): ResolverResult;
}

interface ResolverResult {
  resolved: boolean;
  value?: string;            // kanonischer Wert (wenn resolved: true)
  input: string;             // Original-Input
  error?: string;            // Fehlerbeschreibung (wenn resolved: false)
  candidates?: Candidate[];  // Vorschlaege bei Mehrdeutigkeit
}

interface Candidate {
  label: string;   // User-lesbarer Name, z.B. "design-system:shell"
  value: string;   // kanonischer Wert, z.B. "designbook-design-system-scenes--shell"
  source: string;  // Herkunft: "scene" | "component"
}
```

Der Resolver bekommt den Input-Wert und ein Config-Objekt mit allen Feldern aus der Param-Deklaration (ausser `type` und `resolve`). Er entscheidet selbst wie er die Config interpretiert.

## Resolver-Typen

### `story_id`

Validiert und loest einen User-Input auf eine kanonische Storybook-Story-ID auf.

**Config-Felder:**

| Feld | Typ | Default | Beschreibung |
|---|---|---|---|
| `sources` | `string[]` | `["scenes", "components"]` | Welche Quellen durchsucht werden |

**Match-Logik (in Reihenfolge):**

1. **Exakter storyId-Match**: Input ist bereits eine gueltige story_id (existiert als Story-Verzeichnis) → direkt zurueckgeben
2. **Qualifizierter Scene-Match**: Input enthaelt `:` (z.B. `design-system:shell`) → `resolveScene()` aufrufen → story_id ableiten
3. **Kurzer Name**: Input ohne `:` → alle `.scenes.yml` Dateien scannen (wenn `scenes` in sources) + Components scannen (wenn `components` in sources)
4. Ergebnisse sammeln, bei genau 1 Match → resolved. Bei 0 oder N → Fehler + Kandidaten.

**Priorisierung bei Kurzname-Suche:**
- Scenes haben Vorrang vor Components
- Wenn sowohl Scene als auch Component matchen → alle als Kandidaten zurueckgeben (nicht auto-resolven)

**Beispiele:**

```
Input: "shell", sources: default
→ Scannt alle scenes.yml → findet design-system:shell
→ resolved: true, value: "designbook-design-system-scenes--shell"

Input: "shell", sources: [scenes]
→ Scannt nur scenes.yml → findet design-system:shell
→ resolved: true, value: "designbook-design-system-scenes--shell"

Input: "landing"
→ Findet homepage:landing UND galerie:landing
→ resolved: false, candidates: [{label: "homepage:landing", ...}, {label: "galerie:landing", ...}]

Input: "card"
→ Findet homepage:card (scene) UND card (component)
→ resolved: false, candidates: [{label: "homepage:card", source: "scene"}, {label: "card", source: "component"}]

Input: "blabla"
→ Kein Match
→ resolved: false, candidates: []
```

### `reference_folder`

Deterministischer Resolver: berechnet den Hash-basierten Ordnerpfad fuer eine Design-Reference-URL.

**Config-Felder:**

| Feld | Typ | Default | Beschreibung |
|---|---|---|---|
| `from` | `string` | (pflicht) | Name des Params der die URL enthaelt |

**Logik:**

1. Lese den Wert des `from`-Params
2. Normalisiere die URL: lowercase, trailing slash entfernen, Query-Strings behalten
3. Berechne SHA-256 Hash, nehme die ersten 12 Zeichen
4. Setze Pfad: `$DESIGNBOOK_DATA/references/<hash>`
5. Erstelle Ordner wenn er nicht existiert
6. Immer resolved (deterministisch, keine Kandidaten)

**Beispiel:**

```
from-Param: "https://example.com/design"
→ Hash: "a1b2c3d4e5f6"
→ resolved: true, value: "/abs/path/designbook/references/a1b2c3d4e5f6"
```

## Integration in `workflow create`

### Ablauf

```
_debo workflow create --workflow design-verify --params '{"story_id": "shell"}'
  ↓
Engine: Liest Workflow-YAML, findet resolve: story_id auf story_id-Param
  ↓
Engine: Ruft story_id-Resolver auf mit (input: "shell", config: {})
  ↓
Resolver: Scannt scenes + components, findet 1 Match
  ↓
Engine: Ersetzt story_id-Wert durch kanonische Form
  ↓
Response: normaler Workflow-Start mit aufgeloester story_id
```

### Response: Alle Params aufgeloest

Wenn alle Resolver erfolgreich sind, startet der Workflow normal:

```json
{
  "name": "design-verify-2026-04-15-a3f7",
  "params": {
    "story_id": "designbook-design-system-scenes--shell"
  },
  "steps": ["..."],
  "step_resolved": { "...": "..." }
}
```

### Response: Unresolved Params

Wenn ein Resolver fehlschlaegt, startet der Workflow NICHT. Die Response enthaelt die Resolver-Ergebnisse:

```json
{
  "name": "design-verify-2026-04-15-a3f7",
  "unresolved": {
    "story_id": {
      "input": "landing",
      "resolver": "story_id",
      "error": "Ambiguous: 2 matches found",
      "candidates": [
        { "label": "homepage:landing", "value": "designbook-homepage-scenes--landing", "source": "scene" },
        { "label": "galerie:landing", "value": "designbook-galerie-scenes--landing", "source": "scene" }
      ]
    }
  }
}
```

Die AI praesentiert die Kandidaten, der User waehlt, und die AI ruft erneut auf:

```bash
_debo workflow resolve --workflow <name> --param story_id --value "designbook-homepage-scenes--landing"
```

`workflow resolve` fuehrt den Resolver nochmal mit dem neuen Wert aus (Validierung), und wenn jetzt alles aufgeloest ist, startet der Workflow.

## Integration in `_debo story`

Der `story`-Befehl nutzt denselben Resolver. Statt `--scene` Flag wird der erste Positionsargument durch den Resolver geschickt:

```bash
# Neu:
_debo story shell                        # Resolver: scenes + components
_debo story design-system:shell          # Resolver: qualifizierter Match
_debo story --create shell --json '{}'   # Resolver + Create
_debo story check shell --json '{}'      # Resolver + Check-Update

# Alt (deprecated):
_debo story --scene design-system:shell
```

### Response bei aufgeloestem Match

```json
{
  "storyId": "designbook-design-system-scenes--shell",
  "scene": "design-system:shell",
  "source": "scene",
  "storyDir": "/abs/path/to/story/dir",
  "url": "http://localhost:6006/iframe.html?id=designbook-design-system-scenes--shell&viewMode=story"
}
```

### Response bei Mehrdeutigkeit

```json
{
  "resolved": false,
  "input": "card",
  "candidates": [
    { "label": "homepage:card", "value": "designbook-homepage-scenes--card", "source": "scene" },
    { "label": "card (component)", "value": "designbook-card--default", "source": "component" }
  ]
}
```

## Aenderungen an bestehenden Workflows

### design-verify.md

```yaml
# Vorher:
params:
  scene_id: { type: string, default: "" }
  component_id: { type: string, default: "" }

# Nachher:
params:
  story_id:
    type: string
    resolve: story_id
  scene_id: { type: string, default: "" }
  component_id: { type: string, default: "" }
  reference_url: { type: string, default: "" }
  reference_folder:
    type: string
    resolve: reference_folder
    from: reference_url
```

`story_id` wird zum primaeren Identifier. `scene_id` und `component_id` werden weiterhin als Kontext mitgeliefert (von der AI beim `workflow create`-Aufruf gesetzt), aber `story_id` ist die Arbeitseinheit fuer alle Tasks.

### design-screen.md

```yaml
# Vorher:
params:
  scene_id: { type: string }

# Nachher:
params:
  story_id:
    type: string
    resolve: story_id
    sources: [scenes]
  scene_id: { type: string }
```

### Intake-Tasks

Intake-Tasks (`intake--design-verify.md`) werden vereinfacht: die Story-Aufloesung passiert nicht mehr im Intake, sondern vor dem Workflow-Start. Der Intake kuemmert sich nur noch um fehlende Params die nicht per Resolver aufloesbar sind (z.B. Breakpoints, Reference-URL wenn nicht vorhanden).

### setup-compare.md

Nutzt direkt `story_id` statt die Scene nochmal aufzuloesen:

```bash
# Vorher:
_debo story --scene ${scene_id} --create --json '<meta-seed>' checks

# Nachher:
_debo story ${story_id} --create --json '<meta-seed>' checks
```

## Resolver-Abhaengigkeiten

Resolver koennen von anderen Params abhaengen (`from:`). Die Engine loest Resolver in Abhaengigkeitsreihenfolge auf:

1. Params ohne `from:` zuerst (z.B. `story_id`)
2. Params mit `from:` danach, wenn der referenzierte Param aufgeloest ist (z.B. `reference_folder` nach `reference_url`)
3. Wenn der `from`-Param nicht aufgeloest ist, bleibt der abhaengige Param unresolved — der Workflow kann trotzdem starten wenn der Param optional ist oder spaeter im Workflow gesetzt wird

## Implementierungsscope

### CLI-Engine (TypeScript)

1. **Resolver-Registry**: Map von Resolver-Name → Resolver-Implementierung
2. **`story_id`-Resolver**: Scene-Scanning, Component-Scanning, Match-Logik
3. **`reference_folder`-Resolver**: URL-Hashing, Ordner-Erstellung
4. **`workflow create` erweitern**: Resolve-Phase vor Workflow-Start
5. **`workflow resolve` neu**: Nachtraegliches Param-Resolving
6. **`story` Command anpassen**: Positionsargument statt `--scene` Flag

### Skill-Dateien (Markdown)

1. **Workflow-Definitionen**: `resolve:`-Deklarationen auf Params ergaenzen
2. **Intake-Tasks**: Story-Aufloeungslogik entfernen, vereinfachen
3. **setup-compare**: story_id direkt nutzen
4. **extract-reference**: reference_folder per Resolver statt manuellem Hashing
5. **CLI-Referenz**: Neue Befehle dokumentieren (`workflow resolve`, `story`-Positionsargumente)
6. **workflow-execution.md**: Resolver-Mechanismus als Rule 0.5 (vor Rule 1) dokumentieren
