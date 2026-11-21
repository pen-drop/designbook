# Install Designbook

Designbook ships as one npm package, `storybook-addon-designbook`. It contains the CLI, the core skill and all integrations, so their versions always match. Your agent gets a thin entry skill that calls the CLI. Installing is separate from [initializing a project](/get-started/first-project).

**You need:** Node.js and npm in your application project, and an agent that can load skills (Claude Code, Codex, or any agent using the skills CLI).

1. Install the package as a dev dependency in your project:

```bash
npm i -D storybook-addon-designbook
```

2. Install the entry skill for your agent.

**Claude Code marketplace**

```bash
/plugin marketplace add pen-drop/designbook
/plugin install designbook@designbook
```

**skills CLI (Codex and other agents)**

```bash
npx skills add pen-drop/designbook --skill designbook
```

3. Restart the agent so it loads the entry skill.

4. Confirm the CLI finds the workflows: `npx storybook-addon-designbook intake install` prints the install workflow's intake context.

**Done when:** the agent lists the `designbook` skill and the intake command above succeeds. `designbook.config.yml` is created later, during project initialization.

To share your own skills across projects, publish them as [skill packages](/extend/skill-packages). Figma is documented under [Integrations](/integrations/figma).
