---
params:
  sections: ~   # array of {id, title, description, order} from dialog
files:
  - $DESIGNBOOK_DIST/sections/{{ sections[].id }}/{{ sections[].id }}.section.scenes.yml
---

For each section in `sections`, create the directory `$DESIGNBOOK_DIST/sections/[id]/` and write `[id].section.scenes.yml`:

```yaml
id: section-id-kebab-case
title: Section Title
description: One sentence description
status: planned
order: 1

group: "Designbook/Sections/Section Title"
scenes: []
```

Rules:
- `id` must be kebab-case and unique
- Directory name must match the `id`
- `status` defaults to `planned`
- `order` reflects the sequence (1, 2, 3…)
- `group` follows `"Designbook/Sections/[Title]"` convention
- `scenes` starts as empty array
