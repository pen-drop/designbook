## MODIFIED Requirements

### Requirement: View-Mode Skill Colocation
View-mode authoring knowledge SHALL be part of the `designbook-scenes` skill. There SHALL be no separate `designbook-view-modes` skill.

When an agent creates scenes that require view-mode expressions, it SHALL find all necessary guidance (JSONata reference, field-mapping guide, create-view-modes task) within `designbook-scenes`.

#### Scenario: Agent creates scenes with view modes
- **WHEN** an agent loads `designbook-scenes` to build a scene
- **THEN** the skill contains all resources needed to also author the required `.jsonata` view-mode files without loading a second skill
