# Build a workflow plan

Used after a domain intake has identified the requested work. The planner authors
the concrete MD plan; the CLI supplies the planning context and later validates
each result against the plan.

First command of every intake: `intake <workflow>`. Save that JSON from CLI
stdout. It is the context: the intake rules and blueprints (canonical body
embedded, with `source`), the per-step task palette with frozen output contracts,
the `definitions` those contracts reference, each step's `context` key references
with a `read_order`, and any `open_selectors` with their `gated` groups. Skill
descriptions fire the skill; this context is the command contract.

1. Read the intake context in `read_order`: the rules and blueprints first, then
   the task palette. Complete the intake's reference analysis and structural
   decisions. Resolve every `open_selectors` value — pick each selector's variant
   and fold that variant's `gated` context and tasks into the plan; leave no open
   selector unresolved. A nonzero `intake` exit stops planning with that exact
   message. Completion: all target objects, required inputs, and selector choices
   are known.
2. Write the MD plan. It carries two plan-wide registries the steps draw from by
   reference, plus the steps themselves:
   - `## Schemas` — a `definitions:` block holding every type the task contracts
     reference, copied from the intake context. Task contracts reference it by
     `$ref: '#/definitions/<Name>'`, never inline.
   - `## Context` — each applicable rule/blueprint embedded once under a stable
     `### <key> (<kind>, source: <path>)` heading with its canonical body. A rule
     that applies to several steps is stored once and referenced per step.
   - `## Steps` — one `### Step: <name>` per execution step, a `Context: [key, …]`
     reference line, and a `- [ ] <task-name> — <title>` checkbox per task. Each
     task carries `#### Params`, a `#### Contract` fenced block (its frozen
     `outputs`, copied from the palette), and an empty `#### Results` block.
   Completion: every applicable rule, blueprint, and task contract is embedded or
   referenced; the plan reads as a self-contained work order.
3. Author each task explicitly from the palette: the checkbox line names the task
   and its concrete title/target; `#### Params` holds the resolved structural
   parameters; `#### Contract` holds the palette's `outputs` verbatim (every
   output key, requiredness, submission mode, validators, and `$ref` schema).
   Turn repetition hints into concrete checkbox tasks yourself. Group a stage's
   independent tasks under one `### Step`; cross-step order is the execution
   order. The planner fixes component decomposition, composition, concrete visual
   values, asset choices, responsive/state behavior, and acceptance observations
   in task params. Prepare fixed reference packages with
   [reference packages](../design/resources/reference-packages.md) before
   authoring a task that consumes one. Completion: the ordered steps, their
   context references, and decision-critical task params are fixed.
4. Seal the plan digest over `workflow + definitions + context + steps` (results
   excluded) and write it into the `<!-- digest: … -->` line. This freezes the
   definition; execution refuses a plan whose recomputed digest differs.
   Completion: the plan is saved with its sealed digest.
5. Run `plan validate <plan>` and correct every reported missing obligation
   (source + obligation). Completion: `plan validate` reports `ok: true`.
6. Hand the saved plan path to a separate execution invocation using
   `execute-workflow <plan-path>`. Keep planner discovery and full-plan contents
   out of the executor conversation. Completion: the executor has completed the
   fixed tasks or recorded a concrete, resumable blockade.

The plan is the single source of truth for execution. Config instructions are
content embedded in the plan, not paths to reread during execution. Reference
transport: keep raw captures, extracts, and query response JSON on disk; a
consuming task uses its typed `reference` requirement, and the separate capture
workflow validates and publishes its observations (see
[the executor](workflow-execution.md)).
