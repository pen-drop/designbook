# Designbook skill set

> **Pick for design-system work driven by a design reference.** It plans and builds Designbook
> artifacts — components, screens, scenes, tokens — through a mode-aware intake, optionally maps
> them to backend config (`sync-to`), and verifies rendered output against the reference
> (`design-verify` / `sync-verify`). Best when the deliverable is a design-system artifact, not
> general application code.

Agent calibre: prefer an implementer fluent in the Designbook workflow model
(workflow → stage → task/blueprint/rule) that can drive intake, execute a saved plan, and read
verification output rather than invent design intent.

Use the original Designbook skills as made available by the agent's environment.
Names below identify upstream skills, not installation paths or a GAIA-managed package.
Use this collection under the loading and ticket-context contract in `@gaia/method-context`.

| Work step or condition | Skill |
|---|---|
| Specification: drive the intake that writes the plan | `design-screen`, `design-entity`, `design-shell`, `tokens`, `vision`, `sections` |
| Diagnosis | `design-verify`, then `sync-verify` |
| Coding: execute the written plan | `execute-workflow` |
| Coding: map artifacts to backend config | `sync-to` |
| Reference capture | `extract-reference` |
| Review | `design-verify`, `sync-verify` |

Apply conditional rows only when they fit the task. GAIA lifecycle steps without an engineering
method use their existing owner. A method's activity beyond the current GAIA state waits for that
state; for example, coding hands review context to the review state.
