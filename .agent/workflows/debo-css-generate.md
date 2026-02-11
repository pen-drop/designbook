---
name: /debo-css-generate
id: debo-css-generate
category: Designbook
description: Generate CSS token files from design tokens. Automatically selects the correct skill based on DESIGNBOOK_CSS_FRAMEWORK.
---

# Generate CSS

This workflow generates CSS token files from W3C Design Tokens. It automatically loads the correct skill based on the configured CSS framework.

## Step 1: Load Configuration

```bash
source .agent/skills/designbook-configuration/scripts/set-env.sh
```

Read `DESIGNBOOK_CSS_FRAMEWORK` from the environment.

## Step 2: Select and Execute Skill

Based on `DESIGNBOOK_CSS_FRAMEWORK`, load the matching skill:

| Framework | Skill |
|-----------|-------|
| `daisyui` | `.agent/skills/designbook-css-daisyui/SKILL.md` |

**If `DESIGNBOOK_CSS_FRAMEWORK` is not set or unknown:**

> "❌ No CSS framework configured. Add `css.framework` to `designbook.config.yml`:
> ```yaml
> css:
>   framework: daisyui
> ```
> Supported frameworks: `daisyui`"

Stop here.

**If matched:** Read and execute the corresponding skill's `SKILL.md`.
