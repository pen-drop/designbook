## ADDED Requirements

### Requirement: Per-Stage External Skill Loading
The `designbook-workflow` Rule 4 (Rule Auto-Loading) SHALL check `designbook.config.yml` → `workflow.skills.<stage>` at the start of each stage execution and load each listed skill via the Skill tool before scanning task/rule files.

Stage keys follow the same scoping format as `workflow.rules`:
- `create-tokens` — applies to any workflow running the `create-tokens` stage
- `debo-design-tokens:dialog` — applies only to the dialog stage of `debo-design-tokens`

```yaml
workflow:
  skills:
    debo-design-tokens:dialog:
      - frontend-design
    create-tokens:
      - frontend-design
```

#### Scenario: External skill loaded at stage start
- **WHEN** the AI begins executing stage `create-tokens`
- **THEN** it reads `designbook.config.yml` → `workflow.skills.create-tokens`
- **AND** loads each listed skill via the Skill tool before proceeding with task/rule scanning

#### Scenario: Workflow-scoped dialog skill loaded
- **WHEN** the AI begins the dialog stage of `debo-design-tokens`
- **THEN** it reads `workflow.skills["debo-design-tokens:dialog"]` and loads each listed skill

#### Scenario: No workflow.skills key in config
- **WHEN** `designbook.config.yml` has no `workflow.skills` key
- **THEN** no external skills are loaded automatically; behavior is unchanged

#### Scenario: Skill loaded before task/rule file scanning
- **WHEN** `workflow.skills` lists a skill for the current stage
- **THEN** the Skill tool is called before the AI scans for task/rule files in `.claude/skills/`
- **AND** the loaded skill's instructions are available during the entire stage execution

#### Scenario: Duplicate skill listing across stages
- **WHEN** the same skill is listed in `workflow.skills` for multiple stages that run in the same session
- **THEN** the skill is effectively active throughout — no error or redundant reload occurs
