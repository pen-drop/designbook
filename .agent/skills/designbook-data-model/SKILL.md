---
name: designbook-data-model
description: Validates and stores data model configuration in JSON format.
---

# Designbook Data Model Skill

This skill is the central authority for validating and saving the data model to the project. It accepts a JSON object (passed as a string or file path) representing the data model, validates it against `schema/data-model.json`, and persists it to `designbook/data-model.json`.

## Usage

```bash
# From another skill or workflow
/skill/designbook-data-model/steps/process-data-model --data-model-json='{ ... }'
# Or directly via script
node .agent/skills/designbook-data-model/scripts/validate-and-save.cjs ...
```

## Steps

- [process-data-model](./steps/process-data-model.md): Validates and saves data model configuration.
