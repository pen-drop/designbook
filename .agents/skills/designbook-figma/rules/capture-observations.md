---
name: figma-capture-observations
trigger:
  steps: [observe-figma]
filter:
  extensions: [figma]
---

# Observe the selected figma source

Read the selected file with the host's callable Figma tools. When those tools
are absent, unauthorized, or return an error, and no deterministic fixture
observations are supplied, report the unavailable Figma capability and end
the capture. Required missing observations stay explicit: node identity, view
size, export, font, variant, and file version. Record `revision: null` when
the tools omit a version id.

Translate host-tool answers (or labeled fixture documents) into one
`designbook-observations` document per state. Store each with
`_debo reference import --reference <revision-dir> --input <document.json>
--contract <contract.json>`. Confirm native locators with
`_debo reference inspect --reference <revision-dir> --state <name>
--locator <id> --locator-kind figma-node --contract <contract.json>`.
Copy declared screenshots and assets with
`_debo reference capture-image --input` and
`_debo reference capture-file --input`. Website `_debo reference save --url`
does not store Figma evidence.

Map selected frames and variants to the agreed subjects, views and states.
Record an explicit breakpoint mapping only when intake has established one.
Read the selected hierarchy, observed layout, fills, typography and content;
export visual evidence and referenced assets with the tools that answered.

Native locators use kind `figma-node` and the node's file-native id.

A resting frame cannot establish an open menu state. If the source revision
changes during capture, stop and prepare a new fixed capture rather than
mixing revisions. A deterministic fixture is not live Figma access and must
be identified as fixture evidence.
