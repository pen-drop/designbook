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
      re-capture,
      re-capture-backend,
      re-compare,
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

`_debo` / `npx storybook-addon-designbook` is the command contract for every
workflow. Run the command. Its stdout and stderr are the spec: catalogue,
schemas, instructions, status. Skill descriptions only fire the skill; they
are not the command surface.

Every intake's first command is `workflow discover <id>`. DOM and computed
evidence use `_debo extract <url> --out <dir>`. Screenshots use
`_debo capture screenshot --url <url> --selector <sel> --width <px> --out <png>`
(optional `--steps`, `--consent-selector`). A full matrix uses
`_debo capture matrix`. Story identity uses `_debo storybook check`.
`workflow instructions` supplies the saved step. A nonzero CLI exit ends this
work with that exact message. Recover with `--help`, the catalogue, or the
saved step instructions.

`packages/storybook-addon-designbook` is not a recovery path.
