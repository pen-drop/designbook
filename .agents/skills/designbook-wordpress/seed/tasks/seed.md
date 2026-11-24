---
title: Seed sample content into WordPress
trigger:
  steps: [seed-content:seed]
filter:
  backend: wordpress
params:
  type: object
  required: [data_model, sample_files, backend_cmd]
  properties:
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      workflow: data-model
      type: object
    sample_files:
      type: array
      description: >
        Sample-data files to seed, in intake order (referenced records first); each is
        `$DESIGNBOOK_DATA/data/<entity_type>.<bundle>.yml`.
      items: { type: string, description: Absolute path of one sample-data file. }
    backend_cmd:
      type: object
      resolve: backend_cmd
      description: Backend command strings from designbook.config.yml. Provides seed_cmd.
      required: [seed_cmd]
      properties:
        seed_cmd:
          type: string
          description: Command prefix that runs a PHP script inside WordPress; append the script path relative to the WordPress root.
          examples: ["ddev wp eval-file"]
result:
  type: object
  required: [seed-script, seed-result]
  properties:
    seed-script:
      path: $DESIGNBOOK_DATA/seed/seed.php
      $ref: designbook-wordpress/seed/schemas.yml#/SeedScript
    seed-result:
      $ref: designbook/skills/seed-content/schemas.yml#/SeedResult
---

# Seed sample content

Create every record of the sample files as WordPress content, then run the seed script with
`{{ backend_cmd.seed_cmd }}`, capturing stdout, stderr and the exit code.

## Result: seed-result

`created` and `updated` list the record ids the script printed. A failed record or a non-zero
exit keeps the output as evidence and blocks the task.
