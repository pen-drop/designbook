# Task 4 Report: Retire static to_drupal contract + deps-closure

## Files Deleted (git rm)

- `.agents/skills/designbook/sync/tasks/resolve-deps.md` — task referencing the removed `DrupalConfigSet`/`resolve-deps` stage
- `packages/storybook-addon-designbook/src/sync/deps-closure.ts` — TypeScript closure expansion utility
- `packages/storybook-addon-designbook/src/sync/__tests__/deps-closure.test.ts` — test for the above

## Schema Definitions Removed from `designbook/sync/schemas.yml`

Removed both:
- `DrupalConfigEntity` — single config object shape (superseded: config-name/data written per-unit by transform)
- `DrupalConfigSet` — array of DrupalConfigEntity (superseded: no batch set emitted)

Kept: `ExportSlice`, `ConfigNameUnit`, `ExportSummary`, `SyncResult`.

Also removed the stale file-level comment that named the two removed types.

## Straggler References Fixed

All references to `DrupalConfigEntity` / `DrupalConfigSet` outside the now-deleted files were fixed:

| File | Fix |
|---|---|
| `.agents/skills/designbook/sync/tasks/outtake.md` | Replaced "one `config-file` result per `DrupalConfigEntity`" → "one `config-file` result per `config-name` unit" |
| `.agents/skills/designbook/data-model/blueprints/image_style.md` | Updated prose: "into a `DrupalConfigEntity[]`" → "into one or more config-name units per config-file entry" |
| `.agents/skills/designbook-drupal/data-model/blueprints/node.md` | "into `DrupalConfigEntity[]`" → "into config-name/data pairs" + added generator-pattern note |
| `.agents/skills/designbook-drupal/data-model/blueprints/media.md` | Same |
| `.agents/skills/designbook-drupal/data-model/blueprints/view.md` | Same |
| `.agents/skills/designbook-drupal/data-model/blueprints/block_content.md` | Same |
| `.agents/skills/designbook-drupal/data-model/blueprints/taxonomy_term.md` | Same |
| `.agents/skills/designbook-drupal/data-model/blueprints/field-types.md` | "into a `DrupalConfigEntity[]` pair … satisfying the `DrupalConfigEntity` contract from `designbook/sync/schemas.yml`" → "into a config-name/data pair … following the config-name/data shape used by the sync transform stage" + added generator-pattern note |

Note: `packages/storybook-addon-designbook/src/sync/__tests__/sync-to.smoke.test.ts` defines a local TypeScript `interface DrupalConfigEntity` inline (not imported from any deleted file). This is a test-local structural assertion matching the real output shape — not a straggler. It was left in place and the test suite passes.

## Blueprints Reframed

Added the following heading note to the `## Drupal Config Export` section of each blueprint:

> **Generator pattern.** The JSONata below is the reference pattern for the generated transform.
> The concrete `.jsonata` is authored per config-name task against the prepare-fetched schema.

Blueprints reframed (6 data-model blueprints):
1. `designbook-drupal/data-model/blueprints/node.md`
2. `designbook-drupal/data-model/blueprints/media.md`
3. `designbook-drupal/data-model/blueprints/view.md`
4. `designbook-drupal/data-model/blueprints/block_content.md`
5. `designbook-drupal/data-model/blueprints/taxonomy_term.md`
6. `designbook-drupal/data-model/blueprints/field-types.md`

Data-mapping blueprints (`field-map`, `canvas`, `layout-builder`, `views`) have no `### to_drupal` sections — no reframing needed there.

## drupal-config.md Rule Trimmed

Removed two invariants from `.agents/skills/designbook-drupal/data-model/rules/drupal-config.md`:

1. **`field.storage` deduplication** — removed. Storage dedup is now resolve-filter's concern; per-config-name iteration makes the dedup invariant irrelevant at the generator level.
2. **Dependency completeness** — removed. Dependency wiring is Drupal's responsibility via `cim`/export; individual config-name generators declare deps per their own schema fetch.

Kept: **`config_name` format** invariant (pattern `^[a-z0-9_]+(\.[a-z0-9_]+)+$`). This remains a hard constraint that has nothing to do with batch-set logic.

Rule title updated from "Drupal Config Export Invariants" to "Drupal Config Name Format" to reflect the trimmed scope.

Rule was NOT deleted (one valid invariant remains).

## Grep-Clean Confirmation

```
grep -rn "DrupalConfigEntity|DrupalConfigSet" .agents/skills/
  → 0 matches

grep -rn "DrupalConfigEntity|DrupalConfigSet|deps-closure" packages/
  → sync-to.smoke.test.ts (local interface — not imported, not a straggler)

grep -rn "deps-closure|closure(" packages/storybook-addon-designbook/src
  → 0 matches
```

## Validator Check (skill-creator rules applied manually)

Checked all edited skill files against the applicable rule sets:

**schemas.yml (COMMON-01, SCHEMA-01..04):**
- COMMON-01: frontmatter absent (schemas.yml has no frontmatter — same as before) ✓
- SCHEMA-01: No `$ref` remains that references the removed types ✓
- SCHEMA-02/03/04: Remaining types unchanged ✓

**outtake.md (COMMON-01, TASK-01..14):**
- COMMON-01: frontmatter present ✓; no site-specific refs ✓
- Prose fix is minimal and accurate; no new checks triggered ✓

**Blueprint files — node/media/view/block_content/taxonomy_term/field-types (BLUEPRINT-01..05):**
- BLUEPRINT-01: No `provides:` or `constrains:` added ✓
- BLUEPRINT-02: No site-specific references ✓
- BLUEPRINT-03: Added note is pure narrative guidance, no enum/required/type prose ✓
- BLUEPRINT-04: Note does not reference rule files ✓
- BLUEPRINT-05: No measured layout values ✓

**drupal-config.md (COMMON-01, RULE-01):**
- COMMON-01: frontmatter present and parseable ✓
- RULE-01: No schema constraints expressed as prose (the format invariant is already pure prose constraint, not an enum/required/type restriction that could go in frontmatter) ✓

Zero errors across all edited files.

## pnpm check

```
typecheck: pass
lint: pass
test: 95 test files, 1028 tests — all passed
deps-closure.test.ts removed cleanly, no dangling imports
```

## Fix: image_style reframe

`designbook/data-model/blueprints/image_style.md` was missing the generator-pattern blockquote
that the 6 `designbook-drupal` data-model blueprints received in Task 4. Added verbatim after
`### to_drupal`, before the JSONata fence:

> **Generator pattern.** The JSONata below is the reference pattern for the generated transform.
> The concrete `.jsonata` is authored per config-name task against the prepare-fetched schema.

Validator result (COMMON-01, COMMON-02, BLUEPRINT-01..05): **zero errors, zero warnings.**
