---
name: designbook:design:outtake--design-verify
title: "Outtake: Design Verify"
when:
  steps: [design-verify:outtake]
priority: 50
params:
  scene: ~
files: []
---

# Outtake — Design Verify

Summarizes all check results and determines whether the workflow is complete or needs another run.

## Execution

1. **Load story entity** with current results:
   ```bash
   _debo story --scene ${scene}
   ```

2. **Read summary** from the response — `summary.total`, `summary.pass`, `summary.fail`, `summary.unchecked`.

3. **Build result table** from `checks` array:

   | Breakpoint | Region | Status | Diff | Issues |
   |-----------|--------|--------|------|--------|
   | sm | header | PASS | 1.2% | — |
   | sm | markup | FAIL | — | missing logo |
   | xl | footer | FAIL | 4.8% | color mismatch |

4. **Verdict:**
   - **All pass** → "All checks passed. Workflow complete."
   - **Failures remain** → List remaining issues and output: "Re-run `/debo design-verify` to continue polishing. Reference screenshots and passing checks will be preserved."

## Output

```
## Design Verify — Summary

**Scene:** {scene}
**Result:** {pass}/{total} checks passed

| Breakpoint | Region | Status | Details |
|-----------|--------|--------|---------|
| ... | ... | ... | ... |

{verdict}
```
