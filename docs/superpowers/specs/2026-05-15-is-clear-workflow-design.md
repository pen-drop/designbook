# is-clear Subcommand — Design

**Status:** Draft
**Date:** 2026-05-15
**Author:** Christian Wiedemann

## Summary

Add an `is-clear` subcommand to the `debo-test` skill that lets users ask a focused question about a specific task in a workflow plan and receive either a cited answer or concrete suggestions for closing the gap (new rule, schema constraint, task-body note, or follow-up question).

The subcommand performs no workspace setup, runs no workflow, and writes no files. It is a read-only clarity audit against the rendered plan of an existing workflow definition.

To support validation of the `<workflow>` and `<task>` arguments, a new CLI command — `_debo workflow definitions` — is added under the existing `workflow` group. It enumerates workflow *definitions* (the files under `skills/**/workflows/`), distinguishing them from workflow *instances* listed by `_debo workflow list`.

## Motivation

While authoring or evolving rules, blueprints, and task bodies, the team frequently asks "is this constraint actually documented anywhere?". Today the answer requires a manual scan across the skill tree. Symbols are easy to miss; rules that should exist sometimes don't; rules that do exist are sometimes in the wrong place.

`is-clear` makes the check explicit and machine-assisted. The user formulates one concrete question. The AI loads the workflow plan, scopes to one task, and either cites the source of truth or proposes a precise edit to create that source of truth.

## Out of scope

- Running the target workflow.
- Modifying rules, schemas, or task bodies. is-clear only suggests.
- General-purpose prompt-clarity checking. is-clear is question-scoped, not prompt-scoped.
- Caching plan output. Each invocation re-renders.

## CLI signature

```
/debo-test is-clear <workflow> <task> <frage>
```

Arguments:

- `<workflow>` — workflow id (kebab stem of a file under `skills/**/workflows/*.md`). Required.
- `<task>` — task id from one of the workflow's stages, **or** the literal `*` to scope to the entire plan. Required.
- `<frage>` — free-form question. Required. Captured as the remainder of the command line (no quoting required).

## Validation flow

1. If `<workflow>` is missing: run `_debo workflow definitions` and print the list, then stop.
2. If `<workflow>` is given but `<task>` is missing or is not in the workflow's stages (and not `*`): run `_debo workflow definitions <workflow>` and print task ids extracted from the JSON, then stop.
3. If `<frage>` is missing: print `is-clear requires a question` and stop with exit 1.

All validation routes through the new CLI command so the skill body does no globbing or YAML parsing of its own.

## Evaluation flow

When all three arguments are valid:

1. Run `_debo plan <workflow>` to render the full self-contained markdown plan.
2. Scope to `<task>`:
   - Locate the task section under `## Stages Detail`.
   - Collect the task body, the rules listed in that section, the blueprints listed in that section, and the schema definitions referenced by the task's result keys.
   - If `<task>` is `*`, use the entire plan as the scope.
3. Evaluate `<frage>` against the scoped content. Classify as:
   - **Klar ✓** — scope explicitly confirms the question's premise.
   - **Klar ✗** — scope explicitly refutes the question's premise.
   - **Unklar** — scope does not address the question.
4. Emit a single markdown block in the output format below. No prose outside the block.

## Output format

### Clear (confirmed)

```
## Clear (confirmed)

**Question:** <question verbatim>
**Answer:** Yes.
**Source:** <relative path>, line <n>
> "<verbatim quote>"
```

### Clear (refuted)

```
## Clear (refuted)

**Question:** <question verbatim>
**Answer:** No.
**Source:** <relative path>, line <n>
> "<verbatim quote>"
```

### Unclear

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
4. **Follow-up question:** "<follow-up question to disambiguate before adding the rule>"
```

Rules:

- Exactly one top-level `##` header per response.
- For Clear responses, the citation is mandatory: relative path, line number, and a literal quote from the source.
- For Unclear responses, the Scope checked block is mandatory: the user must see which files were considered so they can challenge the scope if needed.
- Suggestions are ordered by enforcement strength: rule > schema > task-body > follow-up question. Include only the suggestions that apply; do not pad.

## CLI changes

### New command: `_debo workflow definitions`

Path: `packages/storybook-addon-designbook/src/cli/workflow.ts` (extends the existing `workflow` command group).

Behavior:

