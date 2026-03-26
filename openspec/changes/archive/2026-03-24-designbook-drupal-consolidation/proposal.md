## Why

The four Drupal-specific skills (`designbook-data-model-drupal`, `designbook-scenes-drupal`, `designbook-sample-data-drupal`, `designbook-components-sdc`) are each tiny, single-concern directories that share the same load condition (`DESIGNBOOK_BACKEND=drupal` or `DESIGNBOOK_FRAMEWORK_COMPONENT=sdc`). Scattering them across four skill roots creates noise in the skill index, makes cross-references verbose, and forces the skill scanner to open multiple top-level directories for what is conceptually one backend integration surface. Consolidation reduces skill-index overhead and co-locates all Drupal/SDC knowledge in one place.

## What Changes

- A new skill root `.agents/skills/designbook-drupal/` is created with four sub-directories:
  - `data-model/` — absorbs `designbook-data-model-drupal` (rules, resources)
  - `scenes/` — absorbs `designbook-scenes-drupal` (rules, resources)
  - `sample-data/` — absorbs `designbook-sample-data-drupal` (rules)
  - `components/` — absorbs `designbook-components-sdc` (rules, tasks, resources)
- A single `SKILL.md` at the root describes all four areas and their load conditions.
- The four original skill directories are deleted.
- All internal cross-references within the four skills are updated to the new paths.
- Tasks inside `components/` retain `when: frameworks.component: sdc`.
- Rules inside `data-model/`, `scenes/`, and `sample-data/` retain their `when: backend: drupal` load condition.
- **Prerequisite**: the skill scanner must support sub-directory scanning (`skill-scan-subdirs`) before this change goes live.

## Capabilities

### New Capabilities

- `designbook-drupal`: Unified Drupal/SDC skill root — single `SKILL.md` with sub-directories per concern; scanner discovers rules, tasks, and resources under `data-model/`, `scenes/`, `sample-data/`, `components/`.

### Modified Capabilities

- `designbook-configuration`: The skill path references for the four consolidated skills need updating in any config that names them explicitly (e.g. `skills:` lists in `designbook.config.yml`).

## Impact

- `.agents/skills/designbook-data-model-drupal/` → deleted
- `.agents/skills/designbook-scenes-drupal/` → deleted
- `.agents/skills/designbook-sample-data-drupal/` → deleted
- `.agents/skills/designbook-components-sdc/` → deleted
- `.agents/skills/designbook-drupal/` → created (new)
- `designbook.config.yml` — any `skills:` entries referencing the old skill names must point to `designbook-drupal`
- Any agent prompt or workflow that references these skill names by path needs updating
- Blocked on `skill-scan-subdirs` spec/implementation being merged first
