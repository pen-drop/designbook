---
title: Design Verify
description: Visual testing — verify existing screens against design references
stages:
  intake:
    steps: [design-verify:intake, configure-meta]
  test:
    each: scene
    steps: [storybook-preview, capture, compare, polish]
engine: direct
---
