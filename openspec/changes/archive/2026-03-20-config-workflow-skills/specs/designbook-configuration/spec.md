## ADDED Requirements

### Requirement: Workflow Skills in Config
The `designbook.config.yml` file MAY include a `workflow.skills` map. Each key is a stage name or workflow-scoped dialog key (e.g. `create-tokens`, `debo-design-tokens:dialog`). Each value is an array of skill name strings. These skill names are passed to the Skill tool by the AI at the start of the matching stage — before task/rule file scanning.

```yaml
workflow:
  skills:
    debo-design-tokens:dialog:
      - frontend-design
    create-tokens:
      - frontend-design
    create-component:
      - frontend-design
      - web-design-guidelines
```

#### Scenario: Skills key present for a stage
- **WHEN** `designbook.config.yml` contains `workflow.skills.create-tokens: [frontend-design]`
- **THEN** the AI loads `frontend-design` via the Skill tool at the start of the `create-tokens` stage

#### Scenario: Multiple skills listed for one stage
- **WHEN** `workflow.skills` lists multiple skills for a stage
- **THEN** the AI loads all listed skills in order before proceeding

#### Scenario: Skills key absent
- **WHEN** `designbook.config.yml` has no `workflow.skills` key
- **THEN** no external skills are auto-loaded; existing `workflow.rules` and `workflow.tasks` behavior is unaffected
