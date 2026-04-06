---
title: Design Verify
description: Visual testing — verify existing screens against design references
stages:
  intake:
    steps: [design-verify:intake]
  test:
    each: scene
    steps: [storybook-preview, screenshot, inspect, resolve-reference, visual-compare, polish]
engine: direct
---
