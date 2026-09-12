---
title: Observe storybook
trigger:
  steps: [observe-storybook]
domain: [references]
params:
  type: object
  required: [source, reference_folder, state, session]
  properties:
    source:
      $ref: ../schemas.yml#/ObservationSource
    reference_folder:
      $ref: ../schemas.yml#/ReferenceFolder
    state:
      type: string
      minLength: 1
      description: >
        The one observed state this dump records. A dump is one page load, so a
        revision holds one per declared state and one task writes one of them.
      examples: [rest, menu-open]
    session:
      type: string
      minLength: 1
      description: >
        Who observes this state. `anonymous` is the reserved name for a pass
        without a stored session; any other name is a key of `sessions:` in the
        project configuration.
      examples: [anonymous, member, admin]
result:
  type: object
  required: [extract]
  properties:
    extract:
      path: "{{ reference_folder }}/extract--{{ state }}.json"
      submission: direct
      $ref: ../schemas.yml#/SourceDump
---

# Observe storybook

Source dump for one selected state of the fixed Storybook scope, written
with `reference save`.
Catalogue JSON is CLI stdout. Required missing evidence is explicit.
