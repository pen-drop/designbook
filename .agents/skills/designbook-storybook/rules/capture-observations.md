---
name: storybook-capture-observations
trigger:
  steps: [observe-storybook]
filter:
  extensions: [storybook]
---

# Observe the selected storybook source

Use the exact selected story iframe URLs after the required build and index
refresh. Verify each story exists and displays the intended subject content.
Execute the agreed interactions and viewport dimensions, then capture the actual
DOM hierarchy, computed properties, content, assets and images. Preserve native
CSS locators. Submit the shared observation shape with the role selected by intake: `actual`
when verifying a design implementation, or `reference` when checking a backend
render against Storybook. Node IDs always describe the observed Storybook DOM.
Record explicit subject/view/state correspondences in the verification plan.
A missing story, error page or unrelated element cannot establish visual success.
