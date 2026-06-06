---
trigger:
  steps: [verify-install]
result:
  type: object
  required: [port, url]
  properties:
    port:
      $ref: ../schemas.yml#/StorybookPort
    url:
      $ref: ../schemas.yml#/StorybookUrl
---

# Verify Install

Bring up Storybook in the install target and confirm it serves the story index. The
verify procedure (dependency install, the addon start command, output parsing,
startup-error handling, and the reachability check) is a fixed format and lives in
the verify rule.

## Result: port

The port Storybook bound to, parsed from the start command's output.

## Result: url

The reachable Storybook URL built from that port, confirmed to serve the story index.
On success, leave Storybook running and report the summary; on any failure, escalate
with the exact command output rather than reporting success.
