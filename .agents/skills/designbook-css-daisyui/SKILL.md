---
name: designbook-css-daisyui
description: DaisyUI framework rules — Tailwind-only styling, token naming conventions, and CSS token generation from W3C Design Tokens. Use when DESIGNBOOK_FRAMEWORK_CSS is daisyui.
---

# Designbook CSS DaisyUI

DaisyUI-specific rules for styling, token naming, and CSS token generation.

## DaisyUI Reference

The complete DaisyUI 5 documentation for components, colors, themes, and config is bundled with this skill:

- **Local**: `./resources/daisyui-llms.txt`
- **Upstream**: [daisyui.com/llms.txt](https://daisyui.com/llms.txt)

Read this file when you need to understand DaisyUI class names, theme format (`@plugin "daisyui/theme"`), color naming conventions, or component syntax.

## Task Files

- [generate-jsonata.md](tasks/generate-jsonata.md) — Generate DaisyUI + Tailwind `.jsonata` expression files
- [create-tokens.md](tasks/create-tokens.md) — Generate `design-tokens.yml` with DaisyUI semantic color names

## Rules

- [daisyui-naming.md](rules/daisyui-naming.md) — DaisyUI token naming conventions (loaded during `create-tokens` and token dialog stages)
- [daisyui-styling.md](rules/daisyui-styling.md) — Tailwind-only styling constraints (loaded during `create-component` stage)
