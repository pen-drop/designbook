# First Drupal result

Get from an installed Designbook skill to configuration that Drupal actually imports.

**You need:** the core `debo` skill and `designbook-drupal` ([Install the skills](/get-started/install)); a local Drupal project with Drush; a theme directory as `designbook.home`; `backend: drupal` and `frameworks.component: sdc` ([Initialize a project](/get-started/first-project)); a config-sync directory Drupal will import from.

Confirm the resolved backend before you start:

**Shell**

```bash
npx storybook-addon-designbook config
```

`config` must print `DESIGNBOOK_BACKEND='drupal'` and `DESIGNBOOK_FRAMEWORK_COMPONENT='sdc'`.

1. Ask the agent to build a small article model and the SDC pieces that display it.

**AI prompt**

```text
This Drupal project already has Designbook installed with backend drupal and
component framework sdc. Create a small article content type with title, body,
and one image. Map a teaser view mode to SDC components. Generate sample data.
Start every workflow with intake. Do not invent a sync-to CLI command.
```

The agent runs `npx storybook-addon-designbook intake <workflow>` for `data-model`, `sample-data`, `design-entity`, and `design-component` as needed. Those are agent workflows.

2. Inspect the result in Storybook.

**AI prompt**

```text
Start Designbook Storybook with npx storybook-addon-designbook storybook start.
Then run storybook status and open the article teaser story.
```

**Shell**

```bash
npx storybook-addon-designbook storybook start
npx storybook-addon-designbook storybook status
```

3. Export the selected configuration and import it in Drupal.

**AI prompt**

```text
Run the sync-to workflow. Start with intake sync-to. Export only the article
bundle and its display. Write YAML into this project's config-sync directory.
Then tell me the exact Drush import I should run, and wait until I confirm
the content type exists in Drupal.
```

`sync-to` is a workflow (`intake sync-to`). There is no `storybook-addon-designbook sync-to` command. YAML on disk is the export. The result is an import you can see: your project's config import (commonly `drush cim`) succeeds, and Drupal shows the article type and teaser display.

**Done when:** Storybook shows the article teaser, the exported YAML is in config-sync, Drupal has imported that selection, and you can create or view an article using that type. Exported YAML without a successful Drupal import is not done.

Continue on the [Drupal integration](/integrations/drupal) page. The product landing is [Designbook for Drupal](/drupal/).
