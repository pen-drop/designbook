## Context

Validation läuft aktuell außerhalb des Workflow-Lifecycles: Skills rufen explizit `validate component` und `validate story` auf, der Storybook-Panel zeigt keinen Validierungsstatus, und `validate story` spawnt vitest + Playwright — zu schwer und zu langsam. Jeder Task weiß nicht welche Dateien er erzeugt hat. Validatoren sind hardcoded im CLI.

## Goals / Non-Goals

**Goals:**
- Zentrale `ValidationRegistry` die Integrationen erweitern können
- Tasks tracken ihre erzeugten Dateien (`files[]`) und deren Validierungsstatus
- `workflow update --status done --files [...]` triggert Validation synchron via Registry
- `workflow validate` re-triggert Validation nach einem Fix
- Story-Rendering via `/__validate` HTTP-Endpoint als registrierter Validator
- Panel zeigt Validation-Status pro Task
- Bestehende `validate`-Subcommands (`validate component`, etc.) bleiben als optionale Thin-Wrapper

**Non-Goals:**
- Screenshot/Visual-Regression Testing
- Validation ohne laufenden Storybook für Stories (→ `skipped`)
- Generisches Fix-Skill — jeder Skill fixt seine eigenen Files

## Decisions

### 1. ValidationRegistry als zentrales Konzept

**Decision**: Neue `ValidationRegistry` Klasse in `src/validation-registry.ts`. Sie mappt Glob-Pattern auf Validator-Funktionen. Letzte Registration gewinnt (Integrationen überschreiben defaults).

```typescript
export interface ValidatorFn {
  (file: string, config: DesignbookConfig): Promise<ValidationFileResult>;
}

export class ValidationRegistry {
  register(pattern: string | string[], validate: ValidatorFn): void
  async validate(file: string, config: DesignbookConfig): Promise<ValidationFileResult>
}

export const defaultRegistry = new ValidationRegistry();
```

Built-in Registrierungen in `defaultRegistry`:
| Pattern | Validator |
|---|---|
| `**/*.component.yml` | SDC Schema check |
| `**/*.story.yml`, `**/*.scenes.yml` | `/__validate` HTTP (skipped wenn Storybook nicht läuft) |
| `**/data-model.yml` | Schema check |
| `**/design-tokens.yml` | W3C Schema check |
| `**/data.yml` | Data validator |
| `**/*.jsonata` | JSONata + ComponentNode check |

**Rationale**: Registry statt CLI-Subcommand-Baum. Integrationen können eigene Patterns registrieren ohne den Core zu ändern.

### 2. Integrationen erweitern die Registry

**Decision**: Drei Erweiterungswege:

**a) Addon Preset** — Addon exportiert `validatorExtensions` aus seinem `preset.ts`. Der `viteFinal`-Hook liest diese und registriert sie in `defaultRegistry`:
```typescript
// storybook-addon-sdc/preset.ts
export const validatorExtensions = [
  { pattern: '**/*.component.yml', validate: validateSdcComponent }
];
```

**b) designbook.config.yml** — Für Command-basierte Erweiterungen:
```yaml
validate:
  patterns:
    "**/*.vue":
      command: "vue-validator {file}"
    "**/*.component.yml":
      command: "node {cliPath} validate component {name}"
```

**c) Direkt-Import** — Integration importiert `defaultRegistry` und ruft `register()` auf (für programmatische Setups).

**Rationale**: Storybook-Addons sind der natürliche Erweiterungspunkt. Config-basierte Commands erlauben Integration ohne Code-Änderungen.

### 3. WorkflowTask bekommt files + validation

**Decision**: `WorkflowTask` wird erweitert:

```typescript
export interface ValidationFileResult {
  file: string;             // relativ zu designbook dir
  type: string;             // 'component' | 'story' | 'tokens' | 'data' | 'data-model' | 'view-mode'
  valid: boolean;
  error?: string;
  html?: string;            // nur für story
  skipped?: boolean;        // wenn Storybook nicht läuft
  last_validated: string;   // ISO timestamp — wann dieses File zuletzt geprüft wurde
  last_passed?: string;     // ISO timestamp — wann dieses File zuletzt valid war
  last_failed?: string;     // ISO timestamp — wann dieses File zuletzt invalid war
}

// TaskFile — jedes File trägt seinen eigenen Validierungsstatus
interface TaskFile {
  path: string;                     // relativ zu designbook dir
  requires_validation?: boolean;    // true nach workflow update --files; gelöscht nach validate
  validation_result?: ValidationFileResult;
}

// In WorkflowTask:
files?: TaskFile[];   // betroffene Files, jedes mit eigenem Validierungsstatus
// Kein validation_status Feld auf Task-Ebene — Panel leitet Status ab:
//   ein file.requires_validation=true + kein result → pending
//   alle file.valid=true                            → passed
//   min. 1 file.valid=false                         → failed
//   alle file.skipped=true                          → skipped
```

