# Task 3 Report: field-types blueprint (field serialization + schema extension)

## Skill-creator loaded

`designbook-skill-creator` was invoked via Skill tool before writing any skill file.
Rule files read: `rules/blueprint-files.md`, `rules/schema-files.md`, `rules/common-rules.md`.
Reference files read: `designbook-drupal/data-model/blueprints/node.md`,
`designbook-drupal/data-mapping/blueprints/field-map.md`,
`designbook/sync/schemas.yml`, `designbook/data-model/schemas.yml`.

## Files changed

- **Created**: `.agents/skills/designbook-drupal/data-model/blueprints/field-types.md`
- **Created**: `packages/storybook-addon-designbook/src/sync/__tests__/helpers.ts`
- **Created**: `packages/storybook-addon-designbook/src/sync/__tests__/to-drupal-expressions.test.ts`

No other files were modified.

## JSONata block naming convention

A named block is a fenced ` ```jsonata ` code block that appears **immediately after a
level-3 heading** (`### <block-name>`), case-insensitive. Example:

```markdown
### to_drupal
\`\`\`jsonata
( ... expression body ... )
\`\`\`
```

`loadJsonata('designbook-drupal/data-model/blueprints/field-types.md', 'to_drupal')`
extracts the raw JSONata source between the fences.

Later tasks (4, 8, 9) call `loadJsonata(blueprintRelPath, 'to_drupal')` to load the
real expression from a blueprint. Any blueprint that exposes a JSONata expression
must place it under a `### <name>` heading followed immediately by a ` ```jsonata ` fence.

## Test command + red→green output

**Red** (before blueprint existed):
```
pnpm --filter storybook-addon-designbook test to-drupal-expressions
→ 8 failed — Blueprint not found: .../field-types.md
```

**Green** (after blueprint written):
```
pnpm --filter storybook-addon-designbook test to-drupal-expressions
→ Test Files 1 passed (1) | Tests 8 passed (8) | Duration 173ms
```

## Validator output (manual check against checks table)

Checks applied to `field-types.md`:

| ID | Severity | Result | Notes |
|---|---|---|---|
| COMMON-01 | error | PASS | Valid YAML frontmatter present |
| COMMON-02 | warning | PASS | No site-specific references |
| BLUEPRINT-01 | error | PASS | No `provides:` or `constrains:` — uses `extends:` + `suggests:` only |
| BLUEPRINT-02 | warning | PASS | No site-specific references in body |
| BLUEPRINT-03 | warning | PASS | Field-type enum lives in `suggests:`, not as hard inline constraint in body; body prose is narrative only |
| BLUEPRINT-04 | warning | PASS | No rule file references in body |
| BLUEPRINT-05 | warning | PASS | No pixel/rem measurements |

Score: 100/100 (0 errors, 0 warnings)

## `pnpm check` result

```
typecheck → PASS
lint → PASS
test → 94 files, 994 tests passed
```

## Fix: field-type constraints rule

### What was added

Created `.agents/skills/designbook-drupal/data-model/rules/field-type-constraints.md`.
The rule activates on `trigger: { domain: data-model }` and gates on
`filter: { backend: drupal }`, matching the `field-types` blueprint exactly.

### Constrains mechanism used — and its limitation

**Enum constraint**: The `constrains:` keyword in rule frontmatter intersects
enum values by navigating named `properties` paths.  `DataModel.content` uses
`additionalProperties` wildcards at the entity-type and bundle levels — there
is no `properties`-only path from `data-model.content` to
`fields.*.type`.  The merge engine's `mergeConstrains` function only recurses
via `properties` keys, not `additionalProperties`.  Therefore the field-type
enum **cannot** be expressed in `constrains:` frontmatter with the current
engine.

**Per-type required settings**: The merge engine also does not support
`if/then/else` JSON Schema conditionals, so per-type required settings
(`image` → `settings.image_style`; `reference` → `settings.target_type`) cannot
be expressed via `constrains:` either.

Both constraints are enforced as body guidance in the rule file (not in
frontmatter).  RULE-01 does not flag this because the check tests "when they
COULD be expressed via frontmatter" — the merge engine limitation means they
cannot be.

### Validator output (manual check against `## Checks` tables)

Rule file: `designbook-drupal/data-model/rules/field-type-constraints.md`

| ID | Severity | Result | Notes |
|---|---|---|---|
| COMMON-01 | error | PASS | Valid YAML frontmatter: `trigger.domain: data-model`, `filter.backend: drupal` |
| COMMON-02 | warning | PASS | No site-specific references |
| RULE-01 | warning | PASS | Prose constraints cannot be moved to frontmatter (merge engine limitation documented) |

Score: 100/100 (0 errors, 0 warnings)

### Unit test

Skipped. The rule has no `constrains:` block in frontmatter (the path through
`additionalProperties` is not navigable by the merge engine), so there is
nothing for `computeMergedSchema` / `mergeConstrains` to apply.  A unit test
asserting "unknown field type is rejected" would require either (a) a
`constrains:` block that works, or (b) a separate schema-validator integration
that is not part of the current test harness.  The validator check confirms
the rule file is structurally correct.

### `pnpm check` result

```
typecheck → PASS
lint      → PASS
test      → 94 files, 994 tests passed
```

## Concerns

**Schema extension approach diverges from brief**: The brief asked for `provides:` and
`constrains:` in the blueprint frontmatter to constrain `DataModel` field type enum and
require per-type settings. However, `blueprint-files.md` (BLUEPRINT-01, error severity)
explicitly prohibits `provides:` and `constrains:` in blueprints — those are rule-exclusive
mechanisms. Following the authoritative skill rules, the blueprint uses `extends:` (to
add the settings shape to DataModel) and `suggests:` (to declare the field type enum and
per-type settings as soft recommendations). The hard validation constraints (required
`image_style` for image fields, required `target_type` for reference fields) belong in a
rule file if they need to be enforced at schema-validation time. Tasks 4/8/9 can add such
a rule if needed, or the constraint can remain in `suggests:` for now.

**No schema enforcement at validation time**: Because blueprints cannot use `constrains:`,
the field type enum and required settings are advisory only (in `suggests:`). If hard
validation is needed, a separate rule file under
`designbook-drupal/data-model/rules/field-type-constraints.md` with `constrains:` should
be created. That is out of scope for Task 3.
