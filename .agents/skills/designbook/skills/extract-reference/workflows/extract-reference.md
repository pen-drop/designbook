---
title: Extract Reference
description: Record a fixed selected scope using discovered source integration tasks and publish shared observations.
intake:
  open_selectors:
    - name: source
      variants: [website, figma, storybook]
      gates:
        website: { steps: [observe-website] }
        figma: { steps: [observe-figma] }
        storybook: { steps: [observe-storybook] }
stages:
  source:
    steps: [observe-website, observe-figma, observe-storybook]
  files:
    steps: [capture-file, capture-image]
  publication:
    steps: [publish-capture]
---

Select only the applicable discovered integration tasks. Enumerate their concrete
subjects, views, states and evidence outputs before creation. Publication depends
on all selected source and evidence-file tasks. The saved definition remains fixed during execution.
