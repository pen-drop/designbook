# storybook-addon-designbook

Storybook addon and CLI for [Designbook](https://github.com/pen-drop/designbook) — AI workflows that structure your design for CMS implementation.

Designbook turns designs (from Figma, Google Stitch, an existing website, or AI conversation) into structured specs ready for implementation in any CMS (Drupal, WordPress, ...) and any frontend framework. This addon provides the Storybook integration: live preview of design artifacts, workflow tracking panels, and the `storybook-addon-designbook` CLI used by the Designbook AI skills.

## Features

- 🖼 **Live preview** of Designbook artifacts (components, sections, screens, design tokens) in Storybook
- 🧭 **Manager panels** for workflow status, composition trees, and visual comparison
- 🛠 **CLI** for workflow tracking, schema validation, CSS guards, and Storybook process management
- 🧩 **Vite plugin** that loads `designbook.config.yml` and design artifacts into the preview

## Requirements

- Storybook ≥ 10 (Vite builder)
- Node.js ≥ 20

## Installation

```bash
npm install --save-dev storybook-addon-designbook
```

Register the addon in `.storybook/main.js`:

```js
const config = {
  addons: [{ name: 'storybook-addon-designbook' }],
};
export default config;
```

The addon resolves its settings from a `designbook.config.yml` found by walking up from the Storybook config directory.

## CLI

```bash
npx storybook-addon-designbook <command>
```

| Command     | Purpose                                                                   |
| ----------- | ------------------------------------------------------------------------- |
| `config`    | Output shell exports for `designbook.config.yml` values                   |
| `validate`  | Validate Designbook artifacts (data, tokens, components) against schemas  |
| `guard-css` | Verify token vars and fonts resolve in a compiled stylesheet probe        |
| `workflow`  | Manage workflow tracking (create, done, result, list, ...)                |
| `storybook` | Storybook daemon lifecycle (start, stop, status, logs, restart)           |
| `plan`      | Resolve a workflow definition into a self-contained markdown plan         |

The CLI is primarily driven by the Designbook AI skills (`/debo-*` workflows) — see the [main repository](https://github.com/pen-drop/designbook) for the full setup including skill installation.

## License

[MIT](./LICENSE)
