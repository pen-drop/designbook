---
trigger:
  steps: [setup-compare]
params:
  type: object
  required: [story_id, breakpoints]
  properties:
    story_id:
      $ref: ../../scenes/schemas.yml#/StoryId
    reference: { type: array, default: [] }
    breakpoints: { type: array }
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
result:
  type: object
  required: [story-meta, checks]
  properties:
    story-meta:
      path: designbook/stories/{story_id}/meta.yml
      type: object
      $ref: ../schemas.yml#/StoryMeta
    checks:
      type: array
      items:
        $ref: ../schemas.yml#/Check
---

# Setup Compare

Builds the `meta.yml` configuration for the story and returns the runtime `checks` matrix that drives the capture + compare stages.

## Step 1: Restart Storybook

Always restart Storybook before capture to ensure compiled state matches generated files:

```bash
_debo storybook start --force
```

Wait for `{ ready: true }`. If startup fails, report errors from `_debo storybook logs` and pause.

## Step 2: Determine Regions

Derive regions from the story metadata:
- Shell stories (`story_id` contains `--shell`): regions `["header", "footer"]`
- All other stories: regions `["full"]`

## Step 3: Apply rules that shape the reference

Before building the result, apply all loaded rules for this stage that modify the reference. Rules may resolve provider-specific URLs, set additional fields on `reference.source` (e.g. `hasMarkup`), or transform the seed.

If `reference` is empty or null: skip compare by completing with an empty `checks` array and a `story-meta` that contains only the breakpoints × regions matrix (no `reference.source`).

## Step 4: Build the result

The result contains two keys:

1. **`story-meta`** — the complete `meta.yml` body:

```json
{
  "reference": {
    "source": {
      "url": "<reference[0].url>",
      "origin": "<reference[0].type>",
      "hasMarkup": true
    },
    "breakpoints": {
      "<bp>": {
        "threshold": <threshold>,
        "regions": {
          "<region>": { "selector": "<selector or empty>", "threshold": <threshold> }
        }
      }
    }
  }
}
```

2. **`checks`** — the runtime matrix as a JSON array. One entry per (breakpoint × region):

```json
[
  { "story_id": "<id>", "breakpoint": "<bp>", "region": "<region>", "threshold": <number> }
]
```

## Step 5: Complete the task

Pass both as a single JSON object via `workflow done --data`. The engine writes `story-meta` to disk and collects `checks` into the workflow scope for the `each: checks` expansion in later stages.
