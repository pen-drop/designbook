---
when:
  steps: [design-verify:intake]
params:
  scene: ~
  reference: []
files: []
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
---

# Intake: Design Verify

Visual testing for a single scene. Called once per scene — either as subworkflow (from design-shell/design-screen) or standalone.

## Context Detection

- **`params.scene` is set:** Subworkflow — skip dialog, go to Step 2.
- **`params.scene` is NOT set:** Standalone — proceed with Step 1.

## Step 1: Identify Scene and Reference (standalone only)

Ask the user which scene to verify and how:

> "Which scene should I verify? (e.g. `design-system:shell`, `homepage:landing`)"

Then ask for the reference:

> "What is the design reference?
> - Stitch screen ID (e.g. `projects/123/screens/abc`)
> - URL to a design screenshot
> - Or 'skip' to verify without reference"

Then ask for breakpoints:

> "Which breakpoints to test? (default: all from design-tokens)"

Set `params.scene` and `params.reference` from the answers. `reference` is an array:
```json
[{"type": "stitch", "url": "projects/...", "threshold": 3, "title": "Screen Name"}]
```

Reference entries describe the design source only — no `breakpoint` field. Breakpoints are resolved separately in Step 3a.

## Step 2: Ensure Storybook is running

```bash
_debo storybook status
```

- **If running:** check freshness — if component files are newer than `started_at`, restart with `_debo storybook start --force`.
- **If not running:** `_debo storybook start`. Wait for `{ ready: true }`.
- **If startup fails:** report errors from `_debo storybook logs` and pause.

## Step 3: Create Story and Get Checks

Build a meta-seed JSON from `params.reference` and create the story via CLI. The CLI validates that a reference exists and returns the checks array.

### 3a. Build meta-seed JSON

From `params.reference` (array) and resolved breakpoints, build the meta seed.

**Determine regions** from the scene name:
- **Shell scenes** (`scene` ends with `:shell`): `"header": {}`, `"footer": {}`
- **All other scenes**: `"full": {}`

**Resolve breakpoints** (independent of reference source):
1. If standalone mode: use breakpoints from user input (Step 1)
2. Fallback: read ALL breakpoints from `design-tokens.yml`

Build the full breakpoints × regions matrix:

```json
{
  "reference": {
    "source": {
      "url": "<reference[0].url>",
      "origin": "<reference[0].type>",
      "hasMarkup": true
    },
    "breakpoints": {
      "<bp1>": { "threshold": <threshold>, "regions": { "<region>": {}, ... } },
      "<bp2>": { "threshold": <threshold>, "regions": { "<region>": {}, ... } }
    }
  }
}
```

Breakpoints are a test matrix concern — every resolved breakpoint gets an entry with all regions. The `reference[]` entries describe WHERE the design comes from, not which viewports to test.

If `reference` is empty or null: report "No reference for {scene}" and pause.

### 3b. Get checks from CLI

```bash
CHECKS=$(_debo story --scene ${scene} --create --json '<meta-seed-json>' checks)
```

This creates the story directory + `meta.yml`, validates the reference exists, and returns the checks as a JSON array. Each check has: `storyId`, `breakpoint`, `region`, `threshold`.

If the command fails (no reference, no checks), report the error and pause.

### 3c. Apply matched rules (before story creation)

Before calling `_debo story checks`, apply all loaded rules for this stage that modify the reference. Rules may resolve provider-specific URLs, set additional fields on `reference.source` (e.g. `hasMarkup`), or transform the meta-seed.

Apply rule modifications to the meta-seed JSON before passing it to the CLI. The `reference.source` object in the meta-seed must include all fields returned by provider rules — not just `url` and `origin`.

## Step 4: Complete with Checks

Pass the checks array and `scene` param to `workflow done`. The checks array includes `type` (`"markup"` or `"screenshot"`) on each check, with markup checks ordered first.

```bash
_debo workflow done --workflow $WORKFLOW_NAME --task $TASK_ID \
  --params "{\"scene\": \"${scene}\", \"checks\": $CHECKS}"
```
