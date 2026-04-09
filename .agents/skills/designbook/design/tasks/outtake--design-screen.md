---
name: designbook:design:outtake--verify-scenes
title: "Outtake: Verify Scenes"
when:
  steps: [design-screen:outtake, design-shell:outtake]
priority: 50
params:
  scene: []
  reference: []
files: []
---

# Outtake — Verify Scenes

Runs `design-verify` for each scene produced by the parent workflow.

## Execution

For each entry in `params.scene`:

1. **Create and run** the design-verify workflow:

   ```bash
   _debo workflow create --workflow design-verify \
     --workflow-file <resolve design-verify.md from skills> \
     --parent $WORKFLOW_NAME \
     --params '{"scene": "<scene.scene>", "reference": <params.reference>}'
   ```

   Since `--params` provides all required params, the child workflow will skip intake and expand tasks immediately.

2. **Execute the child workflow completely** — all stages (intake → capture → compare → triage → polish → outtake) — before proceeding to the next scene.

## Output

```
## Outtake — Verify Scenes

Ran design-verify for {n} scene(s):
- {scene1}: {result}
- {scene2}: {result}
```
