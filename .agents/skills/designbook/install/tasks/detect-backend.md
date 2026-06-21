---
title: "Detect Backend"
trigger:
  steps: [detect-backend]
result:
  type: object
  required: [backend, root]
  properties:
    backend:
      $ref: ../schemas.yml#/Backend
    root:
      $ref: ../schemas.yml#/ProjectRoot
---

# Detect Backend

Determine which backend the project uses and where its root is. The concrete
detection markers and root-resolution logic are supplied by the installed
integration skills' rules for this step.

## Result: backend

Evaluate the detection rules in priority order; the first match wins. Its backend
identifier selects the integration skill (`designbook-<backend>`) whose rules and
blueprints drive every later stage.

No rule matches → abort, listing the backends the installed rules support.

When the matched backend's integration skill directory is missing under the skills
root, stop and tell the user to install it via the Claude marketplace.

## Result: root

The matched detection rule also contributes the project root (and, for backends that
distinguish them, the docroot inside it). Subsequent stages resolve their paths
relative to this root.
