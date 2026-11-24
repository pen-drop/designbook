# Initialize a project

Ask the agent to install Designbook into the application project. The install workflow detects the backend, writes `designbook.config.yml`, sets up Storybook, and verifies the result.

**You need:** [installed skills](/get-started/install) and a project root the agent can inspect (package manager, Drupal or other backend, existing Storybook if any).

1. Ask the agent to run install. It starts with `intake install`. When no config exists yet, intake records the chosen effective configuration in a temporary JSON file and calls `intake install --config <path>`. Writing the real YAML is an execution task.

**AI prompt**

```text
Initialize Designbook in this project. Run intake install, ask me the backend,
component framework, and CSS framework questions you cannot answer from the repo,
then write designbook.config.yml and set up Storybook.
```

2. Answer only the questions the tree does not already answer. Typical choices:

- backend: `drupal` or `none`
- `frameworks.component`: `sdc` or `vue`
- `frameworks.css`: `tailwind` when you want Tailwind v4 token CSS
- Storybook home directory (`designbook.home`)
- component namespace and `dirs.components`

3. Let the agent create `designbook.config.yml` or `designbook.config.yaml` at the project root (or the directory it resolved as workspace). The CLI walks up from the working directory looking for those two filenames.

4. Inspect the file. A Drupal plus Tailwind plus Storybook project resembles the committed `fixtures/drupal-petshop/designbook.config.yml` excerpt:

```yaml
backend: drupal
extensions:
  - id: website
  - id: storybook
frameworks:
  component: sdc
  css: tailwind
designbook:
  cmd: npx storybook dev
  home: .
```

**Done when:** `designbook.config.yml` exists, Storybook is wired, and `npx storybook-addon-designbook config` from the project directory prints `DESIGNBOOK_BACKEND` and `DESIGNBOOK_FRAMEWORK_*` matching those answers.

Configuration keys and discovery are explained in [Project configuration](/extend/configuration).
