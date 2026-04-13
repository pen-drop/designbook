---
when:
  steps: [setup-compare]
params:
  scene: ~
  reference: []
  breakpoints: []
result:
  checks:
    type: array
    items:
      $ref: ../schemas.yml#/Check
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
---

# Setup Compare

Creates the story entity and returns the `checks` array for the inline capture and compare stages. This is a lightweight version of the design-verify intake — it only creates the story and resolves checks.

## Step 1: Restart Storybook

Always restart Storybook before capture to ensure compiled state matches generated files:

```bash
_debo storybook start --force
```

Wait for `{ ready: true }`. If startup fails, report errors from `_debo storybook logs` and pause.

This is mandatory — the Storybook watcher may serve stale compiled output for recently generated or modified components, making screenshot comparison unreliable.

## Step 2: Build meta-seed JSON

From `params.reference` (array from the scene definition) and resolved breakpoints, build the meta-seed.

**Determine regions** from the scene name:
- **Shell scenes** (`scene` ends with `:shell`): `"header": {}`, `"footer": {}`
- **All other scenes**: `"full": {}`

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

If `reference` is empty or null: skip compare by completing with an empty `checks` array.

### Apply matched rules (before story creation)

Before calling the CLI, apply all loaded rules for this stage that modify the reference. Rules may resolve provider-specific URLs, set additional fields on `reference.source` (e.g. `hasMarkup`), or transform the meta-seed.

## Step 3: Create story and get checks

```bash
CHECKS=$(_debo story --scene ${scene} --create --json '<meta-seed-json>' checks)
```

This creates the story directory + `meta.yml`, validates the reference exists, and returns the checks as a JSON array. Each check has: `storyId`, `breakpoint`, `region`, `threshold`.

If the command fails, report the error and pause.

## Step 4: Complete with checks

```bash
_debo workflow result --task $TASK_ID --key checks --json "$CHECKS"
```

```bash
_debo workflow done --workflow $WORKFLOW_NAME --task $TASK_ID
```

The `checks` array flows into the `capture` and `compare` stages via the `each: checks` iterables.
