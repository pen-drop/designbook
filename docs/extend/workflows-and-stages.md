# Workflows and stages

A workflow is a Markdown plan of stages. A stage is the filename of a task. Contributions attach to stages through `trigger.steps` and `filter` against config.

## How a contribution enters a run

1. The agent runs `npx storybook-addon-designbook intake <workflow>`.
2. Intake resolves the skills root and plugin sources, then `resolveFiles` for tasks, rules, and blueprints.
3. Files without `trigger`/`filter` are skipped when `requireWhen` is true (rules and many resources). Task files may match unconditionally.
4. `filter: extensions: stitch` requires that extension id. `filter: backend: drupal` requires `backend: drupal`. `filter: frameworks.css: tailwind` requires Tailwind.
5. The matching set becomes the planning catalogue. The agent authors a complete task list, then `plan build` seals it.

`--palette` prints the lean task list (names and `params_schema`) without embedding rule bodies. Use it to see whether a contribution is in or out.

## When to add a workflow

Add a new workflow under `designbook/skills/<name>/` when the work is a new named sequence, not a variant of an existing stage. Existing sequences already cover install, vision, tokens, data-model, sections, shape-section, sample-data, css-generate, extract-reference, design-component, design-screen, design-entity, design-shell, design-verify, sync-verify, import, sync-to, and sb.

Prefer a new task or blueprint on an existing stage when you only need a different WHAT or starting point for Drupal, Vue, Tailwind, or Stitch. Prefer a rule only for a constraint every implementation must keep.

GAIA does not add debo workflows. Its skills are `debo-designbook-design` and `debo-config-sync`, selected by GAIA work type. See [GAIA](/integrations/gaia).

Plan CLI: [plan](/advanced/cli/plan). Execution modes (`ephemeral`, `persist`, `ask`) are owned by the shared builder in the core skill, not by project config.
