---
name: debo-test
user-invocable: true
argument-hint: "<subcommand> <suite> <case>"
subcommands:
  run:
    hint: "<suite> [<case>]"
    description: Set up a test workspace and run a workflow case
  research:
    hint: "<suite> <case> [--iterations N] [--target T] [--plateau M] [--baseline-only] [--scope <glob>]"
    description: Autonomous skill-improvement loop; --baseline-only for a single audit pass
  is-clear:
    hint: "<workflow> <task> <question>"
    description: Audit whether a specific question is answered by the loaded rules, blueprints, and schema of a workflow task. Suggests rule, schema, or task-body changes when the answer is missing.
description: >
  Test workspace runner and autonomous research loop for designbook workflows.
  Use for manual testing with pre-built fixture data, or for iterative skill improvement.
---

## Dispatch

Parse `$ARGUMENTS` as: `<subcommand> <suite> [<case>] [options]`

| Subcommand | Signature | Description |
|---|---|---|
| `run` | `<suite> [<case>]` | Set up workspace and run a test case |
| `research` | `<suite> <case> [options]` | Autonomous improvement loop |
| `is-clear` | `<workflow> <task> <question>` | Read-only clarity audit against a workflow's plan |

Unknown subcommand → print available subcommands and stop.

---

## run

### 1. List cases (no case argument)

If only `<suite>` is provided:

1. List all `.yaml` files in `fixtures/<suite>/cases/`
2. Show them as a numbered list with the `fixtures` field from each case
3. Ask the user to pick one

### 2. Setup workspace

Always create a fresh workspace — never reuse an existing one.

1. If `workspaces/<suite>` already exists, **delete it first**: `rm -rf workspaces/<suite>`
2. Run `./scripts/setup-workspace.sh <suite>` — creates the base workspace with Storybook infrastructure and `pnpm install`
3. Run: `./scripts/setup-test.sh <suite> <case> --into workspaces/<suite>` — layers fixtures and config onto the workspace
4. Report the workspace path to the user

### 3. Start Storybook

After setup, start Storybook via the addon CLI:

```bash
_debo() { npx storybook-addon-designbook "$@"; }
eval "$(_debo config)"
_debo storybook start
```

Report the Storybook URL to the user (`_debo storybook status` returns the `url` field when running).

### 4. Display prompt and confirm

1. Read `fixtures/<suite>/cases/<case>.yaml`
2. Display the `prompt` field to the user
3. Ask: "Execute this prompt in the workspace? (y/n)"
4. If **yes**: `cd` into the workspace and execute the prompt (run the workflow)
5. If **no**: Tell the user the workspace is ready for manual use

Use `_debo storybook stop` to stop Storybook when the session ends or the user requests it.

### 5. Snapshot offer (after workflow completion)

After the workflow completes:

1. `cd` into the workspace directory
2. Run `git diff --name-only` and `git ls-files --others --exclude-standard` to find changed/new files
3. Exclude `.agents/`, `.claude/`, `openspec/`, `.storybook/`, `node_modules/` from the list
4. Display the list of changed files to the user
5. Ask: "Save as fixture? Enter name (default: <case>) or 'n' to skip"
6. If the user provides a name (or accepts default):
   - For each changed/new file, copy it to `fixtures/<suite>/<fixture-name>/` preserving the workspace-relative path
   - Report: "✓ Fixture saved to fixtures/<suite>/<fixture-name>/"
7. If the user declines: do nothing, workspace remains

---

## research

Parse from `$ARGUMENTS` (after `research <suite> <case>`):
- `--iterations N` (default 25)
- `--target T` (default 100)
- `--plateau M` (default 5)
- `--baseline-only` — single audit pass (iteration 0 only); equivalent to `--iterations 0`
- `--scope <glob>` (comma-separated)

If `<case>` is missing: error "research requires a case", list available cases, stop.

Load `research.md` and follow it.

---

## is-clear

Read-only audit. No workspace setup, no Storybook, no file modification. Treats `_debo plan` output as the source of truth for what rules, blueprints, and schemas a task carries.

Parse `$ARGUMENTS` after `is-clear` as: `<workflow> <task>` followed by everything remaining as `<question>` (no quoting required; rest-of-line is the question).

### 1. Validate `<workflow>`

If `<workflow>` is missing:

```bash
_debo workflow definitions
```

Print the returned ids and stop.

Otherwise verify the id is in that list. If not, print "Unknown workflow: <id>" followed by the list, then stop.

### 2. Validate `<task>`

If `<task>` is missing:

```bash
_debo workflow definitions <workflow>
```

The JSON response has a `stages` array; each stage has a `steps` array of task ids. Print every step id (across all stages) and stop.

Accept the literal `*` as a wildcard meaning "use the entire plan as scope". If `<task>` is neither `*` nor present in any `steps` array, print "Unknown task: <task>" followed by the list of step ids and stop.

### 3. Require `<question>`

If `<question>` is empty after parsing, print `is-clear requires a question` and stop with exit 1.

### 4. Render the plan

```bash
_debo plan <workflow>
```

This produces a self-contained markdown plan with sections for each stage, plus rule, blueprint, and schema appendices.

### 5. Scope to the task

Locate the markdown section under `## Stages Detail` (or the per-stage `## Stage <n> — <name>` blocks) for the requested `<task>`. From that section collect:

- The task body verbatim.
- Every rule path it links to (from its rules subsection).
- Every blueprint path it links to.
- Every schema definition it references via the `result.*` schema slice.

If `<task>` is `*`, use the entire plan as the scope.

### 6. Evaluate the question

Read the scope content. Classify the question as one of:

- **Clear (confirmed)** — scope contains an explicit statement that confirms the question's premise.
- **Clear (refuted)** — scope contains an explicit statement that refutes the question's premise.
- **Unclear** — scope does not address the question.

### 7. Emit a single markdown block

For **Clear (confirmed)**:

```
## Clear (confirmed)

**Question:** <question verbatim>
**Answer:** Yes.
**Source:** <relative path>, line <n>
> "<verbatim quote>"
```

For **Clear (refuted)**:

```
## Clear (refuted)

**Question:** <question verbatim>
**Answer:** No.
**Source:** <relative path>, line <n>
> "<verbatim quote>"
```

For **Unclear**:

```
## Unclear

**Question:** <question verbatim>
**Finding:** <one-sentence description of the gap>.

**Scope checked:**
- task: <path>
- rules: <path>, <path>, ...
- blueprint: <path>
- schema definitions: <name>, <name>

**Suggestions (prioritized):**
1. **Rule** — <suggested rule file + literal proposed text>.
2. **Schema** — <suggested schema definition + literal yaml snippet>.
3. **Task body** — <suggested task file + literal proposed paragraph>.
4. **Follow-up question:** "<follow-up to disambiguate before adding the rule>"
```

Rules for the output:

- Exactly one top-level `##` header per response.
- For Clear responses, the citation is mandatory: relative path, line number, and a literal quote from the source.
- For Unclear responses, the **Scope checked** block is mandatory so the user can challenge it.
- Suggestions are ordered by enforcement strength: rule > schema > task-body > follow-up question. Include only the suggestions that apply; do not pad.

Do not emit prose outside the block. Do not run `_debo workflow create`, do not write files, do not start Storybook.

---

## Error Handling

- If `fixtures/<suite>/` does not exist: list available suites from `fixtures/`
- If `fixtures/<suite>/cases/<case>.yaml` does not exist: list available cases
- If `setup-test.sh` fails: show the error and stop
