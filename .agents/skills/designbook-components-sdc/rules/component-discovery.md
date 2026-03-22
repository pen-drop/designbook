---
when:
  stages: [designbook-design-shell:intake, designbook-design-screen:intake, designbook-design-component:intake]
  frameworks.component: sdc
---

# Component Discovery (SDC)

Existing components are located at `$DESIGNBOOK_DRUPAL_THEME/components/*/`. Each subdirectory contains one component with `*.component.yml`, `*.twig`, and `*.story.yml` files.

To scan components: read all `*.component.yml` files in that directory.
