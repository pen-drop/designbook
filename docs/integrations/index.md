# Integrations

A **distro** here is a documented entry for one composition of integrations, not a new package. A **backend** is the data and configuration target. A **component framework** is how UI is expressed (Twig/SDC or Vue). CSS and capture sources are further independent contributions. Drupal plus Twig/SDC is the first public entry. Vue is an installed component contribution; that does not promise support for arbitrary backend combinations.

Each integration selects a backend, CSS framework, or capture source. Configuration turns that choice into skill contributions. Enablement lives in [Extend Designbook](/extend/).

- [Drupal](/integrations/drupal) — content types, view modes, SDC, config export; start at [First Drupal result](/integrations/drupal/first-result)
- [Tailwind CSS](/integrations/tailwind) — token naming and `@theme` CSS generation
- [Google Stitch](/integrations/stitch) — MCP capture source (`extensions: stitch`)
- [Figma](/integrations/figma) — capture skill, not a marketplace plugin
- [GAIA](/integrations/gaia) — workflow-step prose outside the four-level model

`designbook-vue` is a marketplace plugin for Vue 3 component tasks (`frameworks.component: vue`). `designbook-test` is the internal harness.
