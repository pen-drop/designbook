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

### Reference observations from non-browser sources

A website reference is observed by the browser (`reference save --url`). A
source such as Figma is observed differently, in three steps with separate
owners:

1. **Acquisition — agent host.** The agent calls its connected tools (for
   Figma: the Figma MCP server's metadata, design context and screenshot
   tools). Their answers are heterogeneous — XML metadata, generated code
   with style notes, image blocks — and none of them is a complete raw Figma
   document. The addon has no MCP client and holds no credentials.
2. **Translation — source integration skill.** The integration turns those
   answers into the shared observation document below. Native node ids stay
   verbatim (`{ kind: 'figma-node', value: 'I12:34;56:78' }`). Anything a
   tool did not return is recorded in `unavailable[]`, never invented; the
   source `revision` stays `null` unless a version was actually returned.
3. **Storage and validation — this addon.** `reference import` validates
   and stores the document; local exports are copied with `--input`; the
   revision is published and validated like any other.

The document holds one state and wraps the existing capture definition and
DesignReference extract:

```json
{
  "format": "designbook-observations",
  "capture": { "role": "reference", "source": { "kind": "figma", "identity": "<file key>", "revision": null }, "scope": [ ... ] },
  "state": "rest",
  "captured_at": "2026-10-10T08:00:00.000Z",
  "extract": { "subjects": [ ... ], "parents": [], "images": [ ... ], "fonts": [ ... ], "captures": [ ... ] }
}
```

`extract` is validated against the `DesignReference` definition of the
effective workflow contract (`--contract`), plus graph integrity (no cycles,
dangling or repeated nodes), one sample and one screenshot record per
selected cell, canonical `<view>--<subject>--<state>.png` names and asset
paths under `assets/`. Every state document of a revision must embed the
same capture definition. `captures[].width/height` are the actual pixels of
the exported PNG — a host may return a downscaled image (e.g. 187×1024 for a
1200×6605 frame); the view geometry in `meta.yml` stays the original size.

```bash
_debo reference capture-location --capture capture.json --workflow-id <id>    # → revision directory
_debo reference import --reference <dir> --input rest.json --contract contract.json
_debo reference inspect --reference <dir> --state rest --contract contract.json \
  --locator 'I12:34;56:78' --locator-kind figma-node [--subject hero --view desktop]
_debo reference capture-image --reference <dir> --path desktop--hero--rest.png --input shot.png \
  --capture capture.json --contract contract.json --subject hero --view desktop --state rest
_debo reference capture-file --reference <dir> --path assets/hero-logo.svg --input logo.svg \
  --asset-id figma-image:hero-logo --capture capture.json --contract contract.json \
  --subject hero --view desktop --state rest          # or --font-family <family> for a declared font binary
_debo reference publish --capture capture.json --workflow-id <id> --owner <plan> --contract contract.json
_debo reference validate --reference <dir>
```

`inspect` confirms a node exists in the stored evidence by exact kind and
value — no suffix or CSS matching — and asks for `--subject`/`--view` when
the id occurs in several samples. It does not prove the live file still has
the node. Import accepts declared binaries that are not copied yet; `validate`
(and every published read) then fails on a missing screenshot, asset or
declared font file, on required `unavailable` entries, and on any file changed
after publication. To refresh, capture a new revision with a new workflow id.

## License

[MIT](./LICENSE)
