---
name: workflow-add-files
description: Registers produced files with a task using --files. Must be called before validate.
---

# Step: Register Produced Files

After producing output files, register them with the active task so `workflow validate` can find and validate them.

## Command

```bash
node packages/storybook-addon-designbook/dist/cli.js workflow update $WORKFLOW_NAME <task-id> \
  --status in-progress \
  --files <path1> [<path2> ...]
```

## Key Rules

- **Always use `--status in-progress`** when registering files — never `done`
- **Always pass absolute paths** — the CLI converts them to paths relative to `$DESIGNBOOK_DIST` internally
- Each registered file is marked `requires_validation: true` internally
- The workflow must remain `in-progress` so that `validate` can access it

## Example

```bash
node packages/storybook-addon-designbook/dist/cli.js workflow update $WORKFLOW_NAME create-data-model \
  --status in-progress \
  --files $DESIGNBOOK_DIST/data-model.yml
```

Multiple files:
```bash
node packages/storybook-addon-designbook/dist/cli.js workflow update $WORKFLOW_NAME create-component \
  --status in-progress \
  --files \
    $DESIGNBOOK_DRUPAL_THEME/components/card/card.component.yml \
    $DESIGNBOOK_DRUPAL_THEME/components/card/card.default.story.yml \
    $DESIGNBOOK_DIST/view-modes/node.article.teaser.jsonata \
    $DESIGNBOOK_DIST/sections/blog/data.yml
```

## After This Step

Run the validate step (`@designbook-workflow/steps/validate.md`) before marking the task done.

> ⚠️ Do NOT pass `--files` together with `--status done`. Register files first (in-progress), validate, then mark done separately.
