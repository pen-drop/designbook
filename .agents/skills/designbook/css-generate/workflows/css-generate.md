---
title: Generate CSS
description: Generate CSS token files from design tokens. Automatically selects the correct skill based on DESIGNBOOK_FRAMEWORK_CSS.
stages:
  intake:
    steps: [intake]
  prepare:
    steps: [prepare-fonts, prepare-icons]
  generate:
    each: group
    steps: [generate-jsonata]
  transform:
    steps: [generate-css]
  index:
    steps: [generate-index]
engine: direct
---
