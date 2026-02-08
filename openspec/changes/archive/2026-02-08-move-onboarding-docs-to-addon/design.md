# Design: Move Onboarding Docs to Addon

## Context
The onboarding documentation is currently part of the integration test project. To make it reusable and distributable, it needs to be part of the addon package.

## Goals / Non-Goals
**Goals:**
- Move `onboarding/*.mdx` to `packages/storybook-addon-designbook`.
- Ensure these files are included in the published package.
- Allow consumers to include these stories in their Storybook configuration.

**Non-Goals:**
- Rewriting the content of the documentation (unless paths break).

## Decisions
- **Location**: Move `onboarding` folder to `packages/storybook-addon-designbook/src/onboarding`.
- **Distribution**: Configure `package.json` `files` array to include `dist/onboarding` or `src/onboarding`. Since MDX files effectively act as source, we might need to copy them to `dist` or expose `src`.
- **Exports**: Ensure the `package.json` exports (or just existence) allows resolving the path to these files.
- **Consumption**: Consumers will add a line to their `stories` array pointing to `node_modules/storybook-addon-designbook/dist/onboarding/*.mdx`.

## Risks / Trade-offs
- **Paths**: Imports inside MDX files (e.g., images, components) must be relative or resolvable. Moving them might break relative imports if they point outside the onboarding folder.
