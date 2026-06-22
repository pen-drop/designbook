---
title: Create Sample Data
description: Generate per-bundle sample data files in data/ with __designbook.section tags
stages:
  create-sample-data:
    steps: [create-sample-data]
engine: direct
---

## Output Format

Sample data is stored as one file per `<entity_type>.<bundle>` under `$DESIGNBOOK_DATA/data/`. Each file is a **bare record array** — no `content:` or `config:` wrapper. The loader derives the entity namespace from the data model.

Every record carries a `__designbook` block with a `section` tag:

```yaml
# data/node.doc.yml
- id: "1"
  __designbook:
    section: getting-started
  field_body: "<h2>Introduction</h2>"
- id: "2"
  __designbook:
    section: getting-started
  field_body: "<h2>Next steps</h2>"
```

Scenes select records from the shared pool via JSONata `select:` expressions. Example:

```
select: "$['getting-started' in __designbook.section and id = '3'][0]"
```

## Idempotency

Before generating new records, the task reads each existing `$DESIGNBOOK_DATA/data/<entity_type>.<bundle>.yml` file and counts records whose `__designbook.section` matches the current `section_id`. Existing records are never replaced — new records are appended only when `existing_count < required_count`. Record count rules (6 for non-full, max(existing,3) for canvas/layout-builder full, 1 for field-map or config) are applied per bundle file.
