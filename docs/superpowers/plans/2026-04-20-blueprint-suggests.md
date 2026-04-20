# Blueprint `suggests:` Keyword Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a `suggests:` frontmatter keyword for blueprints, remove all hard-constraint keywords (`extends:` / `provides:` / `constrains:`) from the blueprint-allowed set, and regenerate the legacy audit with the new vehicle targets.

**Architecture:** Edits are confined to authoring rules (`rules/blueprint-files.md`, `rules/rule-files.md`), one resource doc (`resources/schema-composition.md`), and one audit regeneration (`docs/superpowers/audits/2026-04-20-legacy-schema-extension.md`). No runtime code changes — the Storybook addon executor change is out of scope (tracked under `designbook-addon-skills`). Validation after each task uses the skill-creator's own validator (`validate.md`) as the test harness.

**Tech Stack:** Markdown + YAML frontmatter only. LLM-run validator (no unit test framework) is the acceptance gate.

**Spec:** `docs/superpowers/specs/2026-04-20-blueprint-suggests-design.md`

---

## File Structure

Files modified by this plan:

| File | Change |
|---|---|
| `.agents/skills/designbook-skill-creator/rules/rule-files.md` | Extension table: Rule-only for `extends:`/`provides:`/`constrains:`; add `suggests:` row (Blueprint-only) |
| `.agents/skills/designbook-skill-creator/rules/blueprint-files.md` | Replace "Schema Extension as Core Mechanism" with "Blueprints Suggest, Never Enforce"; add vehicle decision matrix; expand `BLUEPRINT-01` and rewrite `BLUEPRINT-03` |
| `.agents/skills/designbook-skill-creator/resources/schema-composition.md` | Add "Keys ignored during merge" section for `suggests:` |
| `docs/superpowers/audits/2026-04-20-legacy-schema-extension.md` | Regenerate findings table — blueprint targets become `suggests:`; rule targets unchanged |

Files NOT modified:

- Runtime code (`packages/storybook-addon-designbook/**`) — executor change deferred per spec §"Out of scope"
- Actual blueprint files in `designbook-drupal/` / `designbook-css-tailwind/` — migration tracked separately per spec §"Out of scope"

---

## Task 1: Update `rule-files.md` Schema Extension Table

**Files:**
- Modify: `.agents/skills/designbook-skill-creator/rules/rule-files.md:143-147`

Context: The current table lists Blueprint as an allowed location for `extends:` and `provides:`. Per the spec, these become Rule-only; a new `suggests:` row is added as Blueprint-only. No other change in this file.

- [ ] **Step 1: Open the current table (read lines 134-171)**

The current lines are:

```
| Field | Effect | Allowed in |
|-------|--------|------------|
| `extends:` | Add new properties (error on duplicates) | Rule, Blueprint |
| `provides:` (object) | Set default values (last writer wins) | Rule, Blueprint |
| `constrains:` | Intersect enum values | Rule only |
```

- [ ] **Step 2: Edit the table**

Replace lines 143-147 of `.agents/skills/designbook-skill-creator/rules/rule-files.md` with:

```markdown
| Field | Effect | Allowed in |
|-------|--------|------------|
| `extends:` | Add new properties (error on duplicates) | Rule only |
| `provides:` (object) | Set default values (last writer wins) | Rule only |
| `constrains:` | Intersect enum values | Rule only |
| `suggests:` | Soft recommendation (not merged into validation schema) | Blueprint only |
```

- [ ] **Step 3: Verify the "Schema Extension as Core Mechanism" heading text still reads correctly**

