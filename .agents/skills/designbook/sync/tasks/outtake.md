---
title: Outtake
trigger:
  steps: [sync-to:outtake]
params:
  type: object
  required: [written-files]
  properties:
    written-files:
      type: array
      description: Paths of all YAML files written by the write-config stage.
      items:
        type: string
        description: Absolute path to a written Drupal config YAML file.
result:
  type: object
  required: [summary]
  properties:
    summary:
      type: object
      description: Export summary — config names written and total count.
      properties:
        config_names:
          type: array
          description: Sorted list of Drupal config names (without .yml extension) written in this run.
          items:
            type: string
            description: Drupal config name, e.g. "node.type.article".
            pattern: '^[a-z0-9_]+(\.[a-z0-9_]+)+'
        count:
          type: integer
          description: Total number of config YAML files written.
---

# Outtake

Report the set of Drupal config names written in this run.
