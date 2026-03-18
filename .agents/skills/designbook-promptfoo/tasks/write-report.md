---
reads:
  - path: promptfoo/reports/latest.json
files:
  - promptfoo/reports/eval-report.md
  - promptfoo/reports/fix-proposals.md
  - promptfoo/reports/error-log.md
---

## Collect Results

Read `promptfoo/reports/latest.json`. Extract per-test: description, provider, pass/fail, score, assertion details, errors. Also extract token usage: total, eval, grading, duration.

## Analyze and Classify Failures

Classify each failure:

| Category | Description |
|----------|-------------|
| `assertion-too-strict` | Rubric expected something the agent couldn't reasonably produce |
| `agent-wrong-output` | Agent produced incorrect files, formats, or paths |
| `agent-missing-output` | Agent skipped required steps or outputs |
| `connectivity` | Network/API timeouts or fetch failures |
| `skill-gap` | Skill instructions are ambiguous or incomplete |
| `workflow-gap` | Workflow instructions are ambiguous or incomplete |
| `fixture-issue` | Test fixture is missing data or has wrong structure |

## Deep Error Analysis

For each failed test, read: the prompt from `promptfooconfig.yaml`, the rubric assertion, the workflow `.agents/workflows/debo-*.md`, the relevant skill `SKILL.md`, and the fixture files. Trace root cause and write a fix proposal.

Save fix proposals to `promptfoo/reports/fix-proposals.md`:

```markdown
### [Test Name] — Fix Proposal
**Category:** [classification]
**Blame:** rubric | prompt | workflow | skill | fixture
**What went wrong:** [1-2 sentences]
**Proposed fix:**
- **File:** [path]
- **Change:** [what to change]
**Confidence:** high | medium | low
```

## Write Report

Write `promptfoo/reports/eval-report.md`:

```markdown
# Promptfoo Evaluation Report
**Date:** YYYY-MM-DD HH:MM
**Tests:** N total, N passed, N failed
**Provider:** [provider]
**Duration:** ~Xm
**Total Tokens:** N
**Workspace:** [path or "none"]

## Summary
| Test | Status | Score | Category |
...

## Failures
...

## Lessons Learned
...

## Suggested Improvements
### Skills / Workflows / Assertions
...
```

## Update Error Log

Append new patterns to `promptfoo/reports/error-log.md`:

```markdown
## [Date] — [Test Name]
**Category:** [category]
**Error:** [description]
**Resolution:** [what was done or needs to be done]
```

## Report to User

Show: pass/fail table, token usage, workspace path, fix proposals summary (1 line each), top 3 improvements, links to reports.
