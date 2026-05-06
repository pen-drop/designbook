# Workflow Score Redesign

**Date:** 2026-05-06  
**Status:** Draft

## Problem

Score wird aktuell zweimal berechnet: einmal im `outtake--design-workflow` Task (AI schreibt `success_rate`) und einmal im `workflow score` CLI (liest scope-Daten und rechnet Composite). Das sind zwei inkonsistente Quellen für dasselbe Konzept. Außerdem fehlt eine klare Trennung zwischen optischer Qualität und Gesamt-Run-Qualität.

## Konzepte und Naming

| Name | Typ | Quelle | Bedeutung |
|---|---|---|---|
| `success_rate` | `number` 0–1 | AI im Outtake-Task | Optische Qualität: wie gut ist das visuelle Ergebnis? |
| `metrics` | object | Engine aus `dbo.log` | Prozess-Metriken: errors, retries, unresolved |
| `flow_rate` | `number` | Engine (deterministisch) | Composite: `success_rate * 100 - friction` |

`success_rate` bleibt — aber mit klarer Semantik: optisches Urteil des AI, der die Diffs und Screenshots beurteilt hat.  
`flow_rate` ist neu — der Research-Loop-Score, von der Engine berechnet.

## Datenfluss

```
Outtake-Task (AI)
  → schreibt workflow_output.success_rate: 0.85   ← visuelles Urteil
  → schreibt workflow_output.summary, compare_passed, artifacts, warnings

Engine — nach Outtake-Stage-Abschluss
  → liest workflow_output.success_rate
  → liest dbo.log → befüllt workflow_output.metrics (errors, retries, unresolved)
  → berechnet flow_rate = success_rate * 100 - friction_penalty
  → schreibt workflow_output.flow_rate

tasks.yml (archiviert):
  scope.workflow_output:
    success_rate: 0.85        ← von AI
    flow_rate: 81.0           ← von Engine
    metrics:
      errors: 0
      retries: 2
      unresolved: 0
    compare_passed: true
    summary: "..."

workflow score CLI
  → liest nur tasks.yml
  → gibt flow_rate + success_rate + metrics aus
  → keine Formellogik, ~20 Zeilen
```

## Friction-Formel (Engine)

```
friction   = errors * 5 + retries * 2 + unresolved * 3
flow_rate  = success_rate * 100 - friction
```

## Schema-Änderungen (`design/schemas.yml`)

`DesignWorkflowOutput`:
- `success_rate` — bleibt, Semantik präzisiert: optisches Qualitätsurteil des AI (0–1)
- `flow_rate: number` — neu, von Engine geschrieben, für Research-Loop
- `metrics` — bleibt, Engine befüllt `errors/retries/unresolved` aus `dbo.log`

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `workflow.ts` | Hook nach Outtake-Stage-Abschluss: `metrics` aus `dbo.log` + `flow_rate` berechnen und in `scope.workflow_output` mergen |
| `scoring/composite.ts` | Vereinfacht: nur `flow_rate`-Formel (`success_rate * 100 - friction`). Kein Assertions-Weight im gespeicherten Score. |
| `cli/workflow-score.ts` | Reiner Leser: liest `tasks.yml`, gibt `flow_rate` + `success_rate` + `metrics` aus. Case-Assertions weiterhin on-demand. |
| `cli/__tests__/workflow-score.test.ts` | Tests auf neue Struktur |
| `design/schemas.yml` | `flow_rate` neu, `metrics` durch Engine befüllt, `success_rate` Beschreibung präzisiert |
| `design/tasks/outtake--design-workflow.md` | `success_rate` bleibt im Result; `flow_rate`/`metrics` entfernt (Engine-Aufgabe) |

## workflow score Output (`--json`)

```json
{
  "workflow": "design-shell-2026-05-06-abcd",
  "flow_rate": 81.0,
  "success_rate": 0.85,
  "metrics": { "errors": 0, "retries": 2, "unresolved": 0 },
  "compare_passed": true,
  "assertions": { "passed": 2, "total": 2, "failures": [] }
}
```

`assertions` nur wenn `--case` übergeben.

## Was wegfällt

- Doppelte Score-Berechnung zwischen Outtake-Task und Score-CLI
- `issuesPenalty` als eigene Score-Dimension
- Score-Formellogik in `workflow-score.ts`

## Offene Frage

Workflows ohne Compare-Stage (z.B. reine Token-Workflows) haben kein `success_rate` im Outtake. In diesem Fall: `flow_rate = -friction`. Valider Wert für den Research-Loop — misst nur Prozessqualität.
