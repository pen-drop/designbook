---
name: designbook:design:verify
title: "Verify: {scene} ({breakpoint}/{region})"
when:
  steps: [verify]
priority: 60
params:
  scene_id: { type: string }
  story_id: { type: string }
  breakpoint: { type: string }
  region: { type: string }
  reference_folder: { type: string }
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
---

# Verify

Re-evaluates after polish + recapture. Determines if issues are resolved and writes final results via CLI.

## Execution

Verify compares existing screenshots (captured by the `recapture` task) — it does NOT restart Storybook or re-capture.

1. **Read issues** for this check:
   ```bash
   _debo story issues --scene ${scene} --check ${breakpoint}--${region}
   ```

2. **Re-compare** based on issue source:

   **For screenshot issues** — read both images side by side:
   - Reference: `${reference_folder}/${breakpoint}--${region}.png`
   - Storybook (after polish): `designbook/stories/${storyId}/screenshots/${breakpoint}--${region}.png`

   Compare visually and determine if the issue is resolved.

   **For extraction issues** — if extraction files exist, re-diff the specific properties mentioned in the issue. Otherwise evaluate visually from screenshots.

3. **Update each issue** with the result:
   ```bash
   _debo story issues --scene ${scene} --check ${breakpoint}--${region} --update <index> --json '{"status":"done","result":"pass"}'
   ```
   Or if still present:
   ```bash
   _debo story issues --scene ${scene} --check ${breakpoint}--${region} --update <index> --json '{"status":"done","result":"fail"}'
   ```

4. **Close the check** with overall verdict:
   ```bash
   _debo story check --scene ${scene} --json '{"breakpoint":"${breakpoint}","region":"${region}","status":"done","result":"pass|fail"}'
   ```
   - `result: "pass"` if ALL issues have `result: "pass"`
   - `result: "fail"` if ANY issue has `result: "fail"`

## Output

```
## Verify: {scene} ({breakpoint}/{region})

**Result:** PASS

| Issue | Before | After | Result |
|-------|--------|-------|--------|
| Hero Heading fontSize (3rem) | 2.5rem | 3rem | PASS |
| Header diff (threshold 3%) | 4.2% | 1.8% | PASS |
```

If all issues pass, the check is verified. If any fail, report remaining issues for manual review.
