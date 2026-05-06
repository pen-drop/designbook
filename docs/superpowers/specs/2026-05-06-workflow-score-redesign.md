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

`success_rate` bleibt — optisches Urteil des AI, der die Diffs und Screenshots beurteilt hat.  
`flow_rate` ist neu — deterministisch von der Engine berechnet, primärer Signal für den Research-Loop.

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
```

## Friction-Formel (Engine)

```
friction  = errors * 5 + retries * 2 + unresolved * 3
flow_rate = success_rate * 100 - friction
```

## CLI: `workflow summary`

`workflow score` entfällt. Ersetzt durch `workflow summary` — ein Command, zwei Ausgabeformate:

```
workflow summary              → menschlich lesbar, vollständiger Überblick
workflow summary --json       → kompaktes JSON für den Research-Loop
```

### Human-Output (default)

```
design-shell-2026-05-06-abcd
  flow_rate:    81.0
  success_rate: 0.85  (visual quality)
  compare:      ✓ passed
  metrics:      errors 0 · retries 2 · unresolved 0
  summary:      Header and footer visually match reference across all breakpoints.
  warnings:     –
```

### JSON-Output (`--json`)

```json
{
  "workflow": "design-shell-2026-05-06-abcd",
  "flow_rate": 81.0,
  "success_rate": 0.85,
  "compare_passed": true,
  "metrics": { "errors": 0, "retries": 2, "unresolved": 0 },
  "summary": "...",
  "assertions": { "passed": 2, "total": 2, "failures": [] }
}
```

`assertions` nur wenn `--case <file>` übergeben.

## Schema-Änderungen (`design/schemas.yml`)

`DesignWorkflowOutput`:
- `success_rate` — bleibt, Beschreibung präzisiert: optisches Qualitätsurteil des AI (0–1)
- `flow_rate: number` — neu, von Engine geschrieben
- `metrics` — bleibt, Engine befüllt `errors/retries/unresolved` aus `dbo.log`

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `workflow.ts` | Hook nach Outtake-Stage-Abschluss: `metrics` aus `dbo.log` + `flow_rate` berechnen und in `scope.workflow_output` mergen |
| `scoring/composite.ts` | Vereinfacht: nur `flow_rate`-Formel. Kein Assertions-Weight im gespeicherten Score. |
| `cli/workflow-score.ts` | → umbenannt zu `workflow-summary.ts`. Reiner Leser + human/JSON Ausgabe. |
| `cli/__tests__/workflow-score.test.ts` | → `workflow-summary.test.ts`, Tests auf neue Struktur |
| `design/schemas.yml` | `flow_rate` neu, `success_rate` Beschreibung präzisiert |
| `design/tasks/outtake--design-workflow.md` | `flow_rate`/`metrics` aus Result entfernt (Engine-Aufgabe); `success_rate` bleibt |

## Was wegfällt

- `workflow score` Command
- Doppelte Score-Berechnung zwischen Outtake-Task und Score-CLI
- `issuesPenalty` als eigene Score-Dimension
- Score-Formellogik in `workflow-score.ts`

## Offene Frage

Workflows ohne Compare-Stage haben kein `success_rate`. In diesem Fall: `flow_rate = -friction`. Valider Wert für den Research-Loop — misst nur Prozessqualität.
