---
name: seed-content-intake
description: Domain decisions required before planning seed-content artifacts.
trigger:
  steps: [seed-content:intake]
---

# seed-content intake

Read the data model and the sample-data pool. Resolve the filter into the list of sample-data files to seed, ordered so that referenced records (terms, media) come before the records that reference them. A record that references a record missing from the pool is reported at intake. The active backend's seed task supplies the step; freeze its inputs before planning.

Follow the [shared builder](../../../resources/workflow-building.md) for sealing and execution modes.
