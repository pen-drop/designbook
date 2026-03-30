---
title: Generate CSS
description: Generate CSS token files from design tokens. Automatically selects the correct skill based on DESIGNBOOK_FRAMEWORK_CSS.
stages:
  generate:
    each: group
    steps: [generate-jsonata]
  transform:
    steps: [generate-css]
engine: direct
---
