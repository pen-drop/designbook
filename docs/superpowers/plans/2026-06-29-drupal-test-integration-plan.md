# Drupal Test-Integration — Implementation Plan (Plan 1 of 3: ddev workspace + backend command config)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `./scripts/setup-workspace.sh --drupal <name>` provisions a runnable ddev Drupal 11 site with the Designbook theme installed into it (Storybook from the docroot), `config_inspector` available, and the backend command config (`backend.cmd`/`schema_cmd`/`validate_cmd`) declared in `designbook-drupal` — the live target for sync/verify.

**Architecture:** A one-time cached Drupal base (composer-installed Drupal 11 + drush + config_inspector + an installed-site DB snapshot) is built by a helper script. `setup-workspace.sh` gains a `--drupal` mode that clones that base, `ddev start`s it, restores the snapshot, runs `debo install` to scaffold the theme + Storybook into `web/themes/custom/<theme>`, and links the local addon. All Drupal/drush specifics are command strings/config in `designbook-drupal` — no backend code in core.

**Tech Stack:** Bash, ddev (v1.25), Docker, Composer, Drupal 11, Drush 13, `drupal/config_inspector` (contrib), Designbook CLI (`debo`/`storybook-addon-designbook`), pnpm.

## Global Constraints

- **No backend-specific code in our codebase.** Core stays backend-neutral; Drupal/drush specifics are command strings + config in `designbook-drupal` (data, not code). Rely on existing drush + existing `config_inspector`. (Spec Non-Goals.)
- **No compat/migration code;** artifacts disposable, test from scratch (CLAUDE.md).
- **`pnpm check` before commit** for any addon/TS change (none expected in Plan 1).
- **`.claude/skills/` is a symlink to `.agents/skills/`** — edit only `.agents/skills/`.
- **Skill-authoring gate:** before editing any file under `.agents/skills/designbook*/`, load `designbook-skill-creator` first (CLAUDE.md).
- **This plan adds no core TS** — it is test-infra (scripts/, the drupal integration template, and `designbook-drupal` config). Keep it out of the addon core.
- ddev project names must be unique per workspace; derive from the workspace name.

---

## Plan Split (roadmap)

1. **ddev workspace + backend command config** — THIS PLAN. Live Drupal workspace + `backend.*` config. Prerequisite for 2, 3, and the existing sync Plan 5 (verify).
2. **`prepare:`/`generator:` engine primitives** — backend-neutral result-key support in the addon (`prepare: {command, as}` runs an opaque command → schema; `generator: {jsonata: path}`). Unit-tested with a fake backend command, no Drupal. Its own plan doc.
3. **Migrate sync tasks to schema-driven generation** — convert `export-<unit>` tasks to `prepare` + `generator`; `designbook-drupal` overrides declare the backend commands; retire static blueprint `to_drupal`; wire `validate_cmd`. Its own plan doc.

---

## File Structure (Plan 1)

- Create: `scripts/build-drupal-base.sh` — builds the cached Drupal base once (gitignored cache dir).
- Modify: `.gitignore` — ignore the base cache dir.
- Modify: `scripts/setup-workspace.sh` — add `--drupal` mode (clone base → ddev start → snapshot restore → `debo install` theme → link addon).
- Modify: `.agents/skills/designbook-drupal/install/blueprints/designbook-config.md` — add the `backend:` command block (`cmd`/`schema_cmd`/`validate_cmd`) to the emitted `designbook.config.yml` starting point.
- Create: `scripts/smoke-drupal-workspace.sh` — provisions a throwaway `--drupal` workspace and asserts ddev up + drush bootstrap + theme enabled + config_inspector present.

No addon/core TS changes in this plan.

---

## Task 1: Cached Drupal base builder

**Files:**
- Create: `scripts/build-drupal-base.sh`
- Modify: `.gitignore`

**Interfaces:**
- Produces: a cached base at `$REPO_ROOT/.cache/drupal-base/` containing a composer-installed Drupal 11 (`web/`, `vendor/`, `composer.json`), a `.ddev/` config, and a snapshot `db.sql.gz` of an installed standard site with `drupal/config_inspector` enabled. `setup-workspace.sh --drupal` (Task 3) consumes this dir.

- [ ] **Step 1: Write the builder script**

Create `scripts/build-drupal-base.sh`:
```bash
#!/usr/bin/env bash
# Builds a cached, composer-installed Drupal 11 base (drush + config_inspector,
# installed standard profile) + a DB dump. Run once; setup-workspace --drupal
# clones from here. Re-run to refresh. Idempotent: removes the cache first.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_DIR="$REPO_ROOT/.cache/drupal-base"

rm -rf "$BASE_DIR"
mkdir -p "$BASE_DIR"
cd "$BASE_DIR"

ddev config --project-name=designbook-drupal-base --project-type=drupal11 --docroot=web
ddev start
ddev composer create-project drupal/recommended-project:^11 -y
ddev composer require drush/drush drupal/config_inspector
ddev drush site:install standard --account-name=admin --account-pass=admin -y
ddev drush pm:enable config_inspector -y
ddev drush status
# Dump the installed DB for fast restore by consumers.
ddev export-db --file="$BASE_DIR/db.sql.gz"
# Stop the base project so it doesn't hold ports; consumers clone the dir.
ddev stop
echo "✓ Drupal base cached at $BASE_DIR"
```

