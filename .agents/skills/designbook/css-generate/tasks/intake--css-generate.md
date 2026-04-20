---
trigger:
  steps: [css-generate:intake]
domain: [css, tokens]
params:
  type: object
  required: [design_tokens]
  properties:
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
      $ref: ../../tokens/schemas.yml#/DesignTokens
result:
  type: object
  required: [groups]
  properties:
    groups:
      type: array
      description: "Token groups that downstream stages iterate over via each: group."
      items:
        $ref: ../schemas.yml#/CssGroup
---

# Intake: CSS Generate

Check whether CSS regeneration is needed, confirm with the user, and emit the token-group list downstream stages iterate over.

## Step 1: Check Regeneration

Check if generated CSS token files (location determined by the active CSS framework skill) are newer than `$DESIGNBOOK_DATA/design-system/design-tokens.yml`.

**If up to date:**

> "CSS token files are already up to date. Force regeneration anyway? (y/n)"

If no → stop (skip workflow creation).
If yes → proceed.

**If outdated or missing:** intake is complete — regeneration needed.

## Step 2: Emit Groups

Use the `css-mapping` blueprint for the active CSS framework to derive the `CssGroup[]` array. The blueprint enumerates all candidate groups; emit one `CssGroup` per blueprint row whose `path` exists in `design-tokens.yml` and contains at least one leaf token (a node carrying `$value`). Skip rows whose path is missing or only contains DTCG metadata — no jsonata/css files are generated for skipped groups.
