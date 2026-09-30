# Designbook skill set

> Use for Designbook components, screens, scenes, tokens and their Drupal config.
Load upstream skills from the agent environment under `@gaia/method-context`.
The [Designbook step-skills](../SKILL.md) add domain handoffs to GAIA’s shared lifecycle.

| Step / condition | Skill and required result |
|---|---|
| Spec: a visual reference source is named in the ticket or `vision.md` | `extract-reference` as a separate capture run; published revision and required screenshot approval. Load only when such a source exists — skip entirely when neither the ticket nor `vision.md` names one |
| Spec: `design-to-designbook` | Matching design intake, e.g. `design-component`, `design-screen`, `design-entity`, `design-shell`, `tokens`, `vision`, `sections`; explicit `persist` mode produces a sealed durable plan |
| Spec: `designbook-to-config` | `sync-to` in `persist` mode; Designbook baseline and sealed durable config plan |
| Coding: either work type | `execute-workflow` with the exact plan path returned during planning |
| Diagnose / coding / review: design | `design-verify` |
| Diagnose / coding / review: config | `sync-verify` |

A reference source must be named in the ticket or `vision.md`; without one,
`extract-reference` is not loaded and planning proceeds referenceless.
Prepare and approve required references before dependent planning. Spec hands
off reference paths, approval evidence, the executable plan path and acceptance
checks; coding executes the saved plan. Diagnosis prepares the same handoff for
repairs after reproducing the defect. Each invocation stays in its GAIA step.

The ticket holds the complete spec, implementation plan and test plan. The saved
Designbook plan is a separate executable artifact. GAIA owns coding/review gates
and publication; verification in diagnosis/review stops before automatic repair.
