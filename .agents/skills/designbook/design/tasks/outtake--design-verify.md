---
name: designbook:design:outtake--design-verify
title: "Outtake: Design Verify"
when:
  steps: [design-verify:outtake]
priority: 50
params:
  scene: { type: string }
  storyId: { type: string }
---

# Outtake — Design Verify

Summarizes all check results and determines whether the workflow is complete or needs another run.

## Execution

1. **Read workflow task statuses** to determine which polish tasks were completed and which issues remain open.

   Use the workflow engine's task list — each polish task corresponds to one issue. A completed task means the issue is resolved.

2. **Build result table** from the polish task statuses:

   | ID | Severity | Description | Result |
   |----|----------|-------------|--------|
   | issue-001 | critical | Hero Heading: fontSize 14px → 48px, ... | done |
   | issue-002 | major | Navigation: gap 8px → 16px, ... | done |
   | issue-003 | major | Footer Copyright: color ... | open |

3. **Verdict:**
   - **All issues resolved** → "All issues fixed. Workflow complete."
   - **Open/failed issues remain** → List them and output: "Re-run `/debo design-verify` to continue polishing. Reference screenshots and passing checks will be preserved."

## Output

```
## Design Verify — Summary

**Scene:** {scene}
**Result:** {resolved}/{total} issues resolved

### Issues

| ID | Severity | Description | Result |
|----|----------|-------------|--------|
| ... | ... | ... | ... |

{verdict}
```
