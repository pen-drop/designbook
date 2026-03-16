## Context

Currently:
- `src/pages/spec.shell.scenes.yml` → built-in page rendering `DeboShellPage`
- `src/pages/design-system.scenes.yml` → built-in page rendering `DeboDesignSystemPage` (tokens only)
- Workflow generates `designbook/shell/spec.shell.scenes.yml` with layout scenes (header, content, footer, sidebar slots)
- Section scenes inherit layout via `layout: "shell"` which resolves to `shell/spec.shell.scenes.yml`

Target:
- No `spec.shell.scenes.yml` anywhere
- Workflow generates `designbook/design-system/design-system.scenes.yml` with the same layout scene format
- `DeboDesignSystemPage` shows both tokens and shell/layout scenes
- Section scenes inherit layout from the new file

## Goals / Non-Goals

**Goals:**

- Eliminate `spec.shell.scenes.yml` (both built-in page and user-generated)
- Remove `designbook/shell/` directory convention
- Workflow generates `design-system.scenes.yml` in `designbook/design-system/` with layout scenes
- `DeboDesignSystemPage` loads and displays the generated scenes file
- Layout inheritance resolves from the new path
- Update all references

**Non-Goals:**

- Changing the scene file format (YAML structure with scenes/layout/slots stays identical)
- Changing how the scene renderer processes layout scenes
- Changing the design tokens file location (`design-system/design-tokens.yml` stays)

## Decisions

### 1. Generated file lives alongside tokens in `designbook/design-system/`

The `designbook/design-system/` directory already holds `design-tokens.yml`. Adding `design-system.scenes.yml` here keeps design-system artifacts together. The `designbook/shell/` directory is eliminated.

**Alternative**: Keep `shell/` directory but rename the file. Rejected — the whole point is that shell is part of design-system.

### 2. DeboDesignSystemPage loads the generated scenes file

Extend `DeboDesignSystemPage` with a second `DeboSection` that loads `design-system/design-system.scenes.yml` and renders description + scene grid (same logic currently in `DeboShellPage`). Delete `DeboShellPage`.

### 3. Layout inheritance: `layout: "design-system:shell"`

The layout reference syntax is `source:scene-name` — same convention as component references. The scene inside `design-system.scenes.yml` is named `shell`. So section scenes use:

```yaml
layout: "design-system:shell"
```

This resolves to `design-system/*.scenes.yml` → scene named "shell". The `layout: "shell"` shorthand is removed (no backward compat — early-stage tooling).

### 4. Status endpoint uses new path

The `/designbook-status` endpoint in `vite-plugin.ts` updates shell detection from `shell/spec.shell.scenes.yml` to `design-system/design-system.scenes.yml`.

## Risks / Trade-offs

- **[Breaking change for existing user projects]** → Users must re-run `/debo-design-shell`. Low impact since this is early-stage tooling.
- **[Section scenes with `layout: "shell"` break]** → Mitigated by supporting deprecated alias, or regenerating section scenes.
