---
title: Generate CSS
description: Generate CSS token files from design tokens. Automatically selects the correct skill based on DESIGNBOOK_FRAMEWORK_CSS.
stages:
  execute:
    steps: [css-generate:intake, generate-jsonata]
  transform:
    steps: [generate-css]
engine: direct
---
