
## 1. Directory Setup

- [x] 1.1 Create `.agent/` directory in project root
- [x] 1.2 Create `.agent/skills/` directory
- [x] 1.3 Create `.agent/workflows/` directory

## 2. Migrate and Rename Skills

- [x] 2.1 Move `designbook-components` and `design-os-migration` from `.agent/skills/` to `.agent/skills/`
    - [x] Rename `design-os-migration` to `designbook-design-os-migration`
- [x] 2.2 Move `openspec-*` skills from `.agent/skills/` to `.agent/skills/`
    - [x] **Do NOT rename** `openspec-*` (keep original names)
- [x] 2.3 Move `pendrop-*` skills from `.cursor/skills/` to `.agent/skills/`
    - [x] Rename `pendrop-components` to `designbook-figma-drupal-components`
    - [x] Rename `pendrop-stories` to `designbook-figma-drupal-stories`
    - [x] Rename `pendrop-twig-from-story` to `designbook-figma-drupal-twig`
    - [x] Rename `pendrop-css` to `designbook-figma-drupal-css`
    - [x] Rename `pendrop-figma-fetch` to `designbook-figma-fetch`
    - [x] Rename `pendrop-orchestrator` to `designbook-figma-orchestrator`
    - [x] Rename `pendrop-tokens` to `designbook-figma-tokens`
- [x] 2.4 Verify all skills are in `.agent/skills/` and follow `designbook-*` naming

## 3. Migrate and Rename Workflows (Commands)

- [x] 3.1 Move commands from `.cursor/commands/` to `.agent/workflows/`
- [x] 3.2 Rename commands to start with `debo-`
    - [x] `data-model.md` -> `debo-data-model.md`
    - [x] `product-vision.md` -> `debo-product-vision.md`
    - [x] `design-screen.md` -> `debo-design-screen.md`
    - [x] `design-shell.md` -> `debo-design-shell.md`
    - [x] `design-tokens.md` -> `debo-design-tokens.md`
    - [x] `export-product.md` -> `debo-export-product.md`
    - [x] **Do NOT rename** `opsx-*.md` (move as is)
    - [x] Check other files and rename appropriate ones

## 4. Refactor and Create Workflows

- [x] 4.1 Update existing `debo-*.md` files to reference the new skill names (e.g., `pendrop-figma-fetch` -> `designbook-figma-fetch`)
- [x] 4.2 Create new `debo-` workflows for all renamed Pendrop skills:
    - [x] `debo-figma-drupal-components.md` (calls `designbook-figma-drupal-components`)
    - [x] `debo-figma-drupal-stories.md` (calls `designbook-figma-drupal-stories`)
    - [x] `debo-figma-drupal-twig.md` (calls `designbook-figma-drupal-twig`)
    - [x] `debo-figma-drupal-css.md` (calls `designbook-figma-drupal-css`)
    - [x] `debo-figma-fetch.md` (calls `designbook-figma-fetch`)
    - [x] `debo-figma-orchestrator.md` (calls `designbook-figma-orchestrator`)
    - [x] `debo-figma-tokens.md` (calls `designbook-figma-tokens`)
- [x] 4.3 Ensure workflows only call skills and don't contain inline logic if possible (or mark for future refactoring)

## 5. IDE Compatibility (Symlinks)

- [x] 5.1 Remove `.cursor/skills` directory
- [x] 5.2 Remove `.cursor/commands` directory
- [x] 5.3 Create symlink `.cursor/skills` -> `.agent/skills`
- [x] 5.4 Create symlink `.cursor/commands` -> `.agent/workflows`

## 6. Documentation & Cleanup

- [x] 6.1 Update `agents.md` to reflect new directory structure and naming conventions
- [x] 6.2 Remove empty `.agent` directory if no longer needed (check for `workflows`)
