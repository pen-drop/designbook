# Run one workflow

Get one concrete artifact without driving every pipeline stage by hand. This page uses the `tokens` workflow: a guided conversation that writes `design-tokens.yml`.

**You need:** [installed skills](/get-started/install), a [project config](/get-started/first-project), and a design reference or a verbal description of color and type.

1. Ask the agent to run tokens. Every Designbook intake starts with `intake <workflow>`. The agent must run the CLI and read stdout; skill descriptions are not the command spec.

**AI prompt**

```text
Run the Designbook tokens workflow for this project. Start with intake tokens.
Ask me only the color and typography questions you cannot answer from the
existing files or the design reference. Write design-tokens.yml and stop.
```

**Shell (what the agent runs first)**

```bash
npx storybook-addon-designbook intake tokens
```

2. Answer the agent's questions. Typical outputs include color roles, type scale, and whether Tailwind naming rules apply (`frameworks.css: tailwind` selects `designbook-css-tailwind` naming conventions).

3. Inspect the named file. Default data directory is `<designbook.home>/designbook` (often `designbook/design-tokens.yml` next to Storybook). Open it and confirm colors and typography match what you agreed.

**Done when:** `design-tokens.yml` exists under the resolved `DESIGNBOOK_DATA` directory and records the agreed tokens.

One useful result is enough. [The pipeline](/get-started/pipeline) lists later stages. Full command options live in the [CLI reference](/advanced/cli/). Do not type `/debo-tokens` as a CLI alias; namespaced agent skills are not shell commands.
