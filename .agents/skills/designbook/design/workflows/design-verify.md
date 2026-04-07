---
title: Design Verify
description: Visual testing — verify existing screens against design references
stages:
  intake:
    steps: [design-verify:intake]
  configure:
    each: scene
    steps: [configure-meta-scene, storybook-preview]
  test:
    each: test
    steps: [capture, compare]
  polish:
    each: test
    steps: [polish, recapture, verify]
    loop: 3
engine: direct
---
