---
trigger:
  steps: [create-scene-file, write-scene]
filter:
  frameworks.css: tailwind
---

# Tailwind Scene Styling

Keep reusable utility styling in components under the component styling policy.
When a scene introduces a component source directory, include that directory in
the CSS entrypoint's scan coverage. Scene values follow the shared scene contract;
source coverage does not change its rendering or slot rules.
