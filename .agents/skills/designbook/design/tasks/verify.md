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

Re-captures the Storybook screenshot after polish and compares it against the reference to show what improved. Uses `DeboStory` entity for check data.

## Execution

Verify compares existing screenshots (captured by the `recapture` task) — it does NOT restart Storybook or re-capture.

1. **Read both images** side by side:
   - Reference: `designbook/stories/${storyId}/screenshots/reference/${breakpoint}--${region}.png`
   - Current (after polish): `designbook/stories/${storyId}/screenshots/current/${breakpoint}--${region}.png`

2. **Compare visually** and produce a verdict:

   | Aspect | Before Polish | After Polish | Improved? |
   |--------|--------------|-------------|-----------|
   | Layout | ... | ... | yes/no |
   | Colors | ... | ... | yes/no |
   | Typography | ... | ... | yes/no |
   | Spacing | ... | ... | yes/no |

3. **Update check result** via entity — persist the final diff result:
   ```bash
   _debo story check --scene ${scene} --json '{"breakpoint":"<breakpoint>","region":"<region>","status":"pass","diff":1.2,"issues":[]}'
   ```

4. **Report** the final status for this breakpoint/region.

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
