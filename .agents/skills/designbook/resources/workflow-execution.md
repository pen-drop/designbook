# Workflow Execution

Operational guide for running a designbook workflow. You are the AI; this tells you what commands to run, what responses to expect, and what to do with them.

All CLI calls in this doc use `_debo` as shorthand for
`npx storybook-addon-designbook`. When Designbook runs as a plugin from the
cache, the CLI **auto-detects** the runtime (Claude Code / Codex / Gemini /
`~/.agents/skills`) and locates workflow/task/rule/schema files there — no
config needed. An optional `skills` key in `designbook.config.yml` overrides the
detection. See [`cli-reference.md`](cli-reference.md) and
[`cli-workflow.md`](cli-workflow.md) for the full CLI reference.

---

## 1. Main Loop (engine lens)

What the CLI does under the hood. You do not drive these steps directly — they happen inside `workflow create` and `workflow done`. Understanding them makes the responses make sense.

- **At `workflow create`**, the engine resolves workflow params (via code `resolve:` resolvers), expands every pending task whose params are satisfied, and marks the first task `in-progress`.
- **At every `workflow done`**, the engine validates the submitted results against each result key's schema, marks the task `done`, and looks for more work in the same stage.
- **When every task in a stage is done**, the engine collects data results from that stage into workflow scope, then re-runs expansion — tasks in later stages whose `each:` keys just became available get materialized.
- **Results live in two places:** data results live in workflow scope (driving later-stage expansion); file results live on disk at their declared `path`.
- **Params resolve in two phases:** deterministic code resolvers at create-time, and provider rules (rules with `provides: <key>` in frontmatter) at task-time. What neither phase covers, the task body asks the user for.

You never read `tasks.yml` directly to decide what to do next — every CLI response tells you. Never fabricate task IDs; they come from the responses.

---

## 2. Running a Workflow (AI lens)

### Start fresh

```bash
_debo workflow create --workflow <id> [--params '<json>']
```

### Resuming an interrupted workflow

Before creating, check whether a workflow of this type is already active:

```bash
_debo workflow list --workflow <id>
```

If the list is non-empty, ask the user "continue the existing workflow, or start fresh?" If continue, use that workflow name going forward (skip `create`). If fresh, `_debo workflow abandon --workflow <old-name>` first, then `create`.

### Handling the create response

The response shape is documented in [`cli-workflow.md` → `workflow create`](cli-workflow.md). Two cases matter here:

1. **`unresolved`** is present — one or more params couldn't be resolved by their code resolver. For each key:
   - If `candidates` is non-empty, present them to the user and ask which one.
   - Otherwise ask the user for a more specific value.
   - Re-call `workflow create` with the corrected `--params`. Repeat until there's no `unresolved`.

2. **No `unresolved`** — the workflow is created, the first task is already `in-progress`, and `step_resolved` maps every step to its `task_file`, `rules`, and `blueprints`. Capture the workflow `name` into `$WORKFLOW_NAME` and enter the task loop.

When `intake_skipped: true` appears in the response (because `--params` covered everything), the first task is already the first real task — the intake step was bypassed. Behavior is the same: proceed to the task loop.

---

## 3. Task Loop (schema-centric)

For each in-progress task, in order. The schema for the task's results is the goal — every step below is in service of filling that schema.

### 0. Inline or isolated?

Read `isolate` from the `step_resolved` map captured at `workflow create` — it is emitted once and stays stable for the whole run, so at every transition you look up `step_resolved[<current-step>].isolate` from that retained state. (On a resumed run where you no longer hold the create response, `workflow instructions <step>` re-surfaces `isolate` — but only for a step already loaded via its own `workflow done --loaded`; it does not resolve a step before that step has run.)

