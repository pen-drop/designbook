
## Context
The project currently has agent capabilities scattered across `.agent` and `.cursor` directories. Skills and commands lack a consistent naming convention, making discovery and maintenance difficult. The goal is to unify these into a single `agents/` directory with a strict naming convention.

## Goals / Non-Goals

**Goals:**
- Consolidate all skills and commands into `agents/skills` and `agents/workflows`.
- Rename all skills to start with `designbook-`.
- Rename all commands to start with `debo-`.
- Ensure commands are lightweight wrappers around skills.
- Maintain backward compatibility for IDEs via symlinks in `.cursor`.

**Non-Goals:**
- Rewriting the internal logic of skills (except for necessary path/name updates).
- Changing the core behavior of the `openspec` framework itself, beyond file organization.

## Decisions

- **Centralized Directory**: Create a top-level `agents/` directory to house `skills/` and `workflows/`. This makes the agent capabilities visible and first-class citizens in the project structure.
- **Naming Convention - Skills**:
    - Prefix: `designbook-`
    - Figma skills: `designbook-figma-*`
    - Integration skills: `designbook-figma-drupal-*`
    - Migration: `pendrop-*` skills will be renamed as follows:
        - `pendrop-components` -> `designbook-figma-drupal-components` (Legacy Drupal SDC generation)
        - `pendrop-stories` -> `designbook-figma-drupal-stories`
        - `pendrop-twig-from-story` -> `designbook-figma-drupal-twig`
        - `pendrop-css` -> `designbook-figma-drupal-css`
        - `pendrop-figma-fetch` -> `designbook-figma-fetch` (Generic Figma)
        - `pendrop-orchestrator` -> `designbook-figma-orchestrator`
        - `pendrop-tokens` -> `designbook-figma-tokens`
    - **Exception**: `openspec-*` skills will be moved to `agents/skills/` but **NOT** renamed (per user request).
- **Naming Convention - Workflows (Commands)**:
    - Format: `debo-*.md`
    - Location: `agents/workflows/`
    - Example: `product-vision.md` -> `debo-product-vision.md`.
    - **Requirement**: Create new `debo-*` workflows for ALL renamed `pendrop-*` skills to ensure they are accessible via commands.
    - **Exception**: `opsx-*.md` commands will be moved to `agents/workflows/` but **NOT** renamed.
- **Symlinking Strategy**:
    - Delete existing `.cursor/skills` and `.cursor/commands` directories.
    - Create symlink `.cursor/skills` -> `agents/skills`.
    - Create symlink `.cursor/commands` -> `agents/workflows`.
    - This ensures Cursor IDE continues to find the tools (as "commands") without manual reconfiguration.

## Risks / Trade-offs

- **Risk**: Breaking existing workflows that rely on specific path Hardcoding.
    - *Mitigation*: Grep for old paths and update them.
- **Risk**: `openspec` CLI might rely on specific folder structures or names.
    - *Mitigation*: Test `openspec` workflows after migration.

## Migration Plan

1.  **Preparation**: Create `agents/` directory structure.
2.  **Move & Rename Skills**:
    -   Move `.agent/skills/*` and `.cursor/skills/*` to `agents/skills/`.
    -   Rename directories according to the convention.
3.  **Move & Rename Commands**:
    -   Move `.cursor/commands/*.md` to `agents/commands/`.
    -   Rename files to `debo-*.md`.
    -   Update command content to reference new skill names.
4.  **Symlinks**: Recreate `.cursor/skills` and `.cursor/commands` as symlinks.
5.  **Documentation**: Update `agents.md` to reflect the new structure.