The heading itself is unchanged. Only the table rows change. The section's narrative (lines 135-141, 149-195) applies to rules and remains valid.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook-skill-creator/rules/rule-files.md
git commit -m "skill-creator: restrict extends/provides/constrains to rules; add suggests row"
```

---

## Task 2: Rewrite Blueprint Schema-Extension Section

**Files:**
- Modify: `.agents/skills/designbook-skill-creator/rules/blueprint-files.md:97-142`

Context: The current "Schema Extension as Core Mechanism" section (lines 97-142) describes `extends:` / `provides:` on blueprints. Per the spec, blueprints carry no authority — they suggest. This task replaces that section with "Blueprints Suggest, Never Enforce", adds the vehicle decision matrix, and updates the "Concrete Implementations Belong in Blueprints" section to reference `suggests:` as the machine-readable channel.

- [ ] **Step 1: Delete the current section**

Remove lines 97-142 of `.agents/skills/designbook-skill-creator/rules/blueprint-files.md` (the entire "## Schema Extension as Core Mechanism" section including its wrong/correct examples and the trailing `BLUEPRINT-03` reference sentence).

- [ ] **Step 2: Insert the new section at the same location**

Insert this block where the old section was (after "## Name Blueprint Files Descriptively" / before "## `blueprints/` — Trigger + Filter Matching"). Everything between the `~~~BLUEPRINT-SECTION-START~~~` and `~~~BLUEPRINT-SECTION-END~~~` markers below must be copied verbatim (excluding the markers themselves):

~~~BLUEPRINT-SECTION-START~~~
## Blueprints Suggest, Never Enforce

Blueprints are overridable starting points. When an integration deviates from a
blueprint, it replaces the entire blueprint file — not a merged subset. Hard
constraints in a blueprint are therefore meaningless: they get overridden wholesale.
A blueprint's only job is to suggest.

Blueprints **must not** use `extends:`, `provides:`, or `constrains:` in frontmatter.
All three are rule-exclusive — see [rule-files.md](rule-files.md#schema-extension-as-core-mechanism).

Blueprints **may** use `suggests:` to express soft recommendations in a
machine-readable form. `suggests:` is a JSON-Schema-like property map (supports
`enum`, `default`, `type`, `description`, nested objects). The executor reads
`suggests:` only for UI/discovery purposes — it is **never** merged into the task's
validation schema. It never narrows enums. It never enforces defaults.

**Wrong — blueprint with `provides:`:**

```yaml
---
name: container-blueprint
trigger:
  domain: components
  component: container
provides:
  max_width:
    default: md
    enum: [sm, md, lg, xl, full]
---
```

**Correct — same recommendations as `suggests:`:**

```yaml
---
name: container-blueprint
trigger:
  domain: components
  component: container
suggests:
  max_width:
    enum: [sm, md, lg, xl, full]
    default: md
    description: Container outer width preset
  padding_top:
    enum: [auto, none, sm, md, lg]
  padding_bottom:
    enum: [auto, none, sm, md, lg]
---

# Blueprint: Container

The container component wraps arbitrary content and applies layout spacing.
See `suggests:` above for recommended prop values.
```

### Vehicle Decision Matrix

Blueprints carry no authority by design — any hard constraint must live in a rule
or schema, never in a blueprint. Pick the vehicle by what the content is:

| Situation | Vehicle |
|---|---|
| Recommended prop shape or enum for a component (overridable) | Blueprint `suggests:` |
| Loose prose guidance, no structure | Blueprint body |
| Hard contract other tools must validate against | Schema type in integration's `schemas.yml` (via `$ref` on a core type) |
| Non-overridable narrowing for a specific backend/config | Rule with `constrains:` |
| Runtime default value that affects validation | Rule with `provides:` |
| Added property that affects validation | Rule with `extends:` |

The `BLUEPRINT-01` check flags any of `extends:`/`provides:`/`constrains:` in
blueprint frontmatter. The `BLUEPRINT-03` check flags body prose that should live
in `suggests:` (soft) or in `schemas.yml` / a rule (hard).
~~~BLUEPRINT-SECTION-END~~~

- [ ] **Step 3: Update "Concrete Implementations Belong in Blueprints" to reference `suggests:`**

Find the table near line 42-46 (the "What varies / What never changes / What to produce" matrix). Immediately AFTER that table, insert this paragraph so the reader knows the machine-readable channel exists:

```markdown
When the integration-specific detail is structured (a prop enum, a default value, a
recommended shape), express it as `suggests:` in frontmatter. When it is narrative
guidance, keep it in the body.
```

Locate the exact insertion point: after the line `| What to produce (outputs only) | → Task |` and before the next blank-line separator. The paragraph above should be inserted on its own paragraph between the table and the "**Examples:**" heading.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook-skill-creator/rules/blueprint-files.md
git commit -m "skill-creator: blueprints suggest, never enforce — add suggests: section + decision matrix"
```

