---
params:
  scene: ~
files: []
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
  - path: $DESIGNBOOK_DATA/design-system/guidelines.yml
    optional: true
---

# Polish

Iterative fix loop: reads the visual-compare report, fixes issues, re-screenshots, and re-compares until resolved or max iterations reached.

## Step 1: Read Visual Compare Report

Read the visual-compare report from the previous step. If no issues were found, complete immediately:

> "No visual issues found — skipping polish."

## Step 2: Fix Loop (max 3 iterations)

**Important**: Remote reference screenshots (stitch, image, figma, url) are fetched ONCE before the loop starts. They do not change between iterations. Only local Storybook screenshots are re-taken each iteration.

Only re-screenshot breakpoints that have reference entries in the scene's `reference` array.

For each iteration:

### 2a. Analyze Issues

Prioritize by severity: Critical → Major → Minor. Focus on the highest-severity issues first.

### 2b. Fix Code

Edit the component files, scene definitions, or CSS to address the issues. Keep changes minimal and focused on the reported issues.

### 2c. Re-screenshot (Storybook only)

Resolve the Storybook URL and re-capture screenshots only at breakpoints that have reference entries:

```bash
_debo resolve-url --scene ${scene}
npx playwright screenshot --full-page --viewport-size "${width},1600" --wait-for-timeout 3000 "${url}" "designbook/screenshots/${storyId}/storybook/${breakpoint}.png"
```

Do NOT re-fetch remote reference screenshots — they were resolved once before the loop.

### 2d. Re-compare

Read the new Storybook screenshots alongside the (unchanged) reference images. Use the `threshold` from each reference entry (default 3%) for PASS/FAIL determination.

### 2e. Check Resolution

- If all issues are resolved → exit loop, report success.
- If issues remain and iterations < max → continue to next iteration.
- If max iterations reached → exit loop, report what was fixed and what remains.

## Output

Report the polish results:

```
## Polish Report

**Iterations:** 2/3
**Status:** All issues resolved ✓

### Iteration 1
- Fixed: Layout alignment on sm breakpoint (Critical)
- Fixed: Font size mismatch on xl breakpoint (Major)

### Iteration 2
- Fixed: Spacing inconsistency in footer (Minor)
```

Or if issues remain:

```
## Polish Report

**Iterations:** 3/3 (max reached)
**Status:** 1 issue remaining

### Resolved
- Layout alignment (Critical)
- Font size mismatch (Major)

### Remaining
- Subtle color difference in hover state (Minor) — within acceptable tolerance
```
