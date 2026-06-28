# Drupal Test-Integration — Implementation Plan (Plan 1 of 3: unified Drupal-layout workspace, ddev lazy)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `./scripts/setup-workspace.sh <name>` always produces a **Drupal-layout** workspace (the fixture theme at `web/themes/custom/<theme>` inside a cloned Drupal codebase) **without starting ddev**; `design-*`/Storybook run from the theme with no Drupal; a separate `--start` step boots ddev + restores the DB + enables the theme only when sync/verify need live Drupal. Worktree-safe.

**Architecture:** A one-time cached Drupal base (composer-installed Drupal 11 + drush + `config_inspector` + an installed-site DB dump) is built once and stored at the **git common root** so all worktrees share it. `setup-workspace.sh` clones the base into the workspace, rsyncs the (upgraded, complete) fixture theme into the docroot, configures ddev with a worktree-namespaced project name, and stops there. A lazy `--start` step runs `ddev start` + DB import + `theme:enable`. All Drupal/drush specifics are command strings/config in `designbook-drupal` — no backend code in core.

**Tech Stack:** Bash, ddev (v1.25), Docker, Composer, Drupal 11, Drush 13, `drupal/config_inspector`, Designbook CLI, pnpm.

## Global Constraints

- **No backend-specific code in our codebase.** Core stays backend-neutral; Drupal/drush specifics are command strings + config in `designbook-drupal` (data, not code). Use existing drush + existing `config_inspector`. (Spec Non-Goals.)
- **ddev is lazy** — never started by `setup-workspace`; only by the explicit `--start` step. `design-*` must work with no ddev.
- **Unified layout** — every workspace is Drupal-layout (theme in docroot); no theme-only variant.
- **Worktree-safe** — workspaces at `<worktree-root>/workspaces/<name>`; base cache shared at git common root; ddev project name namespaced per worktree.
- **No compat/migration code;** test from scratch (CLAUDE.md).
- **`.claude/skills/` is a symlink to `.agents/skills/`** — edit only `.agents/skills/`.
- **Skill-authoring gate:** load `designbook-skill-creator` before editing any `.agents/skills/designbook*/` file.
- **No core TS in this plan** — scripts, the fixture theme, and `designbook-drupal` config only.

---

## Plan Split (roadmap)

1. **Unified Drupal-layout workspace, ddev lazy** — THIS PLAN. Prerequisite for 2, 3, and sync Plan 5 (verify).
2. **`prepare:`/`generator:` engine primitives** — backend-neutral result-key support in the addon, unit-tested with a fake backend command (no Drupal). Own plan doc.
3. **Migrate sync tasks to schema-driven generation** — `prepare`+`generator` on `export-<unit>` tasks; `designbook-drupal` overrides declare backend commands; retire static `to_drupal`. Own plan doc.

---

## File Structure (Plan 1)

- Create: `scripts/build-drupal-base.sh` — builds the shared cached base at the git common root.
- Create: `scripts/start-drupal-workspace.sh` — lazy `ddev start` + DB import + `theme:enable` for a workspace.
- Modify: `.gitignore` — ignore `.cache/`.
- Modify: `scripts/setup-workspace.sh` — always Drupal-layout (clone base + rsync fixture theme + ddev config, no start); worktree-namespaced project; reuse existing symlink/addon-link logic.
- Modify (upgrade to a real Drupal theme): `packages/integrations/test-integration-drupal/` — add `test_integration_drupal.info.yml`, `test_integration_drupal.libraries.yml`, and ensure SDC live under `components/`.
- Modify: `.agents/skills/designbook-drupal/install/blueprints/designbook-config.md` — add the `backend_cmd:` block.
- Create: `scripts/smoke-drupal-workspace.sh` — smoke: design-path (no ddev) + start-path (ddev bootstrap + config_inspector + theme enabled), worktree-safe, self-cleaning.

No addon/core TS changes.

---

