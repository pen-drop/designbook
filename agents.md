# Agents

This project uses a unified agent architecture stored in the `.agent/` directory.

## Directory Structure

```
.agent/             # SINGLE SOURCE OF TRUTH
├── skills/          # Agent capabilities (heavy lifting)
│   ├── designbook-figma-fetch/
│   ├── designbook-figma-drupal-components/
│   └── ...
└── workflows/       # Agent commands (user interface)
    ├── debo-product-vision.md
    ├── debo-figma-fetch.md
    └── ...
```

All agent logic, skills, and workflows are stored in the `.agent` directory. This is the canonical location for all agent-related code.

## Naming Conventions

- **Skills**: All skills are prefixed with `designbook-`.
    - `designbook-figma-*`: Generic Figma skills
    - `designbook-figma-drupal-*`: Drupal-specific Figma integrations
    - `designbook-openspec-*`: OpenSpec related skills
- **Workflows (Commands)**: All workflows are prefixed with `debo-`.
    - These are lightweight wrappers that invoke skills.
    - Exceptions: `opsx-*` workflows (OpenSpec experimental workflows) retain their original names.

## Usage

To use an agent command in Cursor:
1. Open the Command Palette (Cmd+K) or Chat (Cmd+L).
2. Type `@` followed by the command name (e.g., `@debo-product-vision`).
3. The agent will execute the workflow defined in `.agent/workflows/`.

## IDE Integration

For compatibility with Cursor, symbolic links are maintained:
- `.cursor/skills` -> `.agent/skills`
- `.cursor/commands` -> `.agent/workflows`

## Workflow Structure

Workflows in `.agent/workflows/` define the available slash commands. They follow a specific format:

```markdown
---
name: /command-name
description: Description of what the command does
---

# Title

Instructions for the agent...

## Step 1: Execute Skill (Optional)

<skill>
name: designbook-skill-name
</skill>
```

- **Frontmatter**: Defines the slash command (`name`) and description.
- **Content**: The prompt the agent follows.
- **Skills**: Workflows can invoke skills stored in `.agent/skills/` using the `<skill>` tag. This separates high-level direction (workflow) from complex execution logic (skill).

## Component Architecture Rules

When planning, designing, or writing proposals that involve Designbook components:

1. Read `designbook.config.yml` to determine `DESIGNBOOK_TECHNOLOGY` and `DESIGNBOOK_CSS_FRAMEWORK`
2. Read ALL matching skills including their `resources/` directories:
   - `designbook-[DESIGNBOOK_TECHNOLOGY]-*` (e.g. `designbook-drupal-*`)
   - `designbook-css-[DESIGNBOOK_CSS_FRAMEWORK]` (e.g. `designbook-css-daisyui`)
   - `designbook-css-generate`
3. Apply skill rules (naming, layout, variants) in all design documents and proposals

## Path Configuration

**Important:** All folders mentioned inside `designbook` skills and `debo` commands/workflows should be considered relative to the `packages/integrations/test-integration-drupal` folder. This is the designated test environment for designbook commands.
