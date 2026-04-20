## Why

After `task-output-schema` introduced `result:` declarations with JSON Schema, task files still contain explicit CLI commands (`workflow result --key X --json '...'`, `workflow done --task $TASK_ID`) that the AI must execute verbatim. This creates three problems:

1. **AI ergonomics** — The AI juggles Bash variable expansion, JSON escaping (`"\"${scene}\""`), and multiple sequential CLI calls to pass simple data between stages. Each intake task repeats the same ceremony: N `workflow result` calls + 1 `workflow done`.

2. **Dual purpose** — Simple workflows (vision, tokens, data-model) split into intake (gather data) + create (write file) even though the two stages share the same data. The create task is often just a format template the AI applies to the gathered params. The stage boundary adds complexity without value.

3. **Rules can't compose declaratively** — Rules today are prose instructions the AI interprets. They can't add questions, provide defaults, or constrain choices in a way the engine can enforce. Integration skills (Drupal, Tailwind) should be able to extend a task's schema to add framework-specific fields.

## What Changes

- **Schema-driven questioning**: When a task's `result:` schema has required properties without values, the AI asks for them. The `title` field on each property guides the question. The task description provides context for *how* to ask, not *what* to ask.
- **Schema-driven serialization**: The engine serializes result data based on the `path:` extension. `.yml` dumps as YAML. `.json` dumps as JSON. `.md` flattens using `title` fields as headings, with optional `template:` for custom formatting.
- **Implicit file collection**: When `workflow done` is called, the engine auto-collects file results at declared paths. No explicit `workflow result --key` needed for files.
- **`workflow done --data`**: Single JSON blob for all data results, replacing N separate `workflow result --key --json` calls.
- **Rule schema composition**: Rules gain `extends:` (add properties/questions), `provides:` (supply defaults), and `constrains:` (add enums/patterns) to merge into the task's result schema at resolution time.
- **Optional `template:`**: For markdown results, an inline template can override convention-based flattening. Rules can append to templates via `template-append:`.
- **Intake+Create merge**: Simple two-stage workflows (vision, tokens, data-model, sample-data, sections) can collapse to a single stage — the task gathers AND writes.

## Capabilities

### New Capabilities
- `schema-driven-serialization`: Engine serializes result objects to files based on path extension and schema `title` fields. Convention-based MD flattening with optional template override.
- `rule-schema-composition`: Rules declaratively extend task result schemas — `extends:`, `provides:`, `constrains:` merge at `workflow instructions` time.
- `implicit-result-collection`: `workflow done` auto-detects file results at declared paths. `--data` flag accepts all data results in one JSON blob.

### Modified Capabilities
- `task-result-schema`: `result:` properties gain `title` (used for MD headings and questioning). `template:` added as optional serialization override.
- `workflow-execution`: Task files no longer contain CLI commands for result writing. `workflow-execution.md` rules define the generic done protocol. AI calls only `workflow done` (with optional `--data`).
- `workflow-format`: Rule frontmatter gains `extends:`, `provides:`, `constrains:` fields. `workflow instructions` response includes merged schema.

## Impact

- **Part 2 (storybook-addon-designbook)**: `workflow done` gains `--data` flag. New `flattenToMarkdown(schema, data)` serializer. `workflow instructions` merges rule schema extensions into task schema. Schema `title` fields propagated through resolution.
- **Part 1 (core skill)**: All two-stage intake+create workflows can collapse to single-stage. Task files lose all `workflow result` / `workflow done` CLI references. `workflow-execution.md` gains generic "after task completion" protocol. Rules gain declarative `extends:`/`provides:`/`constrains:` frontmatter.
- **Part 3 (integration skills)**: Rules can add framework-specific properties to result schemas (e.g., Drupal adds `entity_type`, Tailwind provides breakpoint defaults).

## Dependencies

- `task-output-schema` (in-progress) — provides the `result:` schema infrastructure, scope model, and `workflow result` command that this change builds upon