## Task 1: Shared cached Drupal base builder

**Files:**
- Create: `scripts/build-drupal-base.sh`
- Modify: `.gitignore`

**Interfaces:**
- Produces: a cached base at `<git-common-root>/.cache/drupal-base/` containing a composer-installed Drupal 11 (`web/`, `vendor/`, `composer.json`, `.ddev/`) and `db.sql.gz` (installed standard site, `config_inspector` enabled). Consumed by Tasks 4 & 5. Shared across worktrees.

- [ ] **Step 1: Write the builder script**

Create `scripts/build-drupal-base.sh`:
```bash
#!/usr/bin/env bash
# Builds the SHARED cached Drupal 11 base (drush + config_inspector, installed
# standard profile) + a DB dump, at the git common root so all worktrees reuse it.
# Run once; re-run to refresh (removes the cache first).
set -euo pipefail
COMMON_ROOT="$(cd "$(git rev-parse --git-common-dir)/.." && pwd -P)"
BASE_DIR="$COMMON_ROOT/.cache/drupal-base"

rm -rf "$BASE_DIR"; mkdir -p "$BASE_DIR"; cd "$BASE_DIR"
ddev config --project-name=designbook-drupal-base --project-type=drupal11 --docroot=web
ddev start
ddev composer create-project drupal/recommended-project:^11 -y
ddev composer require drush/drush drupal/config_inspector
ddev drush site:install standard --account-name=admin --account-pass=admin -y
ddev drush pm:enable config_inspector -y
ddev drush status
ddev export-db --file="$BASE_DIR/db.sql.gz"
ddev stop                                   # free ports; consumers clone the dir
echo "✓ Drupal base cached at $BASE_DIR"
```

- [ ] **Step 2: Ignore the cache dir**

Add to `.gitignore`:
```
.cache/
```

- [ ] **Step 3: Run + verify**

Run: `bash scripts/build-drupal-base.sh`
Expected: ends `✓ Drupal base cached at …/.cache/drupal-base`; `ls "$(git rev-parse --git-common-dir)/../.cache/drupal-base/db.sql.gz"` exists.

- [ ] **Step 4: Commit**

```bash
git add scripts/build-drupal-base.sh .gitignore
git commit -m "feat(test-infra): shared cached Drupal base (drush + config_inspector + DB snapshot)"
```

---

## Task 2: Upgrade the fixture into a complete Drupal theme

**Files:**
- Create: `packages/integrations/test-integration-drupal/test_integration_drupal.info.yml`
- Create: `packages/integrations/test-integration-drupal/test_integration_drupal.libraries.yml`
- Verify/relocate: SDC components under `packages/integrations/test-integration-drupal/components/`

