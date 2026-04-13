---
name: designbook:design:outtake--verify-scenes
title: "Outtake: Verify Scenes"
when:
  steps: [design-screen:outtake, design-shell:outtake, design-verify:outtake]
priority: 50
params:
  scene: ~
  reference: []
  storyId: ~
files: []
---

# Outtake — Score & Verify

Displays the visual comparison results from the inline capture/compare stages, then offers to run design-verify.

## Step 1: Read Draft Issues and Compute Score

Read all draft issue JSON files from the compare stage:

```
designbook/stories/${storyId}/issues/draft/${breakpoint}--${region}.json
```

Each file contains an array of issues with `severity` (critical, major, minor).

**Score formula per region:**
```
score = (critical_count × 3) + (major_count × 2) + (minor_count × 1)
```

If no draft files exist (compare was skipped or found no issues), skip to Step 2.

## Step 2: Display Score Table

Display a table with the comparison results:

```
## Visual Comparison — ${scene}

| Breakpoint | Region | Score | Diff |
|------------|--------|-------|------|
| sm         | header |     5 | Background color mismatch (#00336a → #1a1a2e), nav font too large |
| sm         | footer |     0 | — |
| xl         | header |     3 | Logo left spacing too small |
| xl         | footer |     1 | Link color slightly off |

**Total Score: 9** (0 = perfect match)
```

- Score 0 for a region means perfect visual match — show `—` as Diff
- List the key issues from each draft file as a short summary in the Diff column
- Total score is the sum of all region scores

## Step 3: Ask for User Observations

Ask the user:

> "Anything else you noticed?"

Wait for the response. If the user mentions additional issues, acknowledge them.

## Step 4: Offer Design-Verify

Ask the user:

> "Start design-verify?"

- **If yes** → create and run the design-verify workflow:

  ```bash
  _debo workflow create --workflow design-verify \
    --workflow-file <resolve design-verify.md from skills> \
    --parent $WORKFLOW_NAME \
    --params '{"scene": "${scene}", "reference": <params.reference>}'
  ```

  Execute the child workflow completely. Since screenshots already exist from the inline capture, the capture tasks will auto-skip.

- **If no** → archive the workflow normally.

## Output

```
## Outtake — ${scene}

Total Score: {score} (0 = perfect match)
{score table}

User feedback: {feedback or "none"}
Design-verify: {launched / skipped}
```
