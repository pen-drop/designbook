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

## Fix: review findings

### Findings addressed

| ID | Finding | File(s) changed | Status |
|---|---|---|---|
| I-1 | `runJsonata` cast `input as jsonata.Expression` (wrong — that's the compiled-expression type). Changed to `input as Record<string, unknown>` matching the pattern in `validators/entity-mapping.ts`. | `helpers.ts` | FIXED |
| I-2 | IMAGE field.field record lacked `data.settings.image_style === 'hero'` assertion. Added `expect.objectContaining({ settings: { image_style: 'hero' } })` on the `field.field.node.article.field_hero` record. | `to-drupal-expressions.test.ts` | FIXED |
| I-3 | REFERENCE field assertions: storage record lacked `data.settings.target_type === 'user'`; field.field record lacked `data.settings.handler` assertion. Added `settings: expect.objectContaining({ target_type: 'user' })` on storage and `settings: expect.objectContaining({ handler: 'default' })` on the field.field record. | `to-drupal-expressions.test.ts` | FIXED |
| M-1 | `loadJsonata` anchored the skills dir via a fragile fixed depth count (`path.resolve(__dirname, '..', '..', '..', '..', '..')`). Replaced with an `findAncestorWithDir` helper that walks ancestors until it finds a directory containing `.agents`. Robust across nested worktrees and CI. | `helpers.ts` | FIXED |
| M-2 | `$merge([{...}])` wrapping single object literal in both `$fieldToStorage` and `$fieldToInstance`. Removed the no-op `$merge`, returning the object literal directly. Output is identical (confirmed by all 8 tests passing). | `field-types.md` | FIXED |
| M-3 | Verified non-issue: `field-type-constraints.md` omits `name:` (rule file has `trigger:` + `filter:` only in frontmatter). Per `rule-files.md`, `name:` is optional; the `COMMON-01` check only requires valid YAML frontmatter with a recognized key (`trigger:`, `filter:`, etc.) present. Score: 100/100. | `field-type-constraints.md` | CONFIRMED NON-ISSUE |
| M-4 | `loadJsonata` regex tightened from `\n+` (unlimited blank lines) to `\n{1,2}` (at most one blank line) for the heading→fence gap. Matches the documented "immediately after the heading" convention. | `helpers.ts` | FIXED |

### Test command + output

```
pnpm --filter storybook-addon-designbook test to-drupal-expressions
→ Test Files 1 passed (1) | Tests 8 passed (8) | Duration 150ms
```

All new assertions (I-2 image_style, I-3 target_type + handler) exercise real emitted shape from the blueprint expression and pass against the actual JSONata output.

### Validator output

**`field-types.md`** (blueprint) — re-validated after M-2 `$merge` removal:

| ID | Severity | Result | Notes |
|---|---|---|---|
| BLUEPRINT-01 | error | PASS | No `provides:` or `constrains:` in frontmatter |
| BLUEPRINT-02 | warning | PASS | No site-specific references in body |
| BLUEPRINT-03 | warning | PASS | Field-type mapping table is integration-specific implementation (appropriate for blueprint body); enum lives in `suggests:` frontmatter |
| BLUEPRINT-04 | warning | PASS | No rule file references in body |
| BLUEPRINT-05 | warning | PASS | No measured layout values |

Score: 100/100 (0 errors, 0 warnings)

**`field-type-constraints.md`** (rule) — M-3 non-issue check:

| ID | Severity | Result | Notes |
|---|---|---|---|
| COMMON-01 | error | PASS | Valid YAML frontmatter (`trigger:` + `filter:`) |
| COMMON-02 | warning | PASS | No site-specific references |
| RULE-01 | warning | PASS | Prose constraints cannot be moved to `constrains:` (merge engine cannot recurse through `additionalProperties`) — limitation documented in rule body |

Score: 100/100 (0 errors, 0 warnings)

### `pnpm check` result

```
typecheck → PASS
lint      → PASS
test      → 94 files, 994 tests passed
```
