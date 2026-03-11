---
name: /debo-css-generate
id: debo-css-generate
category: Designbook
description: Generate CSS token files from design tokens. Automatically selects the correct skill based on DESIGNBOOK_FRAMEWORK_CSS.
---

> **Spec Mode (`--spec`):** If the user passes `--spec`, do NOT create or modify any files. Instead, output a structured YAML plan showing what WOULD be created — file paths and content summaries. This enables testing without side effects.
# Generate CSS

This workflow generates CSS token files from W3C Design Tokens. It loads the configuration and delegates to the `designbook-css-generate` skill, which handles the full pipeline including framework-specific delegation.

## Step 1: Load Configuration

```bash
eval "$(node packages/storybook-addon-designbook/dist/cli.js config)"
```

Read `DESIGNBOOK_FRAMEWORK_CSS` from the environment.

## Step 2: Execute CSS Generation Skill

Read and execute `.agent/skills/designbook-css-generate/SKILL.md`.

The skill handles:
1. Token file verification
2. Regeneration check (timestamp optimization)
3. Framework-specific delegation (e.g. DaisyUI)
4. JSONata transformation execution
5. CSS import management in `app.src.css`
6. Output verification
