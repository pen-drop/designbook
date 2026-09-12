# DESIGNBOOK-61 — GAIA integration notes

Mirror of Task 5 (`designbook-gaia`) behavior for `work:design-to-designbook`:

| Step | Behavior |
|---|---|
| **spec** | Record intended mode (`ephemeral` \| `persist` \| `ask`), any `ReferenceNeed`, and whether coding should consume a pre-persisted plan. Do **not** invoke Designbook intake. Point at `extract-reference` as a **separate** start when capture is needed. |
| **coding** | Durable `plan_path` from persist handoff → `@designbook/execute-workflow` only (no re-intake that rebuilds+auto-executes). Pending/unapproved references → blockade; do not start design execute. No durable plan yet → mode-aware intake allowed. |
| **extract vs design** | GAIA may assign different agents; do not chain design execute from extract. |

Canonical prose: `.agents/skills/designbook-gaia/skills/debo-designbook-design/SKILL.md` and the index `.agents/skills/designbook-gaia/SKILL.md`.