---

## Task 3: Update `BLUEPRINT-01` and `BLUEPRINT-03` Check Predicates

**Files:**
- Modify: `.agents/skills/designbook-skill-creator/rules/blueprint-files.md` — `## Checks` table at the end of the file

Context: `BLUEPRINT-01` currently only flags `constrains:`. It must also flag `extends:` and `provides:`. `BLUEPRINT-03` currently says "…could be expressed via `extends:` or `provides:` in frontmatter." It must instead direct prose-violations to the correct vehicle per the decision matrix.

- [ ] **Step 1: Locate the current checks table**

In the current file it ends near line 160-165. After Task 2 the line numbers will have shifted, so find the `## Checks` heading and its table.

Current rows (verbatim):

```
| BLUEPRINT-01 | error | `constrains:` field is absent from frontmatter (only rules may constrain enum values) | frontmatter |
| BLUEPRINT-02 | warning | Body does not contain site-specific references (brand names, project URLs, customer slot names) — site-specific content in core `designbook/` is caught by COMMON-02 in common-rules.md; this check covers blueprints in integration skills that still must stay site-agnostic | body |
| BLUEPRINT-03 | warning | Body does not describe schema extensions as prose (default values, additional result properties, enumerations) when they could be expressed via `extends:` or `provides:` in frontmatter | body |
```

- [ ] **Step 2: Replace `BLUEPRINT-01` row**

New text (still severity `error`, still `frontmatter`):

```
| BLUEPRINT-01 | error | Frontmatter contains none of `extends:`, `provides:`, or `constrains:` — these are rule-exclusive. Blueprints may use `suggests:` for soft recommendations. | frontmatter |
```

- [ ] **Step 3: Replace `BLUEPRINT-03` row**

New text (still severity `warning`, still `body`):

```
| BLUEPRINT-03 | warning | Body does not describe enum values, required fields, type restrictions, or default values. Such content belongs either in `suggests:` in frontmatter (soft recommendation, machine-readable) or in `schemas.yml` / a rule (hard contract). Pure narrative prose is fine. Finding message must name which target applies per the decision matrix in "Blueprints Suggest, Never Enforce". | body |
```

`BLUEPRINT-02` is unchanged.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook-skill-creator/rules/blueprint-files.md
git commit -m "skill-creator: expand BLUEPRINT-01 to all 3 keywords; BLUEPRINT-03 names target vehicle"
```

---

## Task 4: Add `suggests:` Ignore Note to `schema-composition.md`

**Files:**
- Modify: `.agents/skills/designbook-skill-creator/resources/schema-composition.md`

Context: `schema-composition.md` documents the three merge operations (`extends:` / `provides:` / `constrains:`). It must explicitly state that `suggests:` is ignored during merge — otherwise a reader could assume it belongs in the same family.

- [ ] **Step 1: Locate the "Merge Order" section (near line 95)**

It ends with the bullet-point rationale ending "Constraints come last — they narrow what's already defined".

- [ ] **Step 2: Insert a new subsection immediately after "## Merge Order" and before "## `$ref` in Extension Fields"**

```markdown
## Keys Ignored During Merge

`suggests:` (blueprint-only) is **not** merged into the task's result schema. It is
informational — intended for UI/discovery consumers. The executor skips it entirely
during the six-phase merge above.

