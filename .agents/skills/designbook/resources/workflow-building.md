# Build a workflow plan

Used after a domain intake has identified the requested work. The planner authors
only the concrete **task list** — the decisions. The CLI resolves the full context,
validates, assembles and seals the MD plan. You never hand-write the plan.

1. Run `intake <workflow> --palette`. The palette is small: per execution step the
   task names and each task's `params_schema`, the `open_selectors` with their
   `gated` tasks, and the canonical `plan_path`. Read the applicable intake rules
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
3. Run `plan build <workflow> --tasks tasks.json`. The CLI validates each task's
   params against its `params_schema` and that every required step is covered,
   embeds each rule/blueprint/task body once, freezes the output contracts and
   definitions, computes the digest (auto-sealed), and writes the plan to
   `plan_path`. It reports each unmet param or missing step precisely — fix
   `tasks.json` and re-run until it returns `ok`. Completion: `plan build` returns
   `ok` and the sealed plan exists at `plan_path`.
4. Hand `plan_path` to a separate execution invocation:
   `execute-workflow <plan_path>`. Keep the palette and task-list authoring out of
   the executor conversation. Completion: the executor has completed the fixed
   tasks or recorded a concrete, resumable blockade.

The plan is the single source of truth for execution. Reference transport: keep
raw captures, extracts and query response JSON on disk; a consuming task uses its
typed `reference` requirement, and the separate capture workflow validates and
publishes its observations (see [the executor](workflow-execution.md)). Prepare
fixed reference packages with
[reference packages](../design/resources/reference-packages.md) before authoring a
task that consumes one.
