# Workflow Execution

Operational guide for running a designbook workflow. You are the AI; this tells you what commands to run, what responses to expect, and what to do with them.

All CLI calls in this doc use `_debo` as shorthand for `npx storybook-addon-designbook`. See [`cli-workflow.md`](cli-workflow.md) for the full CLI reference.

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
- **`submission: direct`** — an external tool writes the file (Playwright, headless CLI, etc.). The task runs the tool, then calls `_debo workflow result --key <k> --external` to register. The CLI runs post-write validation but doesn't author the content.

### Global rule — no direct Write-tool writes

File results declared in `result:` frontmatter MUST be submitted via `workflow done --data` (or `workflow result --external` for `submission: direct`). Writing a declared result path with the Write tool or any other mechanism is forbidden — `workflow done` will reject the task if it detects an untracked file at a declared result path.

### Validation

Results are validated against `schema.definitions` (base + blueprint extensions + rule constraints). JSON Schema first, then semantic validators listed under `validators:`. If `valid: false`, the response lists errors; fix and resubmit via `workflow done` or `workflow result`.

### tasks.yml runtime format

You generally don't read `tasks.yml` directly, but when debugging you'll see:

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

## 8. Optimize and Research Passes

### Optimize (`--optimize`)

Runs after hooks, only when `--optimize` was passed at workflow invocation.

1. Collect every file written during the workflow (from the `result` submissions).
2. Review for performance, maintainability, accessibility, design-system consistency.
3. Output numbered suggestions — do not apply them, only suggest.

### Research (`--research`, internal)

Runs after the optimize pass, only when `--research` was set.

- **During the workflow:** append `--log` to every `_debo workflow …` CLI call so entries in `designbook/dbo.log` carry `tagged: true`.
- **After the workflow:** load `designbook-skill-creator` and follow [`resources/research.md`](../../designbook-skill-creator/resources/research.md). The audit combines archived `tasks.yml` and tagged `dbo.log` entries (CLI failures, retries, unresolved params).
