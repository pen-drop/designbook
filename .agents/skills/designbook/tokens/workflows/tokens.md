---
title: Design Tokens
description: Choose colors and typography for your product
params:
  reference_url: { type: string, default: "" }
  reference_folder:
    type: string
    resolve: reference_folder
    from: reference_url
stages:
  extract:
    steps: [extract-reference]
  create-tokens:
    steps: [create-tokens]
engine: direct
after:
  - workflow: css-generate
    optional: true
---
