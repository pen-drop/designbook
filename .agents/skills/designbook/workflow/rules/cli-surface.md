---
name: designbook-cli-surface
trigger:
  steps:
    [
      capture,
      capture-backend,
      capture-file,
      capture-image,
      compare,
      compare-observations,
      compile-css,
      create-data-model,
      create-sample-data,
      create-scene-file,
      create-tokens,
      create-vision,
      generate-css,
      generate-index,
      generate-jsonata,
      guard-css,
      map-entity,
      observe-figma,
      observe-storybook,
      observe-website,
      outtake,
      polish,
      polish-config,
      prepare-fonts,
      publish-capture,
      refresh-components,
      setup-storybook,
      sync,
      transform,
      triage,
      triage-config,
      validate,
      verify-install,
      write-component,
      write-config,
      write-scene,
    ]
---

# CLI command surface

`_debo` / `npx storybook-addon-designbook` is the command contract. Run the
command. Its stdout and stderr are the spec: catalogue, schemas, instructions,
status. Skill descriptions only fire the skill; they are not the command
surface. Every intake's first command is `workflow discover <id>`.
`workflow discover` and `workflow instructions` supply the catalogue.

A nonzero CLI exit ends this work. Report that exact message. Recover with
`--help`, the catalogue, or the saved step instructions.
`packages/storybook-addon-designbook` is not a recovery path.
