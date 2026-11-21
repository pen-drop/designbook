# What Designbook is

Designbook gives your AI agent structured workflows for turning ideas and existing design references into data models, components, and implementation-ready specifications.

Designbook is not a design tool. Figma, Google Stitch, a live website, or a conversation stay as inputs. The agent runs guided skills. Storybook previews the resulting artifacts. Export into a CMS depends on the selected [integration](/integrations/).

## Inputs

You can start from:

- A Figma file observed through available Figma tools
- A Google Stitch project observed through Stitch MCP
- A live website or Storybook story
- A conversation that defines product intent without a visual source

The agent records those observations as a capture revision when a workflow needs a fixed reference. Capture is supporting work, not a replacement for your design process.

## What the agent produces

Typical artifacts live under the project's Designbook data directory (`designbook/` by default, next to Storybook):

- `vision.yml` — product intent
- section specifications
- `design-tokens.yml` — color and typography
- `data-model.yml` — entities, bundles, fields
- sample data tagged to sections
- component files and stories
- screen and shell compositions

Storybook is the inspection surface. Drupal config YAML is an optional export through [sync-to](/integrations/drupal), not the default first result.

## Boundaries

Designbook does not:

- replace a visual design application
- promise automated production-ready application code
- invent a marketplace plugin that is not listed in `.claude-plugin/marketplace.json`

The marketplace ships one plugin, the `designbook` entry skill. Core and integrations (`designbook-drupal`, `designbook-vue`, `designbook-css-tailwind`, `designbook-stitch`, `designbook-wordpress`, `designbook-figma`) ship inside the `storybook-addon-designbook` npm package and are selected through configuration.

Continue with [install](/get-started/install).
