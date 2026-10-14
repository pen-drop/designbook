---
title: Seed content
description: >-
  Create the sample records of the data model as content in the live backend. Re-running
  updates the records it created instead of duplicating them.
params:
  filter:
    type: object
    description: >
      Slice filter. An empty object seeds every sample record; non-empty keys narrow the run to
      the given entity types / bundles.
    default: {}
stages:
  seed:
    steps:
      - seed
---

Template for the planning agent. Use the ordered steps as building blocks. Enumerate repeated targets during intake and write each concrete task explicitly; these stages do not execute or expand at runtime.
