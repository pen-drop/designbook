## Context

Four Drupal/SDC-specific skills currently live as separate top-level roots under `.agents/skills/`:

| Skill | Load condition | Content |
|---|---|---|
| `designbook-data-model-drupal` | `DESIGNBOOK_BACKEND=drupal` | 3 rule files, 1 resource |
| `designbook-scenes-drupal` | `DESIGNBOOK_BACKEND=drupal` | 3 rule files, 1 resource |
| `designbook-sample-data-drupal` | `DESIGNBOOK_BACKEND=drupal` | 5 rule files |
| `designbook-components-sdc` | `DESIGNBOOK_FRAMEWORK_COMPONENT=sdc` | 2 rule files, 1 task file, 5 resources |

All four are backend/framework addons that augment base skills (`designbook-data-model`, `designbook-scenes`, etc.). The skill scanner currently opens each top-level directory independently.

This change depends on `skill-scan-subdirs` being implemented first, which teaches the scanner to discover rules, tasks, and resources under named sub-directories of a single skill root.

## Goals / Non-Goals

**Goals:**
- Merge all four skills into `.agents/skills/designbook-drupal/` with sub-directories `data-model/`, `scenes/`, `sample-data/`, `components/`
- Single `SKILL.md` at root; each sub-directory has its own focused content
- Preserve all `when:` conditions on individual rule and task files
- Delete the four original skill roots
- Update any cross-references within merged files

**Non-Goals:**
- Changing the content or behavior of any rule, task, or resource file
- Merging the base skills (`designbook-data-model`, `designbook-scenes`, etc.)
- Altering the `skill-scan-subdirs` implementation itself
- Migrating workflow files that load skills by path (those use config-driven resolution)

## Decisions

### Decision: Sub-directory layout mirrors existing skill names

Each sub-directory name matches the suffix of the original skill name (`data-model-drupal` → `data-model/`, `scenes-drupal` → `scenes/`, `sample-data-drupal` → `sample-data/`, `components-sdc` → `components/`). This makes the migration mechanical and preserves grep-ability.

Alternative considered: flat layout with file prefixes (e.g. `rules/data-model-drupal-data-model.md`). Rejected — names become long and the grouping benefit is lost.

### Decision: Single root SKILL.md with sub-directory index sections

The root `SKILL.md` has one section per sub-directory (`## Data Model`, `## Scenes`, `## Sample Data`, `## Components`), each listing the files inside. This satisfies the `skill-md-index` spec (index-only, ~40 lines target) while being discoverable from the root.

Alternative considered: one `SKILL.md` per sub-directory. Rejected — unnecessary and inconsistent with how other skills work; the scanner entry point is always the root `SKILL.md`.

### Decision: `when:` conditions stay on individual files, not on the root

Load conditions (`when: backend: drupal`, `when: frameworks.component: sdc`) remain on each rule/task file. The root skill has no `when:` condition — it is always index-scanned. Only the relevant files are loaded when conditions match.

Alternative considered: `when:` on the root `SKILL.md`. Rejected — would hide the `components/` sub-tree for non-SDC projects and the `data-model/` sub-tree for non-Drupal projects; individual file conditions are already the established pattern.

## Risks / Trade-offs

- **Blocked on skill-scan-subdirs** → If merged before sub-directory scanning lands, the scanner will not find rules/tasks/resources in sub-directories. Mitigation: this change is gated as a prerequisite in the proposal; do not apply until `skill-scan-subdirs` is merged.
- **References to old skill names** → Any workflow or config that names `designbook-components-sdc` or `designbook-data-model-drupal` by path will break. Mitigation: search for all references during apply and update them.
- **`lazy-skill-loading` spec references `designbook-components-sdc`** → The `lazy-skill-loading` spec uses the old skill name. That spec's path reference needs updating after merge. Mitigation: update the spec as part of this change.

## Migration Plan

1. Confirm `skill-scan-subdirs` is merged and the scanner reads sub-directories.
2. Create `.agents/skills/designbook-drupal/` with sub-directories.
3. Move files from each original skill into the appropriate sub-directory.
4. Write the root `SKILL.md`.
5. Update all internal cross-references (relative paths in rule/resource files).
6. Search the codebase for references to the four old skill names and update them.
7. Delete the four original skill root directories.
8. Verify: run the skill scanner and confirm all rules/tasks/resources are discovered under `designbook-drupal`.

Rollback: restore the four original directories from git. The scanner change is independent and does not need rollback.

## Open Questions

- Does `designbook.config.yml` have any explicit `skills:` list entries for the old skill names? (Check during apply step 6.)
- Are there promptfoo test fixtures that reference old skill paths by name?
