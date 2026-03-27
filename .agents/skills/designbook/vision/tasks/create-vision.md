---
params:
  product_name: ~
  description: ~
  problems: []
  features: []
files:
  - $DESIGNBOOK_OUTPUTS_CONFIG/product/vision.md
---

# Create Product Vision

Creates `$$DESIGNBOOK_OUTPUTS_CONFIG/product/vision.md` with the approved product vision from the dialog.

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
