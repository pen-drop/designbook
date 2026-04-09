## Context

Testing designbook workflows currently requires running all predecessor workflows sequentially. The existing promptfoo setup has its own fixture directory (`promptfoo/fixtures/`) with `_shared` base data and per-workflow overrides, plus a `setup-workspace.sh` script that layers them. Manual testing uses a separate `scripts/setup-workspace.sh` that creates workspaces from `test-integration-drupal`. These two paths have diverged — different data, different setup logic, different conventions.

## Goals / Non-Goals

**Goals:**
- Single fixture format consumed by both manual testing (`/debo-test` skill) and automated testing (promptfoo)
- Fixtures store only deltas (changed/new files per workflow step), layered at setup time
- Per-suite organization (e.g., `drupal-stitch`, `drupal-petshop`) with suite-specific configs and artifacts
- Snapshot workflow results into fixtures via `git diff`
- Shared prompts between manual and automated testing

**Non-Goals:**
- Replacing `scripts/setup-workspace.sh` for integration testing (that serves a different purpose — full Storybook runtime)
- Automated fixture generation pipelines (snapshots are manually triggered)
- Cross-suite fixture sharing (each suite is self-contained)

## Decisions

### D1: Fixtures live at repo root in `fixtures/`

Fixtures are stored at `fixtures/` in the repo root, committed to git. Each suite is a top-level directory (e.g., `fixtures/drupal-stitch/`).

**Why over separate repo**: Worktrees need direct access. A separate repo requires cloning/syncing.
**Why over gitignored**: Fixtures should be versioned and portable between machines.

### D2: Delta-only fixture layers, explicit composition in case files

Each fixture directory contains only the files that workflow step produces. Case files explicitly list which fixtures to layer. No implicit ordering via numbering.

```
fixtures/drupal-stitch/
├── designbook.config.yml          ← suite base config
├── vision/
│   └── designbook/vision.md
├── tokens/
│   └── designbook/design-system/design-tokens.yml
├── data-model/
│   └── designbook/data-model.yml
├── data-model-canvas/
│   └── designbook/data-model.yml  ← alternative variant
└── cases/
    └── design-screen.yaml         ← lists: [vision, tokens, data-model, ...]
```

**Why no numbering**: Workflow order is known by the case file. Numbering creates false rigidity and makes alternatives (data-model vs data-model-canvas) awkward.

### D3: Case YAML format — shared between skill and promptfoo

```yaml
fixtures:
  - vision
  - tokens
  - data-model
  - design-component
  - sections

prompt: |
  Run /debo design-screen for the homepage section.
  The homepage should include: a hero section, featured pets grid,
  search/filter area, and a call-to-action for shelters.

assert:  # optional, only used by promptfoo
  - type: javascript
    value: output.newFiles.some(f => f.endsWith('.scenes.yml'))
```

The `debo-test` skill reads `fixtures` and `prompt`. Promptfoo reads all three fields. One file, two consumers.

### D4: Workspace setup via shell script

A single `scripts/setup-test.sh` script handles workspace creation for both manual and automated use:

```bash
setup-test.sh <suite> <case> [--into <dir>]
```

1. Creates target directory (default: `workspaces/<suite>-<case>/`)
2. Copies `fixtures/<suite>/designbook.config.yml` into workspace
3. Reads `fixtures/<suite>/cases/<case>.yaml`, parses `fixtures` list
4. Layers each fixture directory in order (cp -r)
5. Symlinks `.agents/` and `.claude/` into workspace
6. Runs `git init` + `git add -A` + `git commit -m "base"` for diff tracking

Promptfoo calls the same script in its provider setup.

### D5: Snapshot via git diff

After a workflow completes, the `debo-test` skill offers to save a snapshot:

1. Run `git diff --name-only` + `git ls-files --others --exclude-standard` in workspace
2. Show the list of changed/new files to the user
3. Ask for a fixture name (default: the workflow that just ran)
4. Copy each file to `fixtures/<suite>/<fixture-name>/`, preserving directory structure
5. User commits the fixture to git

### D6: The `debo-test` skill is a standalone skill, not part of `designbook`

Located at `.agents/skills/designbook-test/`. It has no dependency on the designbook workflow engine — it just sets up workspaces and manages fixtures.

**Why standalone**: Testing infrastructure should not be coupled to the thing it tests.

## Risks / Trade-offs

- **Fixture staleness** → User knows which fixtures to invalidate (stated in exploration). No automated dependency tracking. Acceptable for single-user use.
- **Promptfoo config migration** → Existing promptfoo configs reference `promptfoo/fixtures/` and `promptfoo/workspaces/`. Migration required. One-time effort.
- **Fixture size in git** → Mostly YAML and Markdown. Negligible repo impact.
