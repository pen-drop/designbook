---
when:
  steps: [setup-compare]
params:
  scene_id: { type: string }
  component_id: { type: string }
  reference: { type: array, default: [] }
  breakpoints: { type: array }
result:
  checks:
    type: array
    items:
      type: object
      required: [story_id, breakpoint, region]
      properties:
        story_id: { type: string }
        breakpoint: { type: string }
        region: { type: string }
        threshold: { type: number, default: 0 }
        selector: { type: string }
        type: { type: string }
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
---

# Setup Compare

Creates the story entity and returns the `checks` array for the inline capture and compare stages.

## Step 1: Restart Storybook

Always restart Storybook before capture to ensure compiled state matches generated files:

```bash
_debo storybook start --force
```

Wait for `{ ready: true }`. If startup fails, report errors from `_debo storybook logs` and pause.

## Step 2: Determine Mode and Regions

**Component mode** (`component_id` param is set):
- Regions: always `["full"]`
- Story resolution: `_debo story --component ${component_id}`

**Scene mode** (`scene_id` param is set):
- Shell scenes (`scene_id` ends with `:shell`): regions `["header", "footer"]`
- All other scenes: regions `["full"]`
- Story resolution: `_debo story --scene ${scene_id}`

## Step 3: Build meta-seed JSON

From `params.reference` and resolved breakpoints + regions, build the meta-seed.

Build the full breakpoints x regions matrix:

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

## Step 4: Create story and get checks

Use the appropriate CLI command based on mode:

**Scene mode:**
```bash
CHECKS=$(_debo story --scene ${scene_id} --create --json '<meta-seed-json>' checks)
```

**Component mode:**
```bash
CHECKS=$(_debo story --component ${component_id} --create --json '<meta-seed-json>' checks)
```

This creates the story directory + `meta.yml`, validates the reference exists, and returns the checks as a JSON array. Each check has: `story_id`, `breakpoint`, `region`, `threshold`.

If the command fails, report the error and pause.

## Step 5: Complete with checks

The `checks` array flows into the `capture` and `compare` stages via the `each: checks` iterables.
