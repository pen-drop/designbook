---
name: designbook-addon-skills
user-invocable: false
description: Storybook addon TypeScript development. Load when modifying packages/storybook-addon-designbook/.
---

# Designbook Addon Skills

This skill covers development of the `storybook-addon-designbook` TypeScript package — the CLI, Storybook panels, and the workflow execution engine.

**Scope:** TypeScript source in `packages/storybook-addon-designbook/` only. For skill authoring conventions (tasks, rules, blueprints), load `designbook-skill-creator` instead.

## Package Structure

```
packages/storybook-addon-designbook/
├── src/
│   ├── cli/          # CLI entry point and commands
│   ├── manager/      # Storybook manager-side panels (inline styles only, no Tailwind/DaisyUI)
│   ├── preview/      # Storybook preview-side decorators
│   └── workflow/     # Workflow execution engine
├── dist/             # Build output (gitignored)
└── package.json
```

## Manager Components

Manager-side components (files under `src/manager/`) MUST use inline styles or Storybook public API components. Do not use Tailwind, DaisyUI, or any external CSS framework in manager code.

## Code Quality

```bash
pnpm --filter storybook-addon-designbook lint:fix   # auto-fix formatting
pnpm check                                          # typecheck + lint + test
```

## Resources

- [skill-authoring.md](resources/skill-authoring.md) — SKILL.md template, schema validation (ajv), JSONata transforms, @-references, config vars
