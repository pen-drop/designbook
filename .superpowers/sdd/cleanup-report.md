# Cleanup Report: Schema-Driven Sync Clarity

Date: 2026-06-30  
Branch: worktree-export  
Base commit: a3bd44c1

---

## 1. Blueprints Condensed

All `### to_drupal` JSONata blocks replaced with concise PATTERN NOTES. Frontmatter (`type:`, `name:`, `priority:`, `trigger:`, `filter:`, `extends:`, `suggests:`) and `base_fields`/`bundle_properties`/data-model conventions preserved unchanged.

| Blueprint | Before (lines) | After (lines) | What changed |
|---|---|---|---|
| `designbook-drupal/.../node.md` | 81 | 38 | Replaced 38-line JSONata block with 7-line pattern note |
| `designbook-drupal/.../media.md` | 86 | 42 | Replaced 38-line JSONata block with 8-line pattern note |
| `designbook-drupal/.../view.md` | 130 | 53 | Replaced 69-line JSONata block with 7-line pattern note; kept Rules section |
| `designbook-drupal/.../block_content.md` | 79 | 39 | Replaced 32-line JSONata block with 8-line pattern note |
| `designbook-drupal/.../taxonomy_term.md` | 85 | 42 | Replaced 33-line JSONata block with 9-line pattern note (preserves taxonomy config-name quirk) |
| `designbook-drupal/.../field-types.md` | 215 | 116 | Replaced 110-line prelude JSONata block with 20-line field serialization prose pattern; kept field-type mapping table + special cases |
| `designbook/.../image_style.md` | 138 | 88 | Replaced 43-line JSONata block with 8-line pattern note (preserves UUID rationale / idempotency note) |

**Pattern note content for entity-type blueprints:** input shape, output config-name units list (config_name patterns + key data fields), `langcode`/`status`/`dependencies` invariants, pointer to `field-types.md` for field serialization.

**field-types.md:** retained the field-type mapping table and special cases (image/reference settings); replaced the executable `$fieldToStorage`/`$fieldToInstance` JSONata functions with prose describing the `field.storage.*` shape, the `field.field.*` shape, cardinality rule, dependency array construction, and settings special cases.

---

## 2. Tests Retired

```
git rm packages/storybook-addon-designbook/src/sync/__tests__/to-drupal-expressions.test.ts
git rm packages/storybook-addon-designbook/src/sync/__tests__/sync-to.smoke.test.ts
```

Both executed the static `to_drupal` contract from blueprint JSONata blocks — a contract the runtime no longer uses (sync is now schema-driven per-config-name). Plan-3 live e2e + prepare/generator engine tests are the real validation.

---

## 3. Helper Orphaning

### grep results

```
grep -rn "helpers|loadJsonata|runComposed|composeJsonata|runJsonata|fake-schema-cmd" packages/.../src
```

After removing the 2 test files:

- `fake-schema-cmd.sh` — still referenced by `validators/__tests__/workflow-result.test.ts` at lines 1112 and 1194 (prepare/generator engine tests) → **KEPT**
- `helpers.ts` — only imported by the 2 removed test files; zero remaining references → **REMOVED** via `git rm`

### Decision

| File | Decision | Reason |
|---|---|---|
| `sync/__tests__/helpers.ts` | REMOVED | Only imported by the 2 retired test files; no other consumers |
| `sync/__tests__/fake-schema-cmd.sh` | KEPT | Used by `validators/__tests__/workflow-result.test.ts` (prepare/generator engine tests) |

---

## 4. Validator Results

Checks applied: COMMON-01, COMMON-02, BLUEPRINT-01, BLUEPRINT-02, BLUEPRINT-03, BLUEPRINT-04, BLUEPRINT-05

| File | COMMON-01 | BLUEPRINT-01 | Other |
|---|---|---|---|
| node.md | OK | OK | No site refs, no enum/type prose, no rule refs, no fixed dimensions |
| media.md | OK | OK | idem |
| view.md | OK | OK | idem |
| block_content.md | OK | OK | idem |
| taxonomy_term.md | OK | OK | idem |
| field-types.md | OK | OK | idem |
| image_style.md | OK | OK | idem |

Zero errors. Zero warnings.

---

## 5. pnpm check Output

```
✓ typecheck — tsc --noEmit: PASSED
✓ lint — eslint --cache: PASSED
✓ test — vitest run: 93 test files, 994 tests PASSED
```

The suite dropped the 2 removed test files cleanly. No dangling imports. Remaining sync/prepare-generator tests (including `workflow-result.test.ts` using `fake-schema-cmd.sh`) still pass.