`suggests:` exists so blueprints can publish a machine-readable recommendation shape
without claiming any validation authority. See
[blueprint-files.md](../rules/blueprint-files.md#blueprints-suggest-never-enforce) for
the authoring rules, and the vehicle decision matrix in that same file for how to
choose between `suggests:` (soft) and a rule / schema type (hard).
```

- [ ] **Step 3: Update the "The Three Operations" table at the top (near line 14-18)**

Add a fourth row so the table is complete:

Current:

```
| Operation | Effect | Allowed in |
|-----------|--------|------------|
| `extends:` | Add new properties to the schema | Blueprint, Rule |
| `provides:` | Set default values for existing properties | Blueprint, Rule |
| `constrains:` | Intersect enum values to narrow allowed options | **Rule only** |
```

Replace with:

```
| Operation | Effect | Allowed in |
|-----------|--------|------------|
| `extends:` | Add new properties to the schema | **Rule only** |
| `provides:` | Set default values for existing properties | **Rule only** |
| `constrains:` | Intersect enum values to narrow allowed options | **Rule only** |
| `suggests:` | Informational — ignored during merge | **Blueprint only** |
```

- [ ] **Step 4: Update the sentence immediately following that table**

The current sentence (line 20) reads:

> Blueprints **must not** use `constrains:` — only rules may constrain. This ensures blueprints remain overridable while rules enforce hard limits.

Replace with:

> Blueprints **must not** use any of `extends:`, `provides:`, or `constrains:` — all three are rule-exclusive. This ensures blueprints remain purely overridable; any authority lives in rules or schema types. Blueprints may use `suggests:` to publish machine-readable recommendations that do not participate in validation.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook-skill-creator/resources/schema-composition.md
git commit -m "schema-composition: document suggests: as merge-ignored; restrict 3 ops to rules"
```

---

## Task 5: Regenerate Legacy Audit Targets

**Files:**
- Modify: `docs/superpowers/audits/2026-04-20-legacy-schema-extension.md`

Context: The audit's current `Proposed frontmatter form` column lists `provides:` / `extends:` for the 10 drupal blueprint findings. Per the new vehicle matrix, those targets must become `suggests:` (since they're overridable recommendations — enum values and defaults on component props). The 3 rule findings remain unchanged (rules keep the old keywords).

- [ ] **Step 1: Update the "Findings — BLUEPRINT-03" table**

Replace every `provides:` in the rightmost column with `suggests:`. Every row in this table currently has `provides:` as the proposed form; after this edit every row will have `suggests:`.

Current (verbatim, for reference):

```
| designbook-drupal | components/blueprints/button.md | 16-21 | Declares the `variant` enum values (`primary`, `outline`, `ghost`, `default`) and `size` enum `[sm, md, lg]` | `provides:` |
| designbook-drupal | components/blueprints/container.md | 33-37 | Declares enums and defaults for `max_width`, `padding_top`, `padding_bottom`, `display_header` props | `provides:` |
| designbook-drupal | components/blueprints/grid.md | 32-33 | Declares `columns` enum `[1,2,3,4]` default `1` and `gap` enum `[none,sm,md,lg]` default `"md"` | `provides:` |
| designbook-drupal | components/blueprints/section.md | 39-45 | Declares enums and defaults for all seven props passed to container and grid sub-components | `provides:` |
| designbook-drupal | components/blueprints/form.md | 33-35 | Declares `label_display` and `description_display` enums with defaults `"before"` and `"after"` | `provides:` |
| designbook-drupal | components/blueprints/header.md | 21 | Declares `sticky` boolean prop with default `false` | `provides:` |
| designbook-drupal | components/blueprints/icon.md | 18 | Declares `size` enum `[sm, md, lg]` with default `md` | `provides:` |
| designbook-drupal | components/blueprints/link.md | 17-19 | Declares `variant` enum `[default, subtle, external]` | `provides:` |
| designbook-drupal | components/blueprints/logo.md | 17-19, 23-25 | Declares `variant` enum `[full, mark-only, inverse]` and `href` default `/` | `provides:` |
| designbook-drupal | components/blueprints/navigation.md | 16-17 | Declares `variant` enum `[main, footer]` with default `"main"` | `provides:` |
```

After edit, all rightmost cells say `` `suggests:` ``. The other columns (Skill, File, Lines, What the prose describes) stay exactly as-is.

- [ ] **Step 2: Update the "Next steps" section at the bottom**

The current step 1 (near line 63) references the old mechanism. Replace the entire "Next steps" section (lines 59-67 of the current file) with:

