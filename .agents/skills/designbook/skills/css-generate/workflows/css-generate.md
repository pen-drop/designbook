---
title: Generate CSS
description: >-
  Generate CSS token files from design tokens. Automatically selects the correct skill based on
  DESIGNBOOK_FRAMEWORK_CSS.
stages:
  prepare:
    steps:
      - prepare-fonts
  generate:
    steps:
      - generate-jsonata
  transform:
    steps:
      - generate-css
  compile:
    steps:
      - compile-css
  guard:
    steps:
      - guard-css
  index:
    steps:
      - generate-index
---

Template for the planning agent. Use the ordered steps as building blocks. Enumerate repeated targets during intake and write each concrete task explicitly; these stages do not execute or expand at runtime.
