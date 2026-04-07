---
name: designbook:design:polish
when:
  steps: [polish]
priority: 50
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

Iterative fix loop: reads the compare reports, fixes issues, re-captures Storybook screenshots, and re-compares until resolved or max iterations reached.

## Params

| Param | Source | Description |
|---|---|---|
| `storyId` | workflow context | Story identifier |
| `compareResults` | compare step output | Per-breakpoint results from compare-screenshots and compare-markup |

## Step 1: Read Compare Reports

Read the compare-screenshots and compare-markup (if available) reports from the previous step. If no issues were found, complete immediately:

> "No visual issues found — skipping polish."

## Change Scope

| In scope | Out of scope |
|----------|-------------|
| Component templates (resolved via framework blueprint) | `design-tokens.yml` (requires tokens workflow) |
| Scene definitions (`*.scenes.yml`) | Workflow configuration |
| Story files (`*.story.yml`) | Component schema structure |
| CSS framework output files (resolved via CSS blueprint) | |

When CSS output values are changed to match the reference, the polish report MUST include a reconciliation note: "CSS output values adjusted — reconcile with `design-tokens.yml` via tokens workflow."

## Step 2: Fix Loop (max 3 iterations)

**Important**: Reference screenshots do not change between iterations. Only Storybook screenshots are re-captured.

For each iteration:

### 2a. Analyze Issues

Prioritize by severity: Critical → Major → Minor. Focus on the highest-severity issues first.

### 2b. Rule Compliance Check

Before applying any fix, verify it does not contradict any loaded rules for the current stage. Re-read active rules and check the proposed change against each constraint.

### 2c. Fix Code

Edit the component files, scene definitions, or CSS to address the issues. Keep changes minimal and focused on the reported issues.

### 2d. Re-capture Storybook Screenshots

Resolve the Storybook URL and re-capture at all breakpoints from `meta.yml`:

```bash
_debo story --scene ${scene}
mkdir -p "designbook/stories/${storyId}/screenshots/current"
npx playwright screenshot --full-page --viewport-size "${viewportWidth},1600" --wait-for-timeout 3000 "${url}" "designbook/stories/${storyId}/screenshots/current/${breakpoint}.png"
```

### 2e. Re-compare

Read the new Storybook screenshots alongside the (unchanged) reference images. Use the `threshold` from `meta.yml` for PASS/FAIL determination. Update `meta.yml` with new `lastDiff` and `lastResult`.

### 2f. Check Resolution

- If all issues are resolved → exit loop, report success.
- If issues remain and iterations < max → continue to next iteration.
- If max iterations reached → exit loop, report what was fixed and what remains.

## Output

Report the polish results:

```
## Polish Report

**Iterations:** 2/3
**Status:** All issues resolved

### Iteration 1
- Fixed: Layout alignment on sm breakpoint (Critical)
- Fixed: Font size mismatch on xl breakpoint (Major)

### Iteration 2
- Fixed: Spacing inconsistency in footer (Minor)
```