**Interfaces:**
- Produces: a droppable, enableable Drupal theme named `test_integration_drupal` (matching the `component.namespace` in the fixture's `designbook.config.yml`). Consumed by Task 4 (rsynced into the docroot) and Task 5 (`theme:enable`).

- [ ] **Step 1: Add the theme info file**

Create `test_integration_drupal.info.yml`:
```yaml
name: 'Test Integration Drupal'
type: theme
description: 'Designbook test-integration theme (fixture).'
core_version_requirement: ^11
base theme: false
libraries:
  - test_integration_drupal/global
regions:
  header: Header
  content: Content
  sidebar: Sidebar
  footer: Footer
```

- [ ] **Step 2: Add the libraries file**

Create `test_integration_drupal.libraries.yml`:
```yaml
global:
  css:
    theme:
      css/app.css: {}
```
(Use the fixture's actual built CSS entry; `css/app.src.css` is the source — point `global` at the compiled output the existing Storybook/vite build emits, or the source if Drupal compiles it. Confirm the emitted CSS path under `css/` before finalizing.)

- [ ] **Step 3: Ensure SDC components are present under `components/`**

Confirm `components/` exists with `*.component.yml` SDC (the fixture's `designbook.config.yml` declares `component.src: components`, namespace `test_integration_drupal`). If the SDC live elsewhere or aren't built, place/build them under `components/` so Drupal's SDC discovery finds `test_integration_drupal:<name>`.

Run: `ls packages/integrations/test-integration-drupal/components/*/*.component.yml | head`
Expected: at least one SDC component file.

- [ ] **Step 4: Sanity-check the theme parses (offline)**

Run: `npx js-yaml packages/integrations/test-integration-drupal/test_integration_drupal.info.yml >/dev/null && echo OK`
Expected: `OK` (valid YAML; full Drupal validation happens at `theme:enable` in Task 5/smoke).

- [ ] **Step 5: Commit**

```bash
git add packages/integrations/test-integration-drupal/test_integration_drupal.info.yml packages/integrations/test-integration-drupal/test_integration_drupal.libraries.yml packages/integrations/test-integration-drupal/components
git commit -m "feat(fixture): upgrade test-integration-drupal to a complete Drupal theme (info/libraries/SDC)"
```

---

## Task 3: Backend command config in the install blueprint

**Files:**
- Modify: `.agents/skills/designbook-drupal/install/blueprints/designbook-config.md`

**Interfaces:**
- Produces: a `backend_cmd:` block in the emitted `designbook.config.yml` starting point, read by sync tasks (Plan 3) via `{{ backend_cmd.* }}`: `cmd`, `schema_cmd`, `validate_cmd`.

- [ ] **Step 1: Load skill-creator**

Invoke `designbook-skill-creator`; read `rules/blueprint-files.md`, `rules/common-rules.md`. Read the current blueprint.

- [ ] **Step 2: Add the `backend_cmd:` block**

In the blueprint's emitted YAML, add:
```yaml
# Backend command strings — interpolated as {{ backend_cmd.* }} by sync tasks.
# Core runs these opaquely; no drush/Drupal knowledge lives in core. Built on
# existing drush + config_inspector. Exact schema_cmd/validate_cmd realization is
# finalized in Plan 3 (still data strings, not authored code).
backend_cmd:
  cmd: "ddev drush"
  schema_cmd: "ddev drush designbook:config-schema"   # prints JSON Schema for a config name (existing typed-config/config_inspector capability)
  validate_cmd: "ddev drush config:inspect --detail"  # non-zero exit on schema violation
```
Document the semantics in prose (data consumed by interpolation; finalized in Plan 3).

- [ ] **Step 3: Validate**

Run the designbook-skill-creator validator over the blueprint. Expected: zero errors.

- [ ] **Step 4: Touch + commit**

```bash
touch .agents/skills/designbook-drupal/install/blueprints/designbook-config.md
git add .agents/skills/designbook-drupal/install/blueprints/designbook-config.md
git commit -m "feat(drupal): backend_cmd config (cmd/schema_cmd/validate_cmd) in install blueprint"
```

---

## Task 4: setup-workspace.sh — unified Drupal layout (no ddev start)

**Files:**
- Modify: `scripts/setup-workspace.sh`

**Interfaces:**
- Consumes: the base from Task 1; the theme fixture from Task 2.
- Produces: `workspaces/<name>/` = a Drupal-layout workspace (cloned base + fixture theme at `web/themes/custom/test_integration_drupal`), ddev configured with a worktree-namespaced project name but **not started**, agent dirs symlinked, local addon linked. Invocation unchanged: `./scripts/setup-workspace.sh <name>`.

- [ ] **Step 1: Resolve roots + worktree id at the top of the script**

Add near `REPO_ROOT`:
```bash
COMMON_ROOT="$(cd "$(git rev-parse --git-common-dir)/.." && pwd -P)"
BASE_DIR="$COMMON_ROOT/.cache/drupal-base"
WT_ID="$(printf '%s' "$REPO_ROOT" | cksum | cut -d' ' -f1)"   # stable per-worktree id
THEME="test_integration_drupal"
```

- [ ] **Step 2: Replace the body: clone base, drop in theme, configure ddev (no start)**

Replace the rsync-from-`test-integration-drupal` step with:
```bash
[ -d "$BASE_DIR" ] || { echo "Run scripts/build-drupal-base.sh first" >&2; exit 1; }
rm -rf "$WORKSPACE_DIR"; mkdir -p "$WORKSPACE_DIR"
rsync -a --exclude='.ddev/.gitignore' "$BASE_DIR/" "$WORKSPACE_DIR/"
# Drop the fixture theme into the docroot.
rsync -a --exclude='node_modules' --exclude='.git' \
  "$REPO_ROOT/packages/integrations/test-integration-drupal/" \
  "$WORKSPACE_DIR/web/themes/custom/$THEME/"
# Configure ddev with a worktree-namespaced project; DO NOT start it.
( cd "$WORKSPACE_DIR" && ddev config --project-name="db-$WT_ID-$WORKSPACE_NAME" --project-type=drupal11 --docroot=web )
```

- [ ] **Step 3: Keep symlinks + addon link, rooted at the theme dir**

Point the existing `.claude/.cursor/.codex/.agents` symlink logic and the `pnpm add -D link:` addon-link + `pnpm install` at `$WORKSPACE_DIR/web/themes/custom/$THEME` (where `designbook.config.yml`, `.storybook`, `package.json` now live). Build the addon first (existing `pnpm run build` step stays).

- [ ] **Step 4: Update the final message**

Print: workspace ready (Drupal layout, ddev NOT started); to use Storybook/design-*: `cd web/themes/custom/$THEME`; to boot Drupal for sync/verify: `./scripts/start-drupal-workspace.sh <name>`.

- [ ] **Step 5: Verify (no ddev started)**

Run: `./scripts/setup-workspace.sh ws1`
Expected: `ls workspaces/ws1/web/themes/custom/test_integration_drupal/.storybook` exists; `ls workspaces/ws1/.ddev/config.yaml` exists; `ddev list` does NOT show `db-*-ws1` as running (configured, not started).

- [ ] **Step 6: Commit**

```bash
git add scripts/setup-workspace.sh
git commit -m "feat(test-infra): unified Drupal-layout workspace (clone base + fixture theme, ddev not started, worktree-namespaced)"
```

---

## Task 5: Lazy ddev start

**Files:**
- Create: `scripts/start-drupal-workspace.sh`

**Interfaces:**
- Consumes: a workspace produced by Task 4 + the base's `db.sql.gz`.
- Produces: a running ddev site for that workspace, DB restored, theme enabled — the live target for sync/verify.

- [ ] **Step 1: Write the start script**

Create `scripts/start-drupal-workspace.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME="${1:?usage: start-drupal-workspace.sh <name>}"
WS="$REPO_ROOT/workspaces/$NAME"
THEME="test_integration_drupal"
[ -d "$WS" ] || { echo "No workspace $WS — run setup-workspace.sh $NAME first" >&2; exit 1; }
cd "$WS"
ddev start
[ -f "$WS/db.sql.gz" ] && ddev import-db --file="$WS/db.sql.gz"
ddev drush theme:enable "$THEME" -y
ddev drush status
echo "✓ Drupal up for workspace $NAME (theme $THEME enabled)"
```

- [ ] **Step 2: Make executable + verify**

Run: `chmod +x scripts/start-drupal-workspace.sh && ./scripts/start-drupal-workspace.sh ws1`
Expected: `ddev drush status` shows `Drupal bootstrap : Successful`; ends `✓ Drupal up for workspace ws1 …`.

- [ ] **Step 3: Commit**

```bash
git add scripts/start-drupal-workspace.sh
git commit -m "feat(test-infra): lazy ddev start (start + db import + theme:enable) for a workspace"
```

---

## Task 6: Smoke — design-path (no ddev) + start-path

**Files:**
- Create: `scripts/smoke-drupal-workspace.sh`

**Interfaces:**
- Consumes: Tasks 1, 4, 5.
- Produces: a self-cleaning smoke asserting (a) a fresh workspace exists in Drupal layout with the theme, no ddev running (design-* path); (b) after start, Drupal boots, `config_inspector` enabled, theme enabled. Worktree-safe naming. Non-zero on failure.

- [ ] **Step 1: Write the smoke**

Create `scripts/smoke-drupal-workspace.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME="smoke-$$"; WS="$REPO_ROOT/workspaces/$NAME"; THEME="test_integration_drupal"
cleanup() { (cd "$WS" 2>/dev/null && ddev delete -Oy) || true; rm -rf "$WS"; }
trap cleanup EXIT

"$REPO_ROOT/scripts/setup-workspace.sh" "$NAME"
# (a) design-* path: theme present in Drupal layout, NO ddev running
ls "$WS/web/themes/custom/$THEME/.storybook" >/dev/null || { echo "FAIL: theme/storybook missing"; exit 1; }
( cd "$WS" && ddev describe -j 2>/dev/null | grep -q '"status":"running"' ) && { echo "FAIL: ddev should not be running after setup"; exit 1; } || true

# (b) start path: boot + assertions
"$REPO_ROOT/scripts/start-drupal-workspace.sh" "$NAME"
cd "$WS"
ddev drush status | grep -q "Drupal bootstrap : Successful" || { echo "FAIL: no bootstrap"; exit 1; }
ddev drush pm:list --status=enabled --field=name | grep -qx "config_inspector" || { echo "FAIL: config_inspector not enabled"; exit 1; }
ddev drush pm:list --type=theme --status=enabled --field=name | grep -qx "$THEME" || { echo "FAIL: theme not enabled"; exit 1; }
echo "✓ Drupal workspace smoke passed (design-path no-ddev + start-path)"
```

- [ ] **Step 2: Make executable + run**

Run: `chmod +x scripts/smoke-drupal-workspace.sh && bash scripts/smoke-drupal-workspace.sh`
Expected: `✓ Drupal workspace smoke passed …`; exit 0; throwaway workspace + ddev project removed.

- [ ] **Step 3: Commit**

```bash
git add scripts/smoke-drupal-workspace.sh
git commit -m "test(test-infra): smoke for unified Drupal-layout workspace (no-ddev design path + start path)"
```

---

## Self-Review (Plan 1)

- **Spec coverage (Part A):** unified Drupal layout (T4), ddev lazy (T4 no start, T5 start), shared worktree-safe base (T1 common-root, T4 `WT_ID` namespacing), fixture upgraded to complete theme (T2), `config_inspector` in base + enabled + asserted (T1/T6), backend_cmd config as data (T3), no backend code in core (all scripts + skill config), design-* works without ddev (T6 assertion a). Part B → Plans 2–3.
- **Placeholder scan:** T2 Step 2 (libraries CSS path) and Step 3 (SDC location) say *how to confirm* against the fixture rather than a vague TODO; T3 notes `schema_cmd` finalized in Plan 3 (correct scoping). No bare TODOs.
- **Consistency:** base at `<common-root>/.cache/drupal-base` (T1) consumed in T4/T5; theme machine name `test_integration_drupal` consistent across T2 (.info.yml), T4 (rsync target), T5/T6 (`theme:enable`/assert); ddev project `db-$WT_ID-$NAME` (T4) deleted by name via the workspace dir in T6 cleanup; `config_inspector` enabled in T1, asserted in T6.
- **Worktree note:** `WT_ID=cksum(REPO_ROOT)` gives a stable per-worktree ddev namespace; base cache shared at common root; workspaces under the worktree's own `workspaces/`.
- **Infra caveat:** ddev/Docker required for T1/T5/T6; verification is smoke (`ddev drush status`) not unit tests — appropriate for provisioning scripts. T2/T3 are offline (YAML + validator).
