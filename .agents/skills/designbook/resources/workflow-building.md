# Build a workflow plan

Used after a domain intake has identified the requested work. The planner authors
only the concrete **task list** — the decisions. The CLI resolves the full context,
validates, assembles and seals the MD plan. You never hand-write the plan.

Plan persistence and whether to start execution are **separate** decisions from
sealing. Every mode uses the same sealed-plan assembly and the same
`execute-workflow` / `plan done` validation — there is no contract shortcut for
“plan-free” runs.

Before making reference-dependent intake decisions, apply the source reference
prerequisite from the resolved intake context.
This applies to every consuming workflow, including foundation, import and
verification. Reference-free requests use their concrete inputs.

1. Run `intake <workflow> --palette`. The palette is small: per execution step the
   task names and each task's `params_schema`, the `open_selectors` with their
   `gated` tasks, and `plans_dir` (the plans directory). Read the applicable intake rules
   (their sources are in the full `intake <workflow>` output if you need to consult
   one). Use the request, existing artifacts and saved intake context; ask only
   for unresolved inputs. Resolve every open selector — pick each variant; its
   gated tasks join the palette. Completion: all targets, requested changes,
   preserved content, acceptance criteria, parameters, dependencies and applicable
   rules are fixed. Intake creates no run task or progress entry.
2. Author `tasks.json` — the **complete** task list, nothing left for the CLI to
   invent:
   ```json
   {
     "selectors": { "source": "website" },
     "composition": {
       "components": [],
       "mappings": [],
       "samples": [],
       "scenes": [],
       "data_model": {}
     },
     "tasks": [
       { "step": "write-component", "task": "write-component", "title": "header", "params": { … } },
       { "step": "write-component", "task": "write-component", "title": "footer", "params": { … } },
       { "step": "validate", "task": "validate", "title": "shell", "params": { … } }
     ]
   }
   ```
   Each task names a palette `task` (repeat it for several instances, e.g. header
   and footer both instantiate `write-component`), a `title`, and `params` that
   satisfy that task's `params_schema`. A writing-design list carries `composition`
   matching the palette `$ref` to `CompositionInputs`. Cover every step the palette lists.
   Completion: one entry per concrete task, params filled.
3. Choose an **execution mode** and save the sealed plan with `plan build`.
   Caller override always wins over workflow defaults. Writing-design workflows
   are `design-entity`, `design-component`, `design-screen` and `design-shell`.

   | Mode | Plan storage | Start execution? |
   |---|---|---|
   | `ephemeral` | Temporary, under `plans/.ephemeral/` | After presentation |
   | `persist` | Durable | No; hand off the saved path |
   | `ask` | Durable, before asking | Only after the user's choice |

   **Defaults when unset:**

   - Explicit plan/save or a GAIA handoff requiring an executable plan → `persist`.
   - Writing-design **create / rebuild** → `ask`.
   - Writing-design **change** → `ephemeral` only while targets and scope stay
     bounded; otherwise stop and resolve the wider scope.
   - Other workflows → `ephemeral`.

   For `persist` and `ask`, run `plan build <workflow> --tasks tasks.json
   --name <concrete initiative name> --format json`. For `ephemeral`, run
   `plan build <workflow> --tasks tasks.json --ephemeral --format json`.
   Use the returned `plan` path in all subsequent commands.

   `plan build` validates each task's params against its `params_schema` and that
   every required step is covered, embeds each rule/blueprint/task body once,
   freezes the output contracts and definitions, computes the digest (auto-sealed),
   and writes the plan. Fix reported errors in `tasks.json` and rebuild until it
   returns `ok`. Completion: the sealed plan is saved; execution has not started.
4. **Present the saved plan.** For these four only, present the selector inventory
   from the resolved `design-write-planning` rule, then run `plan tree <plan-path>`.
   Include that command's unmodified stdout in a user-visible reply before asking
   for execution confirmation or starting execution, even when execution was
   requested without questions. Other workflows, including `design-verify`,
   present their planned scope and outputs when the mode is `ask`.
   Completion: the user can review the saved plan before execution.
5. **Hand off or execute the saved path.**

   - **`persist`:** Return the saved `plan` path and stop.
   - **`ephemeral`:** Invoke `execute-workflow <plan-path>` in a separate execution
     invocation. After successful completion or explicit abandon, delete the
     ephemeral plan after caller/tester inspection when scoring needs it; result
     artifacts remain. Interrupted ephemeral runs have no durable resume —
     re-intake and rebuild, or switch to `persist` first.
   - **`ask`:** Offer three choices: execute the saved plan here, hand off without
     executing, or cancel execution. Execute the saved path only after the run
     choice; the other choices retain the plan and stop. Saving the plan itself
     requires no confirmation.

   Completion: execution started only when the selected mode and any required
   confirmation authorize it.

Keep the palette and task-list authoring out of the executor conversation. The
plan is the single source of truth for execution. Reference transport: keep raw
captures, extracts and query response JSON on disk; a consuming task uses its
typed `reference` requirement, and the separate capture workflow validates and
publishes its observations (see [the executor](workflow-execution.md)). Prepare
fixed reference packages with
[reference packages](../design/resources/reference-packages.md) before authoring a
task that consumes one.
