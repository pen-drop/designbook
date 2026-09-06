---
title: Design Tokens
description: Choose colors and typography for your product
params:
  reference_url:
    type: string
    default: ''
  reference_folder:
    type: string
stages:
  extract:
    steps:
      - extract-reference
  create-tokens:
    steps:
      - create-tokens
---

Template for the planning agent. Use the ordered steps as building blocks. Enumerate repeated targets during intake and write each concrete task explicitly; these stages do not execute or expand at runtime.
