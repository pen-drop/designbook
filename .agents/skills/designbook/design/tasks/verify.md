---
name: designbook:design:verify
title: "Verify: {scene} ({breakpoint}/{region})"
when:
  steps: [verify]
priority: 60
params:
  scene: ~
  storyId: ~
  breakpoint: ~
  region: ~
files: []
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
  - path: $DESIGNBOOK_DATA/design-system/guidelines.yml
    optional: true
---

# Verify

Re-captures the Storybook screenshot after polish and compares it against the reference to show what improved.

## Execution

1. **Resolve viewport width** from `design-tokens.yml` for this breakpoint.

2. **Re-capture Storybook screenshot** — overwrite the current screenshot:

   Resolve the Storybook URL:
   ```bash
   _debo story --scene ${scene}
   ```

   Read the **selector** from `meta.yml` regions and **capture** using the method from the `playwright-capture` rule (full-page CLI or element Node API depending on region type).

3. **Read both images** side by side:
   - Reference: `designbook/stories/${storyId}/screenshots/reference/${breakpoint}--${region}.png`
   - Current (after polish): `designbook/stories/${storyId}/screenshots/current/${breakpoint}--${region}.png`

4. **Compare visually** and produce a verdict:

   | Aspect | Before Polish | After Polish | Improved? |
   |--------|--------------|-------------|-----------|
   | Layout | ... | ... | yes/no |
   | Colors | ... | ... | yes/no |
   | Typography | ... | ... | yes/no |
   | Spacing | ... | ... | yes/no |

5. **Update `meta.yml`** with final diff result:
   ```yaml
   lastDiff: <estimated percentage>
   lastResult: pass/fail
   ```

6. **Report** the final status for this breakpoint/region.

## Output

```
## Verify: {scene} ({breakpoint}/{region})

**Result:** PASS (1.2% diff, threshold 3%)

| Aspect | Before | After | Status |
|--------|--------|-------|--------|
| Header layout | Misaligned logo | Fixed | PASS |
| Footer links | Wrong order | Fixed | PASS |
```

If all regions pass, the scene is verified. If any fail, report remaining issues for manual review.
