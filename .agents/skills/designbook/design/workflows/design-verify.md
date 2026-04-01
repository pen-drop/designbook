---
title: Design Verify
description: Visual testing — verify existing screens against design references
stages:
  intake:
    steps: [intake]
  test:
    each: scene
    steps: [storybook-preview, screenshot, resolve-reference, visual-compare, polish]
engine: direct
---
