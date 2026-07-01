---
trigger:
  steps: [polish]
params:
  type: object
  required: [issue]
  properties:
    issue:
      type: object
each:
  issue:
    expr: "issues"
---

# Polish

Fix one issue.