- **No positional arg** — glob `<agents-dir>/skills/**/workflows/*.md`, print the kebab stem of each match, sorted, one per line.
- **With `<workflow-id>` positional** — resolve the workflow file using the shared discovery helper, parse YAML frontmatter, emit JSON to stdout:
  ```json
  {
    "id": "design-component",
    "file": "/abs/path/to/design-component.md",
    "stages": [
      { "name": "intake", "steps": ["intake--design-component"] },
      { "name": "design", "steps": ["create-component", "polish"] }
    ]
  }
  ```
- **Unknown workflow** — write `Error: Workflow not found: "<id>"` to stderr, exit 1.

### Shared discovery module

Path: `packages/storybook-addon-designbook/src/cli/workflow-discovery.ts` (new file).

Exports:

- `listWorkflowDefinitions(agentsDir: string): string[]` — sorted kebab stems.
- `loadWorkflowDefinition(workflowId: string, agentsDir: string): { id, file, stages }` — throws on unknown id; reuses the same glob pattern as `plan.ts`.

`plan.ts` currently defines `resolveWorkflowFile()` inline. Move that helper into `workflow-discovery.ts` and re-export from there. Update `plan.ts` to import from the new module.

### Tests

Path: `packages/storybook-addon-designbook/src/cli/__tests__/workflow-definitions.test.ts`.

Cases:

1. List mode returns sorted kebab stems against a fixture agents dir.
2. Detail mode returns the expected JSON shape for a fixture workflow with multiple stages.
3. Detail mode exits non-zero with a message on stderr for an unknown workflow id.

The fixture agents dir lives alongside existing CLI test fixtures and contains at least two workflow files in distinct skill directories.

## Skill changes

Path: `.agents/skills/designbook-test/SKILL.md`.

### Frontmatter

Extend the `subcommands:` map with an `is-clear` entry:

```yaml
is-clear:
  hint: "<workflow> <task> <frage>"
  description: Audit whether a specific question is answered by the loaded rules, blueprints, and schema of a workflow task. Suggests rule, schema, or task-body changes when the answer is missing.
```

### Dispatch table

Add the row:

```
| `is-clear` | `<workflow> <task> <frage>` | Read-only clarity audit against a workflow's plan |
```

### New section

Add `## is-clear` after `## research`. The section, in English, instructs the AI to:

1. Parse `$ARGUMENTS` as `<workflow> <task>` followed by the remainder as `<frage>`.
2. Validate `<workflow>` via `_debo workflow definitions` (no positional). If missing or unknown, print the list and stop.
3. Validate `<task>` via `_debo workflow definitions <workflow>`. Accept `*` as a wildcard. If invalid, print available task ids and stop.
4. If `<frage>` is empty, stop with `is-clear requires a question`.
5. Render the plan via `_debo plan <workflow>`.
6. Extract the scope for `<task>` as described under Evaluation flow.
7. Evaluate the question and emit a single markdown block matching one of the three templates under Output format. Templates are reproduced verbatim in the skill so the AI has them at the point of use.

The section explicitly forbids workspace setup, Storybook start, and any file modification.

## Manual verification

After implementation, the author runs:

1. `/debo-test is-clear` — expect a list of all workflow ids.
2. `/debo-test is-clear design-component` — expect a list of `design-component` task ids.
3. `/debo-test is-clear design-component create-component "may component props contain hyphens?"` — expect either a Klar block citing an existing naming rule, or an Unklar block with proposals.
4. `/debo-test is-clear design-component create-component "do props use snake_case?"` — expect the inverse classification of (3).
5. `/debo-test is-clear design-component * "what triggers a stage transition?"` — expect a Klar response citing the workflow-execution doc or an Unklar response if no scope-local rule exists.

## Risks and trade-offs

- **AI judgment quality.** Classification depends on the model's ability to recognize when a quoted rule actually answers the question. Mitigation: the output format forces a literal quote, making false-positive Klar responses easy to spot during review.
- **Scope completeness.** The reverse index in the rendered plan determines which rules/blueprints are listed per task. If a rule applies via mechanism the plan does not surface (e.g., dynamically provided rules), is-clear will miss it. Acceptable for now; revisit if false-Unklar responses become common.
- **No persistence.** is-clear does not record its findings. Repeated questions across sessions re-run the full evaluation. Caching is not added until a real use case demands it.
