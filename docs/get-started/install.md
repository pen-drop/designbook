# Install the skills

Put Designbook skills where your AI agent can load them. Installing skills is separate from [initializing a project](/get-started/first-project).

**You need:** Claude Code, or any agent that can install from the skills CLI. A git checkout of your application project.

1. Install the core plugin, then the integrations you actually use.

**AI prompt**

```text
Install Designbook skills for this agent. Use the pen-drop/designbook marketplace.
Install designbook (core, skill name debo). Add designbook-drupal, designbook-css-tailwind,
or designbook-stitch only if this project needs them. Do not invent a Figma marketplace plugin.
```

**Claude Code marketplace**

```bash
/plugin marketplace add pen-drop/designbook
/plugin install designbook@designbook
/plugin install designbook-drupal@designbook
/plugin install designbook-css-tailwind@designbook
```

**skills CLI (Codex and other agents)**

```bash
npx skills add pen-drop/designbook --skill debo
```

The skills CLI writes into the project's `.agents/skills/` tree and per-agent symlinks. Internal skills (`metadata.internal: true`, including `designbook-test` and `designbook-skill-creator`) stay hidden unless `INSTALL_INTERNAL_SKILLS=1`.

2. Restart the agent after plugin settings change so it loads the new skill files.

3. Confirm the agent can name the `debo` skill and the `install` workflow.

**Done when:** the agent lists Designbook as an installed skill, and you have not yet required a `designbook.config.yml`. That file is created during project initialization.

Marketplace plugins: `designbook`, `designbook-drupal`, `designbook-vue`, `designbook-css-tailwind`, `designbook-stitch`, `designbook-test`, `designbook-gaia`. Figma is documented under [Integrations](/integrations/figma).