- [ ] **Step 2: Ignore the cache dir**

Add to `.gitignore` (if not already covered):
```
.cache/
```

- [ ] **Step 3: Run the builder and verify**

Run: `bash scripts/build-drupal-base.sh`
Expected: ends with `✓ Drupal base cached at …/.cache/drupal-base`; `ls .cache/drupal-base/db.sql.gz web/index.php composer.json` all exist.

- [ ] **Step 4: Commit**

```bash
git add scripts/build-drupal-base.sh .gitignore
git commit -m "feat(test-infra): cached Drupal base builder (drush + config_inspector + DB snapshot)"
```

---

## Task 2: Backend command config in the install blueprint

**Files:**
- Modify: `.agents/skills/designbook-drupal/install/blueprints/designbook-config.md`

**Interfaces:**
- Produces: a `backend:` block in the `designbook.config.yml` starting point that later sync tasks read via `{{ backend.* }}`:
  - `backend.cmd` — the base backend command prefix (e.g. `ddev drush`).
  - `backend.schema_cmd` — command that, given a config name, prints its expected schema as JSON Schema on stdout (built on existing drush/config_inspector).
  - `backend.validate_cmd` — command that validates a config YAML file against Drupal's schema (built on config_inspector).

- [ ] **Step 1: Load skill-creator**

Invoke `designbook-skill-creator`; read `rules/blueprint-files.md`, `rules/common-rules.md`. Read the current `designbook-config.md` blueprint to match its format.

- [ ] **Step 2: Add the `backend:` block to the emitted config**

In `.agents/skills/designbook-drupal/install/blueprints/designbook-config.md`, extend the YAML starting point with:
```yaml
backend: drupal
# Backend command strings — interpolated as {{ backend.* }} by sync tasks.
# Core runs these opaquely; no drush/Drupal knowledge lives in core.
backend_cmd:
  cmd: "ddev drush"
  # Prints the expected JSON Schema for a config name on stdout (existing drush + config_inspector).
  schema_cmd: "ddev drush designbook:config-schema"   # resolves to existing config_inspector/typed-config capability
  # Validates a config YAML file against Drupal's schema; non-zero exit on violation.
  validate_cmd: "ddev drush config:inspect --detail"
```
Document in the blueprint prose: these are **data**, consumed via `{{ backend_cmd.* }}` interpolation by sync tasks; the exact `schema_cmd`/`validate_cmd` resolution to existing drush/config_inspector capability is finalized in Plan 3. (If `config_inspector` exposes no direct "emit JSON Schema for one config name" command, `schema_cmd` is realized in Plan 3 via an existing `drush php:eval` one-liner string — still data, not authored code.)

- [ ] **Step 3: Validate the skill file**

Run the designbook-skill-creator validator over `designbook-config.md`. Expected: zero errors.

- [ ] **Step 4: Touch + commit**

```bash
touch .agents/skills/designbook-drupal/install/blueprints/designbook-config.md
git add .agents/skills/designbook-drupal/install/blueprints/designbook-config.md
git commit -m "feat(drupal): backend command config (cmd/schema_cmd/validate_cmd) in install blueprint"
```

---

## Task 3: `--drupal` mode in setup-workspace.sh

**Files:**
- Modify: `scripts/setup-workspace.sh`

**Interfaces:**
- Consumes: the cached base from Task 1 (`.cache/drupal-base/`).
- Produces: a workspace at `workspaces/<name>/` that is a running ddev Drupal site with the theme installed at `web/themes/custom/<theme>`, the local addon linked, and the backend config present. Invoked as `./scripts/setup-workspace.sh --drupal <name>`.

- [ ] **Step 1: Add `--drupal` flag parsing**

In `scripts/setup-workspace.sh` argument loop, add a `--drupal` boolean flag (default off). When off, behavior is unchanged (current theme+Storybook workspace).

- [ ] **Step 2: Branch into Drupal provisioning when `--drupal` is set**

After computing `WORKSPACE_DIR`, when `--drupal` is set, replace the rsync-from-`test-integration-drupal` step with:
```bash
BASE_DIR="$REPO_ROOT/.cache/drupal-base"
if [ ! -d "$BASE_DIR" ]; then
  echo "Drupal base missing — run scripts/build-drupal-base.sh first" >&2; exit 1
fi
rsync -a --exclude='.ddev/.gitignore' "$BASE_DIR/" "$WORKSPACE_DIR/"
cd "$WORKSPACE_DIR"
ddev config --project-name="db-$WORKSPACE_NAME" --project-type=drupal11 --docroot=web
ddev start
ddev import-db --file="$WORKSPACE_DIR/db.sql.gz"
ddev drush status
```

