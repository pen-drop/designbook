# Add an extension

Enable an existing integration so its contributions appear in intake. This page uses Google Stitch.

**You need:** [installed skills](/get-started/install) including `designbook-stitch`, a project with `designbook.config.yml`, and the Stitch MCP available if you will actually capture screens.

1. Register the extension in project config. Keep `website` and `storybook` if you already use those capture sources.

**AI prompt**

```text
Add the stitch extension to designbook.config.yml. Keep existing extensions.
Then run npx storybook-addon-designbook config and intake extract-reference --palette
and show me that stitch-import is present.
```

**Config excerpt**

```yaml
extensions:
  - id: website
  - id: storybook
  - id: stitch
```

A string form is legal: `extensions: [website, storybook, stitch]`. `normalizeExtensions` accepts both. Optional object keys are `url` and `skill`.

2. Confirm discovery from the project directory:

```bash
npx storybook-addon-designbook config
```

Expect `DESIGNBOOK_EXTENSIONS` to include `stitch`.

3. Confirm the contribution:

```bash
npx storybook-addon-designbook intake extract-reference --palette
```

Expect palette context sourced from `.agents/skills/designbook-stitch/rules/stitch-import.md` (and `provide-stitch-url.md`). If those keys are absent, the skill is installed but not selected — check the `extensions` list and that you ran from the config tree (`--config-dir` if needed).

**Done when:** `config` lists `stitch` and extract-reference intake includes the Stitch rules. Removing `id: stitch` and re-running intake drops those rules.

Product behavior of Stitch: [Google Stitch](/integrations/stitch). Discovery details: [configuration](/extend/configuration).
