---
when:
  steps: [design-screen:plan-components]
files: []
reads:
  - path: $DESIGNBOOK_DATA/design-system/guidelines.yml
    workflow: debo-design-guideline
---

# Plan Components

Identify which UI components are needed for scene creation based on the section requirements.

## Input

- `guidelines.yml` — component patterns, naming conventions, design principles
- Scene requirements from intake context

## Output

Present a component plan for user confirmation:

| Category | Component | Slots | Purpose |
|----------|-----------|-------|---------|
| Existing | heading   | text  | Reuse   |
| New      | card      | image, title, body | Content card |

## Constraints

- Apply `component_patterns` from guidelines as hard constraints
- Follow `naming.convention` from guidelines for new components
- Iterate with user until confirmed — the confirmed list feeds into `create-component` stage