- **Absent / false** — run this step inline, exactly as steps 1–7 below.
- **`true`** — do NOT read the task body, rules, or blueprints yourself. Dispatch ONE subagent with the brief in [`stage-executor.md`](stage-executor.md), passing: `$WORKFLOW_NAME`, the workspace root, the in-progress task id(s) for this step, the step's `task_file`/`rules`/`blueprints`/`schema` from `step_resolved`, the scope subset the stage needs, and paths (not contents) of any bulky upstream artifacts it consumes. The subagent calls `workflow done` itself. When it returns, read ONLY its compact summary + the `RESPONSE:` JSON, then continue at step 7 (Follow the response). The subagent's intermediate context never enters yours.

If the subagent returns `needs_user`, run `workflow wait` → ask the user → `workflow resume`, then re-dispatch the subagent with the answer added to the scope subset.

### 1. Read the schema of the expected results

The `workflow create` response (and every subsequent `workflow done` response for tasks in the same run) carries `schema.result` on each step entry in `step_resolved`. That schema lists every required result key, with its type, path template (if a file result), and any `$ref`-resolved definitions. This is your goal statement.

Also capture `schema.params` (inputs already known to the task) and `schema.definitions` (all referenced types merged across base, blueprint extensions, and rule constraints).

### 2. Check providers for each result key

A **provider rule** is a rule file whose frontmatter includes `provides: <result-key>`. Its body describes exactly how to produce that result. For each required key in `schema.result`:

- If a loaded rule has `provides: <that-key>`, follow that rule's instructions to produce the value.
- Otherwise the task body (step 3) is responsible for producing it.
- If neither covers it, ask the user (step 5).

### 3. Read the task body

Open the `task_file` from `step_resolved[<step>]`. The body contains decisions and flow that schema, rules, and blueprints don't cover: UX choices, conditional branches, questions to ask the user, external commands to run.

### 4. Read rules and blueprints silently

Read every path in `rules` and `blueprints` for the current step. Rules are hard constraints — they bind all work in this task. Blueprints are overridable starting points (directory layouts, naming, markup patterns). Never mention rules or blueprints to the user; they're context for you, not conversation.

(For isolated steps you skip this entirely — the subagent reads rules and blueprints in its own context. See step 0.)

### 5. Resolve the schema

Do the work: fill every required result key, obey every rule, follow the task body's flow.

When you need user input:

```bash
_debo workflow wait --workflow $WORKFLOW_NAME --message "<your question>"
```

This transitions `running → waiting` (Storybook panel shows an amber pulse with your message). Then ask the user. Once you have the answer:

```bash
_debo workflow resume --workflow $WORKFLOW_NAME
```

This transitions `waiting → running`. There is no auto-transition — `done`, `result`, and `instructions` no longer silently clear waiting state. You must call `resume` before submitting.

Then continue to step 6 with the answer in your `--data` payload.

### 6. Mark the task done

All result keys — both file and data — are submitted in a single JSON payload:

```bash
_debo workflow done --workflow $WORKFLOW_NAME --task <task-id> \
  --data '<json-with-all-result-keys>'
```

The CLI serializes file results to their declared paths, validates every result against `schema.definitions`, and marks the task done. If validation fails, the response reports the errors — fix and call `done` again.

For file results, treat validation errors as a repair loop on the submitted file content itself. Do not stop at reporting the error. Update the artifact so it satisfies the validator feedback exactly, then re-submit the same result key via `workflow done` until the task passes.

`--data` is final content. The engine does not rewrite submitted values. Example: if a Twig file should contain `test_integration_drupal:page`, submit that literal string — not `$DESIGNBOOK_COMPONENT_NAMESPACE:page`.

For `submission: direct` results only (external tool writes — Playwright screenshots, CLI-generated files), the external tool writes the file first, then registers it:

```bash
_debo workflow result --workflow $WORKFLOW_NAME --task <task-id> --key <result-key>
```

Omit `--json` to mark it as an externally-written file (the CLI looks up the staged path from the schema). `done` follows when all results are in place. See [`cli-workflow.md` → `workflow result`](cli-workflow.md) for the direct-submission flow.