- [ ] **Step 3: Install the theme + Storybook via `debo install`**

Still under the `--drupal` branch, after the site is up, run the Designbook install so the theme + Storybook land in the docroot:
```bash
# Link the local addon first so debo resolves the repo build.
(cd "$REPO_ROOT/packages/storybook-addon-designbook" && pnpm run build)
ddev exec "cd web && npx --yes storybook-addon-designbook install" || \
  echo "NOTE: if debo install is agent-driven, run it via the CLI/agent against $WORKSPACE_DIR/web"
```
(If `debo install` is not a single headless CLI command in this repo, document that the theme is installed by running the `install` workflow against `$WORKSPACE_DIR/web`; the workspace is otherwise ready. Confirm by checking which form exists — `npx storybook-addon-designbook install --help`.)

- [ ] **Step 4: Symlink agent dirs + link addon (reuse existing logic)**

Apply the same `.claude`/`.cursor`/`.codex`/`.agents` symlinks and `pnpm add -D link:` addon linking the script already does for the theme workspace, rooted at the theme dir inside the docroot.

- [ ] **Step 5: Verify provisioning**

Run: `./scripts/setup-workspace.sh --drupal smoke1`
Expected: `ddev drush status` shows `Drupal bootstrap : Successful`; `ls workspaces/smoke1/web/themes/custom/` shows the scaffolded theme; `ddev drush pm:list --status=enabled | grep config_inspector` is non-empty.

- [ ] **Step 6: Commit**

```bash
git add scripts/setup-workspace.sh
git commit -m "feat(test-infra): --drupal mode — ddev Drupal workspace with theme via debo install"
```

---

## Task 4: Drupal-workspace smoke check

**Files:**
- Create: `scripts/smoke-drupal-workspace.sh`

**Interfaces:**
- Consumes: Task 1 base + Task 3 `--drupal` mode.
- Produces: a self-contained smoke that provisions a throwaway workspace, asserts the integration, and cleans up. Returns non-zero on any failure.

- [ ] **Step 1: Write the smoke script**

Create `scripts/smoke-drupal-workspace.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME="smoke-$$"
WS="$REPO_ROOT/workspaces/$NAME"
cleanup() { (cd "$WS" 2>/dev/null && ddev delete -Oy) || true; rm -rf "$WS"; }
trap cleanup EXIT

"$REPO_ROOT/scripts/setup-workspace.sh" --drupal "$NAME"
cd "$WS"

ddev drush status | grep -q "Drupal bootstrap : Successful" || { echo "FAIL: no bootstrap"; exit 1; }
ddev drush pm:list --status=enabled --field=name | grep -qx "config_inspector" || { echo "FAIL: config_inspector not enabled"; exit 1; }
ls web/themes/custom/*/.storybook >/dev/null 2>&1 || { echo "FAIL: theme/storybook not installed"; exit 1; }
echo "✓ Drupal workspace smoke passed"
```

- [ ] **Step 2: Make it executable + run**

Run: `chmod +x scripts/smoke-drupal-workspace.sh && bash scripts/smoke-drupal-workspace.sh`
Expected: `✓ Drupal workspace smoke passed`; exit 0; the throwaway workspace + ddev project are removed.

- [ ] **Step 3: Commit**

```bash
git add scripts/smoke-drupal-workspace.sh
git commit -m "test(test-infra): smoke for --drupal workspace (bootstrap + config_inspector + theme)"
```

---

## Self-Review (Plan 1)

- **Spec coverage (Part A):** cached codebase + DB snapshot (T1), `debo install` theme + ddev workspace (T3), `config_inspector` in base composer (T1) + enabled (T1) + asserted (T4), backend command config as data in `designbook-drupal` (T2), no backend code in core (entire plan is scripts + skill config). Part B (prepare/generator primitives, schema-driven transforms) → Plans 2–3 (intentionally out of scope).
- **Placeholder scan:** the only soft spot is T3 Step 3 — `debo install`'s exact headless invocation must be confirmed against the repo (`npx storybook-addon-designbook install --help`); the step says how to confirm and the fallback, not a vague TODO. T2 notes `schema_cmd`'s exact realization is finalized in Plan 3 (data string), which is correct scoping, not a placeholder in core.
- **Consistency:** base dir `.cache/drupal-base/` (T1) consumed verbatim in T3; ddev project naming `db-<name>` (T3) and `designbook-drupal-base` (T1) are distinct (no port clash); `config_inspector` enabled in T1, asserted in T4; `backend_cmd.*` config (T2) is consumed in Plan 3, not this plan.
- **Infra caveat:** ddev/composer/site:install require Docker; tasks verify via `ddev drush status` rather than unit tests — appropriate for provisioning scripts.
