---
name: figma-capture-observations
trigger:
  steps: [observe-figma]
filter:
  extensions: [figma]
---

# Observe the selected figma source

Use the available Figma integration tools to read the selected file revision and
frame/node identities. Map selected frames and variants to the agreed subjects,
views and states. Record an explicit breakpoint mapping only when intake has
established one. Read the selected hierarchy, observed layout, fills, typography
and content; export visual evidence and referenced assets with the tools actually
available. Preserve Figma file/node identity in native locators; a frame does not
need to imitate a DOM tree. Missing exports, fonts or interaction variants remain
explicit unavailable observations. A resting frame cannot establish an open menu
state. If the source revision changes during capture, stop and prepare a new fixed
capture rather than mixing revisions. A deterministic fixture is not live Figma
access and must be identified as fixture evidence.