### 7. Follow the response

The `done` response tells you what's next. Parse the `RESPONSE:` JSON line:

- **`next_step` in same stage** (`stage_complete: false`) — continue to step 1 with the new step.
- **Stage transition** (`stage_complete: true`) — `scope_update` shows which data results were collected into scope; `expanded_tasks` lists newly materialized tasks in later stages. Continue to step 1 with the next step.
- **`waiting_for`** — the engine is asking the user for something the schema requires. Run `workflow wait` with the prompt, ask the user, `workflow resume`, then pass the answer as `--data` on the next `workflow done`.
- **`{ "stage": "done" }`** — the workflow is archived. Process after-hooks (§6).

---

## 4. Param Resolution (behavior)

This runs continuously, not as a discrete step. Whenever a param is missing, resolution follows three stages in order:

1. **Code resolvers** — params declared with `resolve: <resolver-name>` in the workflow's `params:` frontmatter are handled deterministically by the CLI at `workflow create` time. If ambiguous, the resolver returns `candidates` in `unresolved` (see §2).
2. **Provider rules** — a rule file with `provides: <param-or-result-key>` in its frontmatter contributes the value when that key is still missing at task time. The rule's body is your instruction for producing it.
3. **User fallback** — if neither resolver nor provider covers the key, the task body asks the user, using `wait` → ask → `resume` → submit.

Prefer code resolvers for new params. Provider rules exist for cases the CLI can't compute deterministically (e.g. knowledge-based defaults that require reading rules).

---

## 5. Results

Every result key declared in a task's `result:` frontmatter must be filled before `workflow done` succeeds.

### File vs data results

- **File results** — keys with a `path:` template. Content is serialized by the CLI to the declared path.
- **Data results** — keys without `path:`. Stored inline in `tasks.yml`. Data results flow into workflow scope when the stage completes, driving `each:` expansion in later stages.

Both kinds are submitted the same way: as JSON inside `--data` on `workflow done`.

### Submission rules

- **Default** (`submission: data`, `flush: deferred`) — you pass the value via `--data`; the CLI stages it under `.debo` and flushes it atomically at stage end.
- **`flush: immediate`** — file is flushed to its final path as soon as `workflow done` completes, so later steps within the same task can read it. Still submitted via `--data`.
- **`submission: direct`** — an external tool writes the file (Playwright, headless CLI, etc.). The task runs the tool, then calls `_debo workflow result --workflow $WORKFLOW_NAME --task <task-id> --key <k>` (omit `--json`) to register. The CLI runs post-write validation but doesn't author the content.

Treat `--data` as opaque result content. The engine resolves declarative metadata like result paths, but not payload values. Replace any `DESIGNBOOK_*` authoring hint in the artifact before calling `workflow done`.

### Global rule — no direct Write-tool writes

File results declared in `result:` frontmatter MUST be submitted via `workflow done --data` (or `workflow result` without `--json` for `submission: direct`). Writing a declared result path with the Write tool or any other mechanism is forbidden — `workflow done` will reject the task if it detects an untracked file at a declared result path.

### Validation

Results are validated against `schema.definitions` (base + blueprint extensions + rule constraints). JSON Schema first, then semantic validators listed under `validators:`. If `valid: false`, the response lists errors; fix and resubmit via `workflow done` or `workflow result`.

### tasks.yml runtime format

You generally don't read `tasks.yml` directly, but when debugging you'll see:

**Top-level fields:** `title`, `workflow` (workflow ID), `status`, `parent` (optional — parent workflow name), `stages` (list of stage names), `tasks` (list of task entries with `id`, `stage`, `status`, `params`, `task_file`, `rules`, `blueprints`, `result`).

**Workflow-level status:** `running`, `waiting`, `completed`, `incomplete`.

**Task-level status:** `pending`, `in-progress`, `done`, `incomplete`.

