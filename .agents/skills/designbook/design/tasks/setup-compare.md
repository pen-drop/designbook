---
when:
  steps: [setup-compare]
params:
  type: object
  required: [story_id, breakpoints]
  properties:
    story_id: { type: string }
    reference: { type: array, default: [] }
    breakpoints: { type: array }
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
result:
  type: object
  required: [checks]
  properties:
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
---

# Setup Compare

Creates the story entity and returns the `checks` array for the inline capture and compare stages.

## Step 1: Restart Storybook

Always restart Storybook before capture to ensure compiled state matches generated files:

```bash
_debo storybook start --force
```

Wait for `{ ready: true }`. If startup fails, report errors from `_debo storybook logs` and pause.

## Step 2: Determine Regions

Derive regions from the story metadata:
- Shell stories (storyId contains `--shell`): regions `["header", "footer"]`
- All other stories: regions `["full"]`

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

```bash
CHECKS=$(_debo story ${story_id} --create --json '<meta-seed-json>' checks)
```

This creates the story directory + `meta.yml`, validates the reference exists, and returns the checks as a JSON array. Each check has: `story_id`, `breakpoint`, `region`, `threshold`.

If the command fails, report the error and pause.

## Step 5: Complete with checks

The `checks` array flows into the `capture` and `compare` stages via the `each: checks` iterables.
