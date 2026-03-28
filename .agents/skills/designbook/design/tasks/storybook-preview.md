---
params: {}
files: []
---

# Storybook Preview

Starts Storybook so the user can visually review the workflow output before merging.

## Execution

Run the prepare-environment command:

```bash
_debo workflow prepare-environment --workflow $WORKFLOW_NAME --task <this-task-id>
```

This will:
1. Start Storybook on a free port
2. Monitor startup logs for build errors
3. Take screenshots of declared scenes
4. Store the preview PID and port in tasks.yml

## After

Show the user the preview URL and ask them to review the result in Storybook before proceeding to merge.
