# Reference-Speicherung konsolidieren

## Problem

Reference-Daten werden an zwei Orten gespeichert:

1. **Per Story** -- `capture-reference` schreibt Screenshots nach `stories/{storyId}/screenshots/reference/{bp}--{region}.png`. Jede Story hat eigene Kopien.
2. **Per Reference (Hash)** -- `extract-reference` schreibt nach `references/{hash}/extract.json` + Screenshots.

Wenn mehrere Stories dieselbe Reference-URL verwenden, werden Screenshots doppelt erfasst und gespeichert. Ausserdem existieren unter `stories/{storyId}/screenshots/` drei Unterordner (`reference/`, `current/`, `storybook/`), die nach dem Umbau nicht mehr noetig sind.

## Loesung

### Einheitlicher Reference-Ordner

Alle Reference-Daten liegen unter `$DESIGNBOOK_DATA/references/{hash}/`. Der `reference_folder` Resolver (existiert bereits) berechnet den Hash deterministisch aus der URL. Tasks bekommen den aufgeloesten Pfad als Param.

### Neuer Resolver: `breakpoints`

Liest die Breakpoint-Namen aus `design-tokens.yml` und gibt sie als kommaseparierten String zurueck.

```
resolve: breakpoints
value: "sm,xl"
```

Die Viewport-Breiten werden nicht vom Resolver aufgeloest -- Tasks lesen sie bei Bedarf direkt aus den Design Tokens.

### Einheitliche Workflow-Params

Alle Workflows die mit References arbeiten (`design-verify`, `design-screen`, `design-component`) deklarieren dasselbe Param-Set:

```yaml
params:
  story_id:
    type: string
    resolve: story_id
  reference_url: { type: string, default: "" }
  reference_folder:
    type: string
    resolve: reference_folder
    from: reference_url
  breakpoints:
    type: string
    resolve: breakpoints
```

### Task-Aenderungen

#### `capture-reference`

- Neue Params: `reference_folder`, `breakpoints`
- Output-Pfad: `{reference_folder}/{bp}--{region}.png`
- Gibt keine Screenshot-Pfade mehr als Result zurueck
- Downstream Tasks bauen Pfade selbst aus `reference_folder` + `{bp}--{region}.png`

#### `extract-reference`

- Bereits auf `reference_folder` Param umgestellt -- keine Aenderung noetig

#### `compare-screenshots`

- Neuer Param: `reference_folder`
- Liest Reference-Screenshots aus `{reference_folder}/{bp}--{region}.png`

#### `verify`

- Neuer Param: `reference_folder`
- Gleiche Pfad-Logik

### Dateistruktur nach Umbau

```
designbook/
  references/{hash}/           # ein Ort pro Reference-URL
    extract.json               # extrahierte Designdaten
    reference-full.png         # Full-page Screenshot
    reference-header.png       # Region-Screenshot (optional)
    sm--full.png               # Breakpoint-Screenshot
    md--full.png
    xl--header.png
  stories/{storyId}/           # story-spezifische Daten
    meta.yml                   # Thresholds, Vergleichsergebnisse
    screenshots/               # Storybook-Captures direkt hier
      sm--full.png
      xl--header.png
    issues/
    extractions/
```

Wegfallende Verzeichnisse unter `stories/{storyId}/screenshots/`:
- `reference/` -- ersetzt durch `references/{hash}/`
- `current/` -- Screenshots liegen direkt unter `screenshots/`
- `storybook/` -- Screenshots liegen direkt unter `screenshots/`

## Resolver-Implementierung

### `breakpoints` Resolver (neu)

```typescript
interface BreakpointsResolver extends ParamResolver {
  name: 'breakpoints';
  // Kein from: -- liest direkt aus DESIGNBOOK_DATA/design-system/design-tokens.yml
  // Returns: "sm,xl" (kommaseparierte Breakpoint-Namen)
}
```

Quelle: `$DESIGNBOOK_DATA/design-system/design-tokens.yml` -- liest die dort definierten Breakpoint-Keys.

### Bestehende Resolver (unveraendert)

- `story_id`: User-Input -> kanonische Story-ID
- `reference_folder`: URL -> `$DESIGNBOOK_DATA/references/{hash}`

## Abhaengigkeitsreihenfolge

```
1. story_id        (independent)
2. breakpoints     (independent)
3. reference_folder (dependent: from reference_url)
```

`story_id` und `breakpoints` haben kein `from:` und werden zuerst aufgeloest. `reference_folder` haengt von `reference_url` ab und wird danach aufgeloest.
