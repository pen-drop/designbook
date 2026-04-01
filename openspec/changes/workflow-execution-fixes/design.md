## Context

Die Skill-Diagnose eines Vision-Workflow-Durchlaufs hat 4 Reibungspunkte aufgedeckt. Alle betreffen die Schnittstelle zwischen CLI-Output und Agent-Verhalten — der Agent musste raten oder retry-en, weil die CLI nicht genug Information liefert oder die Skill-Docs mehrdeutig sind.

Betroffene Dateien:
- CLI: `packages/storybook-addon-designbook/src/workflow-resolve.ts` (validateAndMergeParams)
- CLI: `packages/storybook-addon-designbook/src/cli.ts` (instructions command, plan command)
- Skill-Doc: `.agents/skills/designbook/resources/workflow-execution.md`
- Task-Dateien: 12 `intake--*.md` Dateien unter `.agents/skills/designbook/`

## Goals / Non-Goals

**Goals:**
- CLI `workflow instructions` liefert `expected_params` aus Task-Frontmatter mit
- CLI `workflow plan` zeigt bei fehlenden Params alle erwarteten Params mit Defaults
- `workflow-execution.md` sagt explizit: "Read the task_file returned by workflow instructions"
- `workflow-execution.md` erlaubt Skip der Intake-Confirmation bei User-Override (`--quiet`)
- Intake-Tasks beschreiben nur *was* sie sammeln, nicht *wohin* der Ablauf danach geht

**Non-Goals:**
- CLI gibt Datei-Inhalte inline zurück (zu groß, unnötig)
- `--quiet` als CLI-Flag mit Persistierung in tasks.yml (kein CLI-Feature, nur Agent-Verhalten)
- Änderung der Ablauf-Logik oder State Machine

## Decisions

### 1. `expected_params` im `instructions`-Output

Die `instructions`-Command liest bereits `stage_loaded` aus tasks.yml. `stage_loaded` enthält `task_file`. Die CLI liest das Task-Frontmatter (`params:` key) und fügt `expected_params` zum JSON-Output hinzu.

Format:
```json
{
  "stage": "intake",
  "task_file": "...",
  "rules": [...],
  "expected_params": {
    "product_name": { "required": true },
    "description": { "required": true },
    "problems": { "required": true },
    "features": { "required": true }
  }
}
```

Logik: `params: { key: null }` → `required: true`, `params: { key: "default" }` → `required: false, default: "default"`.

**Alternative:** Params nur im Error-Output zeigen → abgelehnt, weil der Agent die Info *vor* dem Plan-Aufruf braucht um die Intake-Ergebnisse korrekt zu mappen.

### 2. Bessere Fehlermeldung in `validateAndMergeParams`

`workflow-resolve.ts:545` wirft aktuell:
```
Missing required param 'product_name' for step 'create-vision'
```

Neuer Error listet alle erwarteten Params:
```
Missing required param 'product_name' for step 'create-vision'.
Expected params: product_name (required), description (required), problems (required), features (required)
```

Implementierung: Die Funktion hat bereits `schemaParams` als Argument — einfach in den Error-String einbauen.

### 3. "Read the task_file" — ein Satz in workflow-execution.md

Phase 1 Step 3 bekommt nach dem `workflow instructions`-Aufruf den Satz:
> "Read the `task_file` path from the output to load the actual task content and instructions."

### 4. Neutrale Formulierung in Intake-Tasks

Alle `intake--*.md` die "proceed immediately to the X stage" enthalten, werden geändert zu "intake is complete" oder äquivalent. Die Task beschreibt nur *was* sie sammelt, workflow-execution.md steuert den Ablauf.

### 5. `--quiet` als Skill-Doc-Anweisung

Kein CLI-Flag. `workflow-execution.md` bekommt in Phase 1 Step 3 (Intake) einen Hinweis:
> "If the user explicitly requests no confirmation (e.g. 'ohne Rücksprache'), skip the intake confirmation and proceed directly."

## Risks / Trade-offs

- **[Intake-Task-Änderungen betreffen 12 Dateien]** → Risiko gering, da nur Formulierung geändert wird, keine Logik. Grep + Replace reicht.
- **[expected_params liest Frontmatter bei jedem instructions-Call]** → Minimal, da die Datei schon im Dateisystem liegt und klein ist. Kein Performance-Problem.