```markdown
## Next steps

These findings are tracked for a follow-up refactor. The migration pattern per finding is:

1. For each **rule** finding: move the body prose constraint/default into frontmatter via `extends:`, `provides:`, or `constrains:` — pick per the form table in [rule-files.md](../../../.agents/skills/designbook-skill-creator/rules/rule-files.md#schema-extension-as-core-mechanism).
2. For each **blueprint** finding: move the body prose recommendation into `suggests:` in frontmatter. If the content is actually a hard contract (not overridable), create a new type in the integration's `schemas.yml` instead — see the vehicle decision matrix in [blueprint-files.md](../../../.agents/skills/designbook-skill-creator/rules/blueprint-files.md#blueprints-suggest-never-enforce).
3. Remove the now-redundant prose from the body. Keep any explanatory narrative beyond the constraint/default.
4. Re-run the validator — the `RULE-01` / `BLUEPRINT-03` finding for that file should disappear.

Files with no findings need no action.
```

- [ ] **Step 3: Add a short note at the top explaining the target-column semantics changed**

Immediately after the "## Scope" section heading and its paragraph (around line 8-22), insert before the next heading ("## Findings — RULE-01"):

```markdown
**Note (2026-04-20 update):** Target vehicles were regenerated after the
`suggests:` keyword was introduced (see `docs/superpowers/specs/2026-04-20-blueprint-suggests-design.md`).
Blueprint findings now target `suggests:` instead of `provides:` / `extends:`, because
blueprints are pure suggestions and carry no validation authority. Rule findings are
unchanged.
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/audits/2026-04-20-legacy-schema-extension.md
git commit -m "audit: regenerate blueprint targets as suggests: under new vehicle matrix"
```

---

## Task 6: Validator Self-Check on `designbook-skill-creator`

**Files:**
- Read-only: all files in `.agents/skills/designbook-skill-creator/`

Context: Spec success criterion 5 — the skill-creator must still score 100/100 (0 findings) after the refactor, since its rules were the ones that changed. This catches rule-files that accidentally violate their own updated predicates.

- [ ] **Step 1: Invoke the validator in the current conversation**

Say to the user (or, if running under subagent-driven-development, the controlling agent): "Validate skill designbook-skill-creator".

The validator (documented in `.agents/skills/designbook-skill-creator/resources/validate.md`) is LLM-run. It discovers rule files, applies every `## Checks` row to every file in the skill, and reports findings + score.

Expected output: `Skill: designbook-skill-creator — Score: 100/100` with 0 errors and 0 warnings.

- [ ] **Step 2: If any finding appears, diagnose**

Most likely causes if a finding does appear:
- A new example in `blueprint-files.md` used `extends:`/`provides:`/`constrains:` in a `yaml` code-fence that the validator misread as live frontmatter → mark it explicitly as a **Wrong** example (the validator rule does not inspect fenced examples; if it does here, the rule-file itself needs tightening — out of scope for this plan, escalate).
- A new paragraph in `schema-composition.md` used site-specific terms → tighten.

- [ ] **Step 3: Fix and re-run**

If a finding appears and is a genuine authoring error in one of the four files touched by Tasks 1-4, fix it and re-run the validator. Commit the fix as a separate commit with message `skill-creator: fix self-validator finding — <short description>`.

If no finding appears, skip to Step 4.

- [ ] **Step 4: Record the validator output in this task**

No commit in this step — just confirm (to the controlling agent / user) that the self-validator yielded 0 findings.

---

## Task 7: Validator Smoke-Check on Other 5 Skills

**Files:**
- Read-only: `.agents/skills/designbook/`, `.agents/skills/designbook-drupal/`, `.agents/skills/designbook-css-tailwind/`, `.agents/skills/designbook-stitch/`, `.agents/skills/designbook-devtools/` (if it exists)

Context: Spec success criterion 6 — existing `BLUEPRINT-03` warnings on production skills should carry over with new target text naming `suggests:`. No regression (no new `BLUEPRINT-01` errors on blueprints that were previously clean). The 10 drupal blueprint files still violate `BLUEPRINT-03` — that is expected; migration is a separate plan.

