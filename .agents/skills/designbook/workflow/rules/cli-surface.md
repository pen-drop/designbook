---
name: designbook-cli-surface
trigger:
  steps:
    [
      observe-website,
      observe-figma,
      observe-storybook,
      capture-file,
      capture-image,
      publish-capture,
    ]
---

# CLI command surface

`_debo` / `npx storybook-addon-designbook` is the source of command behavior,
matched instructions and schemas. Run the command and read its stdout/stderr.
Every intake's first command is `workflow discover <id>`.
`workflow discover` and `workflow instructions` supply the catalogue.

A nonzero CLI exit ends this work. Report that exact message. Recover by
fixing the invocation (`--help`, the catalogue, the saved step instructions).
`packages/storybook-addon-designbook` is not a recovery path.