**Result state** (per key):
- `valid` absent → not yet submitted
- `valid: true` → submitted, validated, OK
- `valid: false` → submitted, validated, errors (must fix and resubmit)

If you need a resolved config variable from the shell (e.g. inside a task body that invokes an external tool), use:

```bash
_debo workflow config --var DESIGNBOOK_DIRS_CSS
```

which prints the single value to stdout. Non-zero exit for unknown variables.

---

## 6. Hooks

### Before hooks

Declared in a workflow's frontmatter as `before: [...]`. After `workflow create` completes, the response surfaces any declared before-hooks. For each entry:

- Check the `reads:` gate if present — skip silently if required reads are unsatisfied.
- Apply the `execute` policy:
  - `always` — run it.
  - `if-never-run` — run only if the hook workflow has never been archived (`workflow list --workflow <hook-id> --include-archived`).
  - `ask` — prompt the user to decide.
- Start the hook via `_debo workflow create --workflow <hook-id> --parent $WORKFLOW_NAME` and complete it fully (including its own hooks) before continuing the parent.

### After hooks

Declared as `after: [...]`. When the parent's final `workflow done` returns `{ "stage": "done" }`, iterate the `after:` entries:

- Prompt: "Run `/<workflow-id>` next?"
- If accepted, start it with `--parent $WORKFLOW_NAME` so the chain is traceable.

### Walk-through — `design-screen` → `design-verify`

The `design-screen` workflow declares:

```yaml
after:
  - workflow: /design-verify
```

When `design-screen` archives, its `done` response carries `{ "stage": "done" }`. You ask: "Run `/design-verify` next?" If the user accepts, you run:

```bash
_debo workflow create --workflow design-verify --parent $WORKFLOW_NAME \
  --params '{"scene": "shell", "product_name": "..."}'
```

and enter the task loop for `design-verify`. Its own after-hooks run in turn when it archives.

---

## 7. Untracked Workflows (`track: false`)

Workflows with `track: false` in frontmatter are utility commands, not artifact-producing workflows. They skip the full lifecycle — no `workflow create`, no `workflow done`, no `tasks.yml`.

For these:

1. Load the workflow file and read its body directly.
2. Execute whatever CLI commands or prose instructions it contains.
3. Done — there's no state to track.

---

## 8. Optimize Pass

### Optimize (`--optimize`)

Runs after hooks, only when `--optimize` was passed at workflow invocation.

1. Collect every file written during the workflow (from the `result` submissions).
2. Review for performance, maintainability, accessibility, design-system consistency.
3. Output numbered suggestions — do not apply them, only suggest.

---

## 9. Plan Mode — Capture (`--plan`)

When `--plan` is passed, the AI runs only the interactive prefix of the workflow — stages whose declaration carries `interactive: true` — then writes a plaintext plan file and stops. No deterministic (artifact-producing) stages run.

### Control flow

When `--plan` is active:

1. Create the workflow and run the task loop normally for every step whose stage has `interactive: true` (ask the user as usual).
2. After the last interactive step is `done`, do NOT continue into deterministic stages. Instead determine the plan slug (see below), write `$DESIGNBOOK_DATA/plans/<workflow>/<slug>.plan.md` using the format below, then `_debo workflow abandon --workflow $WORKFLOW_NAME`.
3. Report the written plan path to the user.

**Plan slug:** The slug is auto-generated from the interactive stage's primary target decision. For `design-screen`'s intake stage that is the `section_id` result (e.g. `homepage`, `ausbildung`). The interactive task file is responsible for choosing and providing the slug — it knows its own domain target. The slug must be lowercase kebab-case. If a plan file at `$DESIGNBOOK_DATA/plans/<workflow>/<slug>.plan.md` already exists, append `-2`, `-3`, … until the path is unique.

