# is-clear

Read-only audit. No workspace setup, no Storybook, no file modification. Treats `_debo plan` output as the source of truth for what rules, blueprints, and schemas a task carries.

## 1. Validate `<workflow>`

If `<workflow>` is missing:

```bash
_debo workflow definitions
```

Print the returned ids and stop.

Otherwise verify the id is in that list. If not, print "Unknown workflow: <id>" followed by the list, then stop.

## 2. Validate `<task>`

If `<task>` is missing:

```bash
_debo workflow definitions <workflow>
```

The JSON response has a `stages` array; each stage has a `steps` array of task ids. Print every step id (across all stages) and stop.

Accept the literal `*` as a wildcard meaning "use the entire plan as scope". If `<task>` is neither `*` nor present in any `steps` array, print "Unknown task: <task>" followed by the list of step ids and stop.

## 3. Require `<question>`

If `<question>` is empty after parsing, print `is-clear requires a question` and stop with exit 1.

## 4. Render the plan

```bash
_debo plan <workflow>
```

This produces a self-contained markdown plan with sections for each stage, plus rule, blueprint, and schema appendices.

## 5. Scope to the task

Locate the markdown section under `## Stages Detail` (or the per-stage `## Stage <n> — <name>` blocks) for the requested `<task>`. From that section collect:

- The task body verbatim.
- Every rule path it links to (from its rules subsection).
- Every blueprint path it links to.
- Every schema definition it references via the `result.*` schema slice.

If `<task>` is `*`, use the entire plan as the scope.

## 6. Evaluate the question

Read the scope content. Classify the question as one of:

- **Clear (confirmed)** — scope contains an explicit statement that confirms the question's premise.
- **Clear (refuted)** — scope contains an explicit statement that refutes the question's premise.
- **Unclear** — scope does not address the question.

## 7. Emit a single markdown block

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
