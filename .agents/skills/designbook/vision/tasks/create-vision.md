---
params:
  product_name: ~
  description: ~
  problems: []
  features: []
files:
  - file: $DESIGNBOOK_DATA/vision.md
    key: vision
    validators: []
---

# Create Product Vision

Write the approved product vision from the dialog via stdin to the CLI:
```
 write-file $WORKFLOW_NAME $TASK_ID --key vision
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
```
