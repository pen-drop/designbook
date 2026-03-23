---
params:
  product_name: ~
  description: ~
  problems: []
  features: []
files:
  - $DESIGNBOOK_DIST/product/vision.md
---

# Create Product Vision

Write `product/vision.md` using the params collected during intake. Do not add content beyond what was gathered — transcribe directly.

## File Format

```markdown
# {{ product_name }}

## Description
{{ description }}

## Problems & Solutions
{% for problem in problems %}
### Problem {{ loop.index }}: {{ problem.title }}
{{ problem.solution }}
{% endfor %}

## Key Features
{% for feature in features %}
- {{ feature }}
{% endfor %}
```

