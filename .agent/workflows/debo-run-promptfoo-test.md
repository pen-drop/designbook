---
name: /debo-run-promptfoo-test
id: debo-run-promptfoo-test
category: Designbook
description: Run promptfoo workflow tests and write a structured evaluation report with lessons learned
---

Run the Designbook promptfoo evaluation suite, analyze the results, and produce a structured report with lessons learned, errors, and improvement suggestions for skills and workflows.

> **Spec Mode (`--spec`):** If the user passes `--spec`, do NOT run tests. Instead, output a YAML plan listing which tests would run, which providers, and estimated duration.

**Steps**

## Step 1: Clean Previous Workspaces

```bash
bash promptfoo/scripts/clean.sh
```

## Step 2: Run Promptfoo Eval

Run tests. The user may specify a `--filter` to run only specific tests.

**Full suite:**
```bash
npx promptfoo eval -c promptfoo/promptfooconfig.yaml --max-concurrency 1 --output promptfoo/reports/latest.json
```

**Single workflow (if `--filter <pattern>` is provided):**
```bash
npx promptfoo eval -c promptfoo/promptfooconfig.yaml --filter-pattern "<pattern>" --max-concurrency 1 --output promptfoo/reports/latest.json
```

Wait for the eval to complete. This can take 5–30 minutes depending on scope.

After eval finishes, log the **workspace path** that was created:
```bash
ls -d promptfoo/workspaces/*/designbook 2>/dev/null || echo "No workspace created"
```
Include this path in the report.

## Step 3: Collect Results

Read `promptfoo/reports/latest.json` and extract per-test results:
- Test description
- Provider
- Pass/fail status
- Score
- Assertion details (which rubrics passed/failed and why)
- Error messages (if any)

Also extract **token usage** from the eval output or JSON:
- Total tokens
- Eval tokens (prompt + completion)
- Grading tokens (prompt + completion)
- Duration

## Step 4: Analyze and Classify

Classify each failure into one of these categories:

| Category | Description |
|----------|-------------|
| `assertion-too-strict` | Rubric expected something the agent couldn't reasonably produce |
| `agent-wrong-output` | Agent produced incorrect files, formats, or paths |
| `agent-missing-output` | Agent skipped required steps or outputs |
| `connectivity` | Network/API timeouts or fetch failures |
| `skill-gap` | Skill instructions are ambiguous or incomplete |
| `workflow-gap` | Workflow instructions are ambiguous or incomplete |
| `fixture-issue` | Test fixture is missing data or has wrong structure |

## Step 5: Deep Error Analysis

For **each failed test**, perform a thorough root-cause investigation:

### 5.1 — Read Source Files

For the failed test, read all relevant source files:

1. **The prompt** — the exact text from `promptfooconfig.yaml` that was sent
2. **The rubric** — the assertion `value` from `promptfooconfig.yaml`
3. **The workflow** — the `.agent/workflows/debo-*.md` file that was invoked
4. **The skill** — the `.agent/skills/*/SKILL.md` that the workflow delegates to
5. **The fixture** — the `promptfoo/fixtures/debo-*/` files used as input

### 5.2 — Trace the Failure

For each failure, answer these questions:

- **What did the rubric expect?** (exact text)
- **What did the agent actually output?** (from the JSON results)
- **Where is the mismatch?** (path convention? missing content? wrong format?)
- **Is the rubric wrong or is the agent wrong?** Determine who needs to change.
- **If the agent is wrong:** What in the workflow/skill caused the wrong behavior? Is the instruction ambiguous? Is a path missing?
- **If the rubric is wrong:** What should the rubric check instead? Write the corrected rubric text.

### 5.3 — Write Fix Proposal

For each failure, write a concrete fix proposal with:

```markdown
### [Test Name] — Fix Proposal

**Category:** [classification]
**Blame:** rubric | prompt | workflow | skill | fixture

**What went wrong:**
[1-2 sentences explaining the root cause]

**Proposed fix:**
- **File:** [exact file path to change]
- **Change:** [what to add/modify/remove]
- **New content:** [the exact replacement text, if applicable]

**Confidence:** high | medium | low
**Side effects:** [any risks from this change]
```

Save all fix proposals to `promptfoo/reports/fix-proposals.md`.

## Step 6: Write Report

Write the report to `promptfoo/reports/eval-report.md` with this structure:

```markdown
# Promptfoo Evaluation Report

**Date:** YYYY-MM-DD HH:MM
**Tests:** N total, N passed, N failed
**Provider:** gemini-3-pro
**Duration:** ~Xm
**Total Tokens:** N (Nk eval, Nk grading)
**Workspace:** [path to workspace created during eval, or "none"]

## Summary

| Test | Status | Score | Category |
|------|--------|-------|----------|
| debo-product-vision | ✅ pass | 1.0 | — |
| debo-design-tokens | ❌ fail | 0.3 | assertion-too-strict |
| ... | ... | ... | ... |

## Failures

### debo-design-tokens (assertion-too-strict)
**Rubric said:** ...
**Agent output:** ...
**Root cause:** ...
**Fix:** → see fix-proposals.md

## Lessons Learned

- Pattern: [observation about agent behavior]
- Pattern: [observation about test design]

## Suggested Improvements

### Skills
- `designbook-screen` SKILL.md: [specific suggestion]

### Workflows
- `debo-design-tokens.md`: [specific suggestion]

### Assertions
- Test "debo-design-tokens": [rubric adjustment]

### Workflow/Skill Shortening
- [Identify sections that are overly long and suggest condensing]
```

## Step 7: Update Error Log

Append new failure patterns to `promptfoo/reports/error-log.md` (create if missing). Use this format per entry:

```markdown
## [Date] — [Test Name]

**Category:** assertion-too-strict
**Provider:** gemini-3-pro
**Error:** [brief description]
**Resolution:** [what was done or needs to be done]
```

## Step 8: Report to User

Show:
- Pass/fail summary (table)
- Token usage (total, eval, grading)
- Workspace path created
- Number of new failure patterns found
- Fix proposals summary (1 line per failure)
- Top 3 most impactful improvements
- Links to: `eval-report.md`, `fix-proposals.md`, `error-log.md`
