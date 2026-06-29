# Task 4 Report: Permit `prepare:`/`generator:` in skill task-file validation

## Skill-Creator Loaded

Invoked `designbook-skill-creator` skill. Read `rules/task-files.md`, `rules/schema-files.md`, `rules/common-rules.md` per the CLAUDE.md requirement.

## Files That Enumerate Result-Property Keys

Two files document recognized result-property extension fields for file results:

1. **`.agents/skills/designbook-skill-creator/rules/task-files.md`** — line 53 (narrative prose in "Results Declare Schema, Not Just Paths" section): lists `submission:`, `flush:`, `validators:`, and JSON Schema / `$ref` as recognized file-result extension fields.

2. **`.agents/skills/designbook-skill-creator/resources/schemas.md`** — lines 218–220 (bullet list under "### File Results (with `path:`)"):  lists `path:`, `validators:`, and JSON Schema / `$ref`.

Neither file is `schemas.yml` — the keys are documented as prose/bullet lists in human-readable reference and rule narrative sections. No separate validation schema or enumeration table for result keys exists; validation is LLM-driven via the `## Checks` tables in rule files.

## Additions Made

### `rules/task-files.md` (line 53, prose description)

Extended the file-result description sentence to append:

> Optional `prepare:` (`{ cmd, as }`) to fetch a runtime validation schema by running an opaque command. Optional `generator:` (`{ jsonata }`) when the result is produced by an author-then-run JSONata artifact persisted at the given path.

### `resources/schemas.md` (bullet list under "### File Results")

Added two new bullets after `validators:`:

```
- `prepare:` — `{ cmd: string, as: string }` — runtime validation schema fetched by running an opaque command (`cmd`), stored under the key `as`
- `generator:` — `{ jsonata: string }` — the result is produced by an author-then-run JSONata artifact persisted at `jsonata` (a path)
```

Both additions are backend-neutral (no drush/Drupal mention).

## Validator Output — Zero Errors

Applied checks from `task-files.md` (TASK-01..TASK-14), `common-rules.md` (COMMON-01, COMMON-02), and `rule-files.md` (RULE-01) against the edited `rules/task-files.md`:

- **COMMON-01**: YAML frontmatter present and parseable ✓
- **COMMON-02**: No site-specific references ✓
- **RULE-01**: The additions document engine extension fields (narrative), not schema constraints that should be in frontmatter ✓

`resources/schemas.md` is a resource file; no `applies-to` glob from any rule file targets `resources/*.md`, so no checks apply to it directly. Zero errors.

## How a `prepare`/`generator` Task Was Confirmed to Pass

Created a fixture task (scratchpad only, not committed) declaring both `prepare:` and `generator:` on a file result:

```yaml
when:
  steps: [export]
result:
  type: object
  required: [export-data]
  properties:
    export-data:
      path: $DESIGNBOOK_DATA/export/data.json
      prepare:
        cmd: npx addon export-schema
        as: export-schema
      generator:
        jsonata: $DESIGNBOOK_DATA/export/generate.jsonata
      validators: [data]
      $ref: ../schemas.yml#/ExportData
```

Applied all TASK-01..TASK-14 checks:

- TASK-01: `when:` present, `result:` present ✓
- TASK-02: N/A (no `--` in filename) ✓
- TASK-03: No `stage:` in frontmatter ✓
- TASK-04: Uses `$ref:` instead of inline schema ✓
- TASK-05 to TASK-08: Body is minimal, no HOW, no redundancy ✓
- TASK-09: `export-data` has `path:` — exempt from teaching signal requirement ✓
- TASK-10 to TASK-11: Body has no hardcoded paths or undeclared file references ✓
- TASK-12: `path:` entry has `$ref:` ✓
- TASK-13: No basename collision in body ✓
- TASK-14: `result:` uses `type: object` + `properties:` ✓

Result: zero errors, zero warnings. Before the change, `prepare:` and `generator:` were undocumented — now they are explicitly listed as recognized extension fields in the two canonical reference locations. The validator (LLM-driven from `## Checks` tables) has no check that rejects unknown result keys; recognition is via documentation that the LLM reads at authoring time.

## Concerns

None. The change is purely additive documentation in two files. No validator check logic changed. The keys are now first-class recognized result-property extension fields documented consistently in both the rule narrative and the reference doc.
