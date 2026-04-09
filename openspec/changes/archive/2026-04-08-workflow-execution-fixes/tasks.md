## 1. CLI: expected_params im instructions-Output

- [x] 1.1 `cli.ts` instructions-Command: Task-Frontmatter lesen und `expected_params` zum JSON-Output hinzufügen (Zeile ~580-589)
- [x] 1.2 Test: `workflow instructions` gibt `expected_params` mit required/optional/default zurück

## 2. CLI: Bessere Fehlermeldung in validateAndMergeParams

- [x] 2.1 `workflow-resolve.ts` `validateAndMergeParams`: Error-Message um alle erwarteten Params mit required/optional-Status erweitern (Zeile ~545)
- [x] 2.2 Test: Missing-Param-Error listet alle erwarteten Params auf

## 3. Skill-Doc: workflow-execution.md Phase 1 Step 3

- [x] 3.1 Nach dem `workflow instructions`-Aufruf ergänzen: "Read the `task_file` path from the output to load the actual task content and instructions."
- [x] 3.2 Quiet-Mode-Hinweis ergänzen: "If the user explicitly requests no confirmation, skip the intake confirmation and proceed directly."

## 4. Skill-Doc: Intake-Tasks neutrale Formulierung

- [x] 4.1 Alle `intake--*.md` durchgehen und "proceed immediately to X stage" / "proceed to X" durch neutrale Completion-Formulierung ersetzen
