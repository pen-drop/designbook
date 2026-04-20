# Design: Blueprint `suggests:` Keyword

## Summary

Introduce a new frontmatter keyword `suggests:` for blueprints. Remove `extends:` / `provides:` / `constrains:` from the blueprint-allowed frontmatter entirely. Blueprints become pure overridable suggestion files — machine-readable via `suggests:` but never participating in schema validation or runtime narrowing.

## Motivation

The current skill-creator rules allow `extends:` and `provides:` in blueprint frontmatter (under "Schema Extension as Core Mechanism"). But blueprints are defined as **overridable starting points** — integrations always replace the entire blueprint file when they deviate. Hard constraints in a blueprint are therefore meaningless: they get overridden wholesale. A blueprint's only job is to suggest.

Validator findings expose the problem:

- `designbook-drupal` has 10 blueprints (`button`, `container`, `footer`, `form`, `grid`, `header`, `icon`, `link`, `logo`, `navigation`, `page`, `section`) describing component props and enum values as body prose.
- `designbook-css-tailwind` has 2 blueprints (`css-mapping`, `css-naming`) doing the same with group/naming defaults.

These findings need a structured home, but not one that implies a validation contract. `suggests:` fills that gap.

## Design

### `suggests:` semantics

- Located in blueprint frontmatter alongside `trigger:` / `filter:`.
- Shape: JSON-Schema-like property map (supports `enum`, `default`, `type`, `description`, nested objects).
- **Runtime:** the executor reads `suggests:` purely for UI/discovery purposes (surfacing hints in Storybook, doc generation). It is **not** merged into the task's validation schema. It never narrows enums. It never enforces defaults.
- **Contract semantics:** none. A blueprint remains an overridable starting point; `suggests:` formalises the structure of what is being suggested without giving it authority.

### Keyword-driven CLI, file-type-agnostic

The CLI/executor does **not** distinguish between `blueprints/` and `rules/` at runtime. It processes frontmatter by keyword:

| Keyword | Runtime effect |
|---|---|
| `trigger:` / `filter:` | Activation (which files load for which task) |
| `extends:` / `provides:` / `constrains:` | Merged into the task's validation schema |
| `suggests:` | Informational only — ignored during schema merge, available to UI/discovery |

The blueprint-vs-rule distinction is an **authoring convention** enforced by the validator (`BLUEPRINT-01`), not by the CLI. If a blueprint mistakenly used `extends:`, the CLI would still merge it — but the validator would flag it as an authoring error. This keeps the runtime simple (one code path, keyword-driven) and the authoring rules opinionated.

### `suggests:` example

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

### Blueprint frontmatter contract

**Allowed:**

- `name:`
- `description:`
- `trigger.*`
- `filter.*`
- `suggests.*` (new)

**Forbidden:**

- `extends:` — stays rule-only
- `provides:` — stays rule-only
- `constrains:` — already rule-only (enforced today by `BLUEPRINT-01`)

### Vehicle decision matrix

This matrix goes into `blueprint-files.md` to make the author's choice explicit. Blueprints carry no authority by design — any hard constraint must live in a rule or schema, never in a blueprint:

| Situation | Vehicle |
|---|---|
| Recommended prop shape or enum for a component (overridable) | Blueprint `suggests:` |
| Loose prose guidance, no structure | Blueprint body |
| Hard contract other tools must validate against | Schema type in integration's `schemas.yml` (via `$ref` on a core type) |
| Non-overridable narrowing for a specific backend/config | Rule with `constrains:` |
| Runtime default value that affects validation | Rule with `provides:` |
| Added property that affects validation | Rule with `extends:` |

### Check changes

**`BLUEPRINT-01`** — expand predicate:

> Blueprint frontmatter must not contain `extends:`, `provides:`, or `constrains:`. These stay rule-exclusive. Blueprints may use `suggests:` for soft recommendations.

Severity stays `error`.

**`BLUEPRINT-03`** — rewrite predicate:

> Body does not describe enum values, required fields, type restrictions, or default values. Such content belongs either in `suggests:` in frontmatter (soft recommendation, machine-readable) or in `schemas.yml` / a rule (hard contract). Pure narrative prose is fine.

Severity stays `warning`. The finding should name the target vehicle per the decision matrix.

### `blueprint-files.md` structural edits

1. **Remove** section "Schema Extension as Core Mechanism" (lines 97–143 of the current file).
2. **Add** section "Blueprints Suggest, Never Enforce" — introduces `suggests:`, shows wrong/correct examples, links to the decision matrix.
3. **Add** the "Vehicle decision matrix" table (above).
4. **Update** the "Concrete Implementations Belong in Blueprints" section to reference `suggests:` as the machine-readable channel.

### `rule-files.md` correction

The "Schema Extension as Core Mechanism" table currently lists Blueprint as an allowed location for `extends:` and `provides:`. Change to:

| Field | Effect | Allowed in |
|-------|--------|------------|
| `extends:` | Add new properties (error on duplicates) | Rule only |
| `provides:` (object) | Set default values (last writer wins) | Rule only |
| `constrains:` | Intersect enum values | Rule only |
| `suggests:` | Soft recommendation (not merged into validation schema) | Blueprint only |

### Runtime behaviour

The Storybook addon executor (Part 2, `storybook-addon-designbook`) currently merges rules' `extends:` / `provides:` / `constrains:` into each task's result schema during stage execution. After this change:

- The executor must ignore `suggests:` during schema merge.
- The executor may read `suggests:` for a separate UI/discovery channel (not in scope for this spec).

This executor change is a one-line skip during the merge walk. It is tracked as a follow-up under `designbook-addon-skills`. Until that change lands, blueprint `suggests:` is simply not read by anything — inert.

### `resources/schema-composition.md` update

Add a short section "Keys ignored during merge" listing `suggests:` with a one-sentence rationale ("informational only; belongs to blueprints").

### Legacy audit re-read

`docs/superpowers/audits/2026-04-20-legacy-schema-extension.md` currently lists 13 findings with proposed targets `provides:` / `extends:` / `constrains:`. All targets need rewriting under the new model:

- For each blueprint finding (10 drupal + 2 css-tailwind): the target becomes `suggests:` (for soft recommendations) OR a new `schemas.yml` type (if the constraint is genuinely a contract).
- For each rule finding (3 drupal data-model rules): targets stay `constrains:` / `extends:` / `provides:` — rules are unaffected by this change.

The audit is regenerated in this refactor's final task.

## Out of scope

- Storybook addon executor change (deferred — tracked under `designbook-addon-skills`).
- UI/docs generation consuming `suggests:` (future work).
- Migrating any actual legacy file content — the audit lists them; migration is a separate refactor.

## Success criteria

1. `BLUEPRINT-01` flags any of `extends:` / `provides:` / `constrains:` in a blueprint.
2. `BLUEPRINT-03` flags body prose describing enums/defaults/required — and the finding text names `suggests:` (soft) vs `schemas.yml`/rule (hard) as the target.
3. `blueprint-files.md` contains no "Schema Extension as Core Mechanism" section.
4. `rule-files.md` extension table lists Rule-only for `extends:`/`provides:`/`constrains:` and Blueprint-only for `suggests:`.
5. Running the validator on `designbook-skill-creator` itself still yields 0 findings (self-consistency).
6. Validator run on the other five skills maps cleanly: existing BLUEPRINT-03 warnings carry over with new target suggestions; no new regression.
7. Legacy audit regenerated with correct targets per new vehicle matrix.
