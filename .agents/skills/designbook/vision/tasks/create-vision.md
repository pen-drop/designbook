---
when:
  steps: [create-vision]
params:
  product_name: ~
  description: ~
  problems: []
  features: []
  design_reference: ~
  references: []
result:
  vision:
    path: $DESIGNBOOK_DATA/vision.md
---

# Create Product Vision

Write the approved product vision from the dialog via stdin to the CLI:
```
 workflow result --task $TASK_ID --key vision
```

## File Format

```markdown
# {{ product_name }}

## Description
{{ description }}

## Problems & Solutions

### Problem 1: [Problem Title]
[How the product solves it in 1-2 sentences]

### Problem 2: [Problem Title]
[How the product solves it in 1-2 sentences]

## Key Features
- [Feature 1]
- [Feature 2]
- [Feature 3]

## Design Reference
type: [url | image | stitch | ...]
url: [URL or integration-specific identifier]
label: [Short description]

## References
- type: [url | folder | ...]
  url: [URL or path]
  label: [Short description]
```

## Rules

- `## Design Reference` and `## References` are optional — only include them if the user provided values
- Reference types are extensible — integration skills (e.g. stitch) can add their own types
- Folder references use `path:` instead of `url:` to point to local directories
- Keep the section order: Description → Problems & Solutions → Key Features → Design Reference → References
