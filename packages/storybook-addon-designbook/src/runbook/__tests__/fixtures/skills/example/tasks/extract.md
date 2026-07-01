---
trigger:
  steps: [extract]
params:
  type: object
  properties:
    reference_url: { type: string, default: "" }
result:
  type: object
  required: [extract, issues]
  properties:
    extract:
      type: object
      properties:
        title: { type: string }
    issues:
      type: array
      items:
        type: object
        properties:
          id: { type: string }
---

# Extract

Fetch the reference and produce an extract.

## Example output

```yaml
extract:
  title: Sample Site
issues: []
```
