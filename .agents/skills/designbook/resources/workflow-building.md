# Build a workflow plan

Used after a domain intake has identified the requested work. The planner authors
only the concrete **task list** — the decisions. The CLI resolves the full context,
validates, assembles and seals the MD plan. You never hand-write the plan.

Plan persistence and whether to start execution are **separate** decisions from
sealing. Every mode uses the same sealed-plan assembly and the same
`execute-workflow` / `plan done` validation — there is no contract shortcut for
“plan-free” runs.

1. Run `intake <workflow> --palette`. The palette is small: per execution step the
   task names and each task's `params_schema`, the `open_selectors` with their
   `gated` tasks, and `plans_dir` (the plans directory). Read the applicable intake rules
   (their sources are in the full `intake <workflow>` output if you need to consult
   one) and complete the structural decisions. Resolve every open selector — pick
   each variant; its gated tasks join the palette. Completion: every target, param
   and selector choice is known.
2. Author `tasks.json` — the **complete** task list, nothing left for the CLI to
   invent:
   ```json
   {
     "selectors": { "source": "website" },
     "tasks": [
       { "step": "write-component", "task": "write-component", "title": "header", "params": { … } },
       { "step": "write-component", "task": "write-component", "title": "footer", "params": { … } },
       { "step": "validate", "task": "validate", "title": "shell", "params": { … } }
     ]
   }
   ```
   Each task names a palette `task` (repeat it for several instances, e.g. header
   and footer both instantiate `write-component`), a `title`, and `params` that
   satisfy that task's `params_schema`. Cover every step the palette lists.
   Completion: one entry per concrete task, params filled.
3. Before `plan build` for a **design-*** workflow that depends on a published
   revision: confirm that revision is approved for the needed scope. Run
   `reference approval-check --reference <revisionDir> --need <json>` (see
   [CLI workflow](cli-workflow.md)). A missing, pending, rejected, fingerprint-
   drifted, or under-scoped approval is a blockade — emit or retain a
   `ReferenceNeed` and stop; do not seal a design plan that skips the gate.
   Capture and screenshot approval are a separate start (`extract-reference`
   closeout writes `approval.yml`); design intake does not chain them. Text-only
   work that needs no new visuals does not invent a ReferenceNeed. Completion:
   either the dependent revision is approved for the need, or a precise blockade /
   ReferenceNeed is reported.
4. Choose an **execution mode**, then run `plan build` accordingly. Caller override
   always wins over workflow defaults.

   | Mode | Persist durable plan? | Start execute? |
   |---|---|---|
   | `ephemeral` | No (temp under `plans/.ephemeral/`) | Yes |
   | `persist` | Yes (folder `plans_dir/<date>-<slug>/plan.md`, `--name` required) | No |
   | `ask` | After user choice | After user choice |

   **Defaults when unset** (domain-specific defaults live in the linked intake contract):

   - `vision` and similarly simple foundation flows → `ephemeral`
   - Component, screen, entity and shell writes → defaults in the
     [write planning contract](../design/resources/write-planning.md#completion-and-handoff)
   - Explicit plan/save, GAIA handoff that must leave an executable plan, or caller
     persist → `persist`
   - `extract-reference` remains its own workflow; it does not silently chain into
     design execute

   **Mode actions:**

   - **`persist`:** `plan build <workflow> --tasks tasks.json --name <concrete
     initiative name>` (durable default). Stop after `ok`. Hand the CLI's
     returned `plan` path out — do **not** invoke `execute-workflow` in this
     start.
   - **`ephemeral`:** `plan build <workflow> --tasks tasks.json --ephemeral`. The
     CLI writes `$DESIGNBOOK_DATA/plans/.ephemeral/<unique>.md` and returns
     JSON with `ephemeral: true` and `plan`. Invoke
     `execute-workflow <ephemeral-plan-path>` in a separate execution invocation.
     Follow the executor's [ephemeral cleanup](workflow-execution.md#ephemeral-plans)
     after inspection. Interrupted ephemeral runs re-intake or switch to `persist`.
   - **`ask`:** Before build/execute, present the three choices (run here /
     ephemeral, hand off / persist without execute, or cancel). Follow the chosen
     mode.

   `plan build` validates each task's params against its `params_schema` and that
   every required step is covered, embeds each rule/blueprint/task body once,
   freezes the output contracts and definitions, computes the digest (auto-sealed),
   and writes the plan. It reports each unmet param or missing step precisely —
   fix `tasks.json` and re-run until it returns `ok`. Sealing is identical for
   ephemeral and durable paths. Completion: sealed plan exists at the mode's path;
   execute started only when the mode says so.

Keep the palette and task-list authoring out of the executor conversation. The
plan is the single source of truth for execution. Reference transport: keep raw
captures, extracts and query response JSON on disk; a consuming task uses its
typed `reference` requirement, and the separate capture workflow validates and
publishes its observations (see [the executor](workflow-execution.md)). Prepare
fixed reference packages with
[reference packages](../design/resources/reference-packages.md) before authoring a
task that consumes one.
