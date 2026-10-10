# Figma

Figma is a capture source. Designbook observes selected file nodes, frames, assets, and visual evidence through available Figma tools. It is **not** a marketplace plugin. `.claude-plugin/marketplace.json` does not list `designbook-figma`.

The skill lives at `.agents/skills/designbook-figma`. It is `user-invocable: false`. After `intake extract-reference` matches this integration (source kind `figma`, extension `figma`), the agent uses Figma tools and the skill's capture instructions.

## Prerequisites

- Figma tools available to the agent (authenticated Figma MCP or equivalent)
- A Figma file the user can select
- Project config that selects the figma extension when extract-reference should offer that source:

```yaml
extensions:
  - id: figma
```

Do not run `/plugin install designbook-figma@designbook`. That plugin name is not in the marketplace.

## What it contributes

- Capture task `observe-figma` on the shared extract-reference workflow
- Translation of Figma nodes into the fixed capture revision (see the skill's `resources/capture.md`)

Extract-reference still owns the revision, publication, and query contract. The [reference CLI](/advanced/cli/reference) saves, captures, validates, and queries that revision. Figma does not bypass `reference publish` or approval.

If Figma tools are missing, extract-reference can still use `website` or `storybook` extensions. Enable those with `id: website` and `id: storybook` as in the petshop fixture.
