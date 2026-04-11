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

4. **List all issues with status:**
   ```bash
   _debo story issues --scene ${scene}
   ```

   Show each issue with its ID, severity, description, and result (pass/fail/open):

   | ID | Severity | Description | Result |
   |----|----------|-------------|--------|
   | issue-001 | critical | Hero Heading: fontSize 14px → 48px, ... | pass |
   | issue-002 | major | Navigation: gap 8px → 16px, ... | pass |
   | issue-003 | major | Footer Copyright: color ... | fail |

5. **Verdict:**
   - **All issues resolved** → "All issues fixed. Workflow complete."
   - **Open/failed issues remain** → List them and output: "Re-run `/debo design-verify` to continue polishing. Reference screenshots and passing checks will be preserved."

## Output

```
## Design Verify — Summary

**Scene:** {scene}
**Result:** {pass}/{total} checks passed

| Breakpoint | Region | Status | Details |
|-----------|--------|--------|---------|
| ... | ... | ... | ... |

### Issues

| ID | Severity | Description | Result |
|----|----------|-------------|--------|
| ... | ... | ... | ... |

{verdict}
```