- [ ] **Step 1: Run the validator in parallel on all 5 skills**

Invoke: "Validate all skills" (or, if running under subagent-driven-development, dispatch 5 parallel validator subagents — one per skill — because the runs are independent).

- [ ] **Step 2: Cross-check expectations per skill**

Expected outcomes (compared against the pre-refactor validator run from `docs/superpowers/audits/2026-04-20-legacy-schema-extension.md`):

| Skill | Expectation |
|---|---|
| `designbook` | Score unchanged from pre-refactor (core skill has no blueprints). |
| `designbook-drupal` | 10 BLUEPRINT-03 warnings still present. **Finding text now names `suggests:` (soft) vs `schemas.yml`/rule (hard)**. 0 BLUEPRINT-01 errors — none of the current blueprints use `extends:`/`provides:`/`constrains:` today (the audit would have caught them as prose, not as live frontmatter). Verify this assumption by spot-reading `designbook-drupal/components/blueprints/button.md` frontmatter — if any of the three keywords appears, flag as a pre-existing bug, not a regression. |
| `designbook-css-tailwind` | 2 BLUEPRINT-03 warnings expected on `css-mapping.md` and `css-naming.md` (per the spec §"Motivation"). Finding text now names `suggests:`/schema. 0 BLUEPRINT-01 errors expected. |
| `designbook-stitch` | No change expected (no blueprint findings in the current audit). |
| `designbook-devtools` | Skill directory does not exist (audit already noted this). Skip. |

- [ ] **Step 3: If a new BLUEPRINT-01 error appears on a skill that was previously clean**

A new error means an existing blueprint is using `extends:` or `provides:` today — Task 3 made that a hard error. This is a real regression that must be addressed: either fix the blueprint in-place (migrate to `suggests:`) or document it as a known pre-existing bug in this plan's final commit. Escalate to the user before force-committing either outcome.

- [ ] **Step 4: If `BLUEPRINT-03` finding text does NOT name a target**

Task 3 tightened the predicate to require the finding message name `suggests:` vs `schemas.yml`/rule per the decision matrix. If the validator output still says only "body describes schema extensions as prose" without naming a target, the LLM runner did not pick up the tightened predicate. Re-read `blueprint-files.md` Task 3 output and confirm the `BLUEPRINT-03` row contains "Finding message must name which target applies". If the predicate is present but the validator ignored it, flag as an LLM-runner limitation (out of scope for this plan — the rule-file is correct).

- [ ] **Step 5: Record outcome**

No commit. Just confirm (to the controlling agent / user) that the smoke-check produced no unexpected regressions.

---

## Success Criteria (Recap from Spec §"Success criteria")

The plan is complete when ALL of these hold:

1. ✅ `BLUEPRINT-01` flags any of `extends:` / `provides:` / `constrains:` in a blueprint. (Task 3)
2. ✅ `BLUEPRINT-03` flags body prose describing enums/defaults/required — and the finding text names `suggests:` (soft) vs `schemas.yml`/rule (hard). (Task 3)
3. ✅ `blueprint-files.md` contains no "Schema Extension as Core Mechanism" section. (Task 2)
4. ✅ `rule-files.md` extension table lists Rule-only for `extends:`/`provides:`/`constrains:` and Blueprint-only for `suggests:`. (Task 1)
5. ✅ Validator on `designbook-skill-creator` yields 0 findings. (Task 6)
6. ✅ Validator on other five skills maps cleanly — existing BLUEPRINT-03 warnings carry over with new target suggestions; no new regression. (Task 7)
7. ✅ Legacy audit regenerated with correct targets per new vehicle matrix. (Task 5)

---

## Out of Scope (tracked elsewhere)

- Storybook addon executor change (one-line skip during merge walk). Deferred — tracked under `designbook-addon-skills`.
- UI/docs generation consuming `suggests:`. Future work.
- Migrating the 12 legacy blueprint files (10 drupal + 2 css-tailwind) — the audit lists them; migration is a separate refactor plan.
