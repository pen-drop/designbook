## Why

Skill-Diagnose eines Vision-Workflow-Durchlaufs deckte 4 Reibungspunkte auf: der Agent musste raten wo Task-Inhalte herkommen, Plan-Fehler zeigten nicht welche Params erwartet werden, Intake-Tasks beschrieben Ablauf-Logik die nicht in ihre Zuständigkeit fällt, und es gab keine Möglichkeit Intake-Confirmations zu überspringen.

## What Changes

- `workflow-execution.md` Phase 1 Step 3: expliziter Hinweis, dass der Agent die `task_file` aus dem `workflow instructions`-Output lesen muss
- CLI `workflow instructions` und `workflow plan`: `expected_params` aus Task-Frontmatter im Output mitliefern, bei Missing-Param-Errors die erwarteten Params mit Typen auflisten
- Alle `intake--*.md` Task-Dateien: "proceed immediately to X stage" durch neutrale Formulierung ersetzen ("intake is complete")
- `workflow-execution.md`: Hinweis dass bei explizitem User-Wunsch ("ohne Rücksprache") die Intake-Confirmation übersprungen wird

## Capabilities

### New Capabilities

- `workflow-expected-params`: CLI liefert erwartete Parameter aus Task-Frontmatter im `workflow instructions` und `workflow plan` Output mit; bei fehlenden Params werden alle erwarteten Params mit Typen in der Fehlermeldung aufgelistet

### Modified Capabilities

- `workflow-execution`: Step 3 ergänzt um explizite "Read task_file" Anweisung; Intake-Phase ergänzt um Skip-Confirmation bei User-Override
- `workflow-plan-resolution`: Plan-Error-Output enthält erwartete Params aus Task-Frontmatter

## Impact

- **Skill-Docs**: `workflow-execution.md` (2 Ergänzungen), 12 `intake--*.md` Dateien (Formulierung)
- **CLI**: `workflow-resolve.ts` oder verwandte Module (expected_params Output + Error-Messages)
- **Keine Breaking Changes**: Bestehende Workflows funktionieren unverändert, neue Felder sind additiv