### 4. `workflow update --files` — nur speichern, kein Auto-Validate

**Decision**: `workflow update <name> <task-id> --status done --files [...]` speichert die Files im Task, setzt Status auf `done` und setzt `requires_validation: true`. Keine automatische Validation beim Update.

```bash
workflow update debo-design-component create-button --status done \
  --files ../components/button/button.component.yml \
  --files ../components/button/button.default.story.yml
# → speichert files[], setzt status: done, requires_validation: true
# → kein validate, kein exit 1
```

**Rationale**: Skills arbeiten asynchron. Auto-Validation beim Update würde den Skill blockieren bevor alle Files gesetzt sind. `requires_validation: true` ist ein einfaches boolean Flag — keine State-Machine mit `pending/running/passed/failed`.

### 5. `workflow validate <name>` — einziger Validate-Befehl

**Decision**: `workflow validate <name>` validiert ALLE Files aller Tasks im Workflow auf einmal. Gibt den Gesamtzustand zurück:

```bash
workflow validate debo-design-component

# stdout: ein JSON-Objekt pro getestetem File
{ "task": "create-button", "file": "../components/button/button.component.yml", "type": "component", "valid": true }
{ "task": "create-button", "file": "../components/button/button.default.story.yml", "type": "story", "valid": false,
  "error": "button.twig:5: Variable 'label' is not defined" }

# exit 1 wenn irgendein valid: false
```

Schreibt `validation_status` + `validation_results` zurück in tasks.yml (pro Task aggregiert).

Der Skill liest den Output, sieht welche seiner Files kaputt sind, fixt sie, und ruft `workflow validate` erneut auf.

**Module invalidation**: Vor jedem Story-Validate `server.moduleGraph.invalidateModule()` — picks up file edits between retries.

### 6. `/__validate` HTTP-Endpoint

**Decision**: In `configureServer` in `vite-plugin.ts`:
```
GET /__validate?file=<path>
→ invalidateModule → ssrLoadModule → render() per export
→ JSON: [{ valid, label, html?, error? }]
```
Wird als Default-Validator für `*.story.yml` und `*.scenes.yml` in `defaultRegistry` registriert. Port via `storybook.port` in config (default: 6009).

### 7. Skill-Ownership: jeder Skill fixt seine eigenen Files

**Decision**: Kein generisches Fix-Skill. Jeder Skill:
1. Schreibt Files
2. `workflow update --status done --files [...]` → bekommt JSON mit validation_results
3. Wenn `valid: false` in results: fixt die betroffenen Files (Skill kennt seine Files)
4. `workflow validate` → prüft ob Fix funktioniert hat
5. Repeat

### 8. Bestehende `validate`-Subcommands — Thin Wrappers

**Decision**: `validate component`, `validate tokens` etc. bleiben als Thin Wrappers die direkt den jeweiligen Validator aus der Registry aufrufen. Kein separater Code — nur Registry-Call + JSON-Output.

### 9. Testing-Strategie

**Decision**: Zwei Ebenen:

**Unit Tests** — jede Validator-Funktion einzeln testbar da `(file, config) → Promise<ValidationFileResult>`:
- `validateViaStorybookHttp`: mock `fetch()` — testet: unreachable → `skipped: true`, 200 → parsed, render error → `valid: false`
- `ValidationRegistry`: register(), validate() mit minimatch-matching, fallthrough
- Alle anderen Validators mit echten Test-Fixture-Files

**Integration Test** — ein Smoke-Test für den `/__validate` Endpoint (braucht echten Vite-Server):
```typescript
const server = await createServer({ /* minimal storybook config */ })
const res = await fetch('http://localhost:PORT/__validate?file=fixtures/test.story.yml')
// → [{ valid: true, label: 'default', html: '<button>...</button>' }]
await server.close()
```

Kein Integration-Test pro File-Typ — die Validator-Unit-Tests decken das ab.

**Rationale**: Validator-Funktionen sind pure Funktionen (file in, result out) — Unit-Tests reichen. Nur der `/__validate` Endpoint braucht einen Server-Context.

## Risks / Trade-offs

- **Registry-Singleton**: Muss in CLI-Kontext korrekt geladen werden (ESM-Import-Reihenfolge). → Lösung: Registry-Instanz explizit übergeben, kein globalem State
- **Module-Cache bei Retry**: `ssrLoadModule` cached — `invalidateModule()` vor jedem Re-Validate pflicht
- **Addon Preset Erweiterungen**: `viteFinal` läuft im Storybook-Kontext, CLI-Kontext ist anders — `validatorExtensions` müssen ohne Vite-Kontext importierbar sein
- **`designbook-component-validate` entfernt**: Visueller Screenshot-Vergleich fällt weg. HTML-String im JSON-Result ist Ersatz.
