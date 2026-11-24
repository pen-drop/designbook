# is-clear

Read-only clarity audit for a planning catalogue. Do not set up a workspace, start
Storybook, create a workflow document, or modify files.

## 1. Validate the workflow id

If `<workflow>` is missing, run:

```bash
npx storybook-addon-designbook workflow definitions
```

Print the returned ids and stop. Otherwise verify the requested id is present. If
it is not, print `Unknown workflow: <id>` and the available ids, then stop.

## 2. Load the planning catalogue

Run:

```bash
npx storybook-addon-designbook workflow discover <workflow>
```

The response contains the template and the matched planning blocks. It is a
catalogue for the intake author; it is not an executable workflow document and it
does not contain a task list yet.

If `<task>` is missing, print every available block id from the catalogue and stop.
Accept `*` as a wildcard for the whole catalogue. Otherwise, if `<task>` is not a
matched block id, print `Unknown task: <task>` and the available block ids, then stop.

## 3. Require a question

If `<question>` is empty, print `is-clear requires a question` and exit 1.

## 4. Scope the audit

For the selected block (or all blocks for `*`), inspect only the returned embedded
content: task instructions, rules, blueprints, configuration instructions, and
schema definitions. Cite the `source` field from the catalogue as provenance. Do
not reread those paths as runtime instructions and do not infer a task list from
the template.

Classify the question as:

- **Clear (confirmed)** — the embedded scope explicitly confirms it.
- **Clear (refuted)** — the embedded scope explicitly contradicts it.
- **Unclear** — the embedded scope does not answer it.

## 5. Emit one markdown block

For a confirmed answer:

```markdown
## Clear (confirmed)

**Question:** <question verbatim>
**Answer:** Yes.
**Source:** <catalogue source path>
> "<short verbatim quote>"
```

For a refuted answer, use `## Clear (refuted)` and answer `No.`

For an unclear answer:

```markdown
## Unclear

**Question:** <question verbatim>
**Finding:** <one-sentence gap>.

**Scope checked:**
- catalogue block: <block id>
- sources: <source>, <source>, ...

**Suggestion:** <the smallest rule, schema, or instruction change that would make the answer explicit>.
```

Emit no prose outside that block. Do not call `workflow create`, `workflow
validate`, `workflow start`, `workflow done`, or `execute-workflow`.
