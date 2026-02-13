---
name: /debo-css-generate
id: debo-css-generate
category: Designbook
description: Generate CSS token files from design tokens. Automatically selects the correct skill based on DESIGNBOOK_CSS_FRAMEWORK.
---

# Generate CSS

This workflow generates CSS token files from W3C Design Tokens. It loads the configuration and delegates to the `designbook-css-generate` skill, which handles the full pipeline including framework-specific delegation.

## Step 1: Load Configuration

```bash
source .agent/skills/designbook-configuration/scripts/set-env.sh
```

Read `DESIGNBOOK_CSS_FRAMEWORK` from the environment.

## Step 2: Execute CSS Generation Skill

Read and execute `.agent/skills/designbook-css-generate/SKILL.md`.

The skill handles:
1. Token file verification
2. Regeneration check (timestamp optimization)
3. Framework-specific delegation (e.g. DaisyUI)
4. JSONata transformation execution
5. CSS import management in `app.src.css`
6. Output verification