**Authorship boundary:** The execution loop (this step 2) is solely responsible for creating the plan file and writing the full scaffold: the `# Plan:` header and the `## Params` section (populated from resolved workflow params). Interactive task files (e.g. `intake--design-screen.md`) do NOT create the file or write `## Params` — they only append their per-decision lines to `## Decisions` and freeform notes to `## Notes`. The interactive task file MUST also provide the slug to the execution loop (as a data result or inline note) so the loop can construct the correct path.

### Plan file format

The plan file is a plaintext Markdown document written to `$DESIGNBOOK_DATA/plans/<workflow>/<slug>.plan.md` (per-workflow subfolder). It captures resolved params, per-decision prose, and freeform notes from the user. The exact template:

```markdown
# Plan: <workflow-id>

## Params
<key>: <resolved value>   # one per resolved workflow param, including any the user corrected

## Decisions
<one prose line or short block per interactive decision, e.g.>
Section: blog
Screen type: landing
Embedded entity lists: article (teaser)
Entities: article, author
Components (new): hero, article-card, author-badge

## Notes
<freeform tacit intent the schema does not capture, verbatim from the user; empty if none>
```

Section names (`## Params`, `## Decisions`, `## Notes`) are fixed — the `--from-plan` reader and interactive tasks that append to the file depend on these exact headings.

The `# Plan:` header value remains `<workflow-id>` (unchanged); only the file path layout changed to the per-workflow subfolder scheme.

---

## 10. Plan Mode — Replay (`--from-plan`)

When `--from-plan <name|hint>` is active, the AI runs the full workflow autonomously — interactive stages read decisions from the plan file instead of asking the user, and all deterministic stages run to completion.

### Control flow

When `--from-plan <name|hint>` is active:

**Step 0 — Resolve the plan file path.**

`<name|hint>` is resolved to an absolute file path before anything else runs:

1. If `<name|hint>` is an existing file path (absolute or resolvable relative to cwd) → use it directly.
2. Else look in `$DESIGNBOOK_DATA/plans/<workflow>/` for `<name|hint>.plan.md` (exact filename match, no suffix needed) → use it if found.
3. Else substring-match `<name|hint>` against all `*.plan.md` filenames in `$DESIGNBOOK_DATA/plans/<workflow>/`:
   - Exactly one match → use it.
   - Multiple matches → list the candidates and ask the user to pick one; resume when picked.
   - No matches → report an error and list all available plan files in that folder (emit the basenames without path).

Once a path is resolved, use it as `<file>` in all steps below.

1. Read `<file>`. Extract the `## Params` section and pass its key/value pairs as `--params` to `workflow create`.
2. For every step whose stage has `interactive: true`: do NOT call `workflow wait`. Instead, derive the step's result from the plan's `## Decisions` + `## Notes` sections, resolved against the CURRENT on-disk files (data-model, vision, section scenes — read fresh at replay time, not from the plan). Then call `workflow done` with the derived result.
3. Run all deterministic stages (stages without `interactive: true`) normally, exactly as in a standard non-plan run. No user interaction.
4. The engine auto-archives when every task is done — that is completion.

**Degrade rule:** If an interactive step needs a decision that is absent from the plan's `## Decisions` section, fall back to `workflow wait` for that ONE decision and ask the user. Once the user answers, resume and continue autonomously. Never guess a missing decision.

**Authorship boundary (read side):** The execution loop (step 1 above) is solely responsible for reading the `## Params` section and passing its values to `workflow create`. Individual interactive task files read ONLY `## Decisions` and `## Notes` — they never parse `## Params`. This is the symmetric counterpart to the write-side boundary in § 9.

### Reading the plan file

The plan file sections consumed by replay are:

- `## Params` — parsed as `key: value` lines and passed to `workflow create --params`.
- `## Decisions` — one line or short block per interactive decision; the interactive task file for each step is responsible for extracting the specific fields it needs from this section.
- `## Notes` — freeform context; the interactive task may use this to resolve ambiguities without asking the user.

These heading names are identical to those the capture step writes (§ 9) — never invent alternate names.
