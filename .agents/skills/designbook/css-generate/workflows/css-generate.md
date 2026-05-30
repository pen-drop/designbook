---
title: Generate CSS
description: Generate CSS token files from design tokens. Automatically selects the correct skill based on DESIGNBOOK_FRAMEWORK_CSS.
stages:
  intake:
    steps: [css-generate:intake]
  prepare:
    steps: [prepare-fonts]
  generate:
    steps: [generate-jsonata]
  transform:
    steps: [generate-css]
  compile:
    steps: [compile-css]
  guard:
    steps: [guard-css]
  index:
    steps: [generate-index]
engine: direct
---
