# Designbook skill map

Use for Designbook components, screens, scenes, tokens and their Drupal config.
Load upstream skills from the agent environment under `@gaia/method-context`.
The [GAIA step-skills](../SKILL.md) own lifecycle and handoff requirements.

| Step / condition | Skill and required result |
|---|---|
| Spec: missing visual reference | `extract-reference` as a separate capture run; published revision and required screenshot approval |
| Spec: `design-to-designbook` | Matching design intake, e.g. `design-component`, `design-screen`, `design-entity`, `design-shell`, `tokens`, `vision`, `sections`; explicit `persist` mode produces a sealed durable plan |
| Spec: `designbook-to-config` | `sync-to` in `persist` mode; Designbook baseline and sealed durable config plan |
| Coding: either work type | `execute-workflow` with the exact plan path returned during planning |
| Diagnose / coding / review: design | `design-verify` |
| Diagnose / coding / review: config | `sync-verify` |

Prepare and approve required references before dependent planning. Spec hands
off reference paths, approval evidence, the executable plan path and acceptance
checks; coding executes the saved plan. Diagnosis prepares the same handoff for
repairs after reproducing the defect. Each invocation stays in its GAIA step.
