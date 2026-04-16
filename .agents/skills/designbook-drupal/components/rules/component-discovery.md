---
trigger:
  domain: components.discovery
filter:
  frameworks.component: sdc
---

# Component Discovery (SDC)

Existing components are located at `$DESIGNBOOK_HOME/components/*/`. Each subdirectory contains one component with `*.component.yml`, `*.twig`, and `*.story.yml` files.

To scan components: read all `*.component.yml` files in that directory.
