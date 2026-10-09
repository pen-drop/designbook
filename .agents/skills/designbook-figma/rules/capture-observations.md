---
name: figma-capture-observations
trigger:
  steps: [observe-figma]
filter:
  extensions: [figma]
---

# Observe the selected figma source

Read the selected file with the host's callable Figma tools. When those tools
are absent, unauthorized, or return an error, report the unavailable Figma
capability and end the capture. Required missing observations stay explicit:
node identity, view size, export, font, variant, and file version. Record
`revision: null` when the tools omit a version id.

Map selected frames and variants to the agreed subjects, views and states.
Record an explicit breakpoint mapping only when intake has established one.
Read the selected hierarchy, observed layout, fills, typography and content;
export visual evidence and referenced assets with the tools that answered.

Native locators use kind `figma-node` and the node's file-native id. Shared
intake `_debo reference save` and `reference inspect --locator` confirm
website dumps against `extract--<state>.json`.

A resting frame cannot establish an open menu state. If the source revision
changes during capture, stop and prepare a new fixed capture rather than
mixing revisions. A deterministic fixture is not live Figma access and must
be identified as fixture evidence.
