## MODIFIED Requirements

### Requirement: workflow create task discovery (DELTA)

**Previously**: `workflow create` matched one task file per step by filename matching step name, with a secondary broad scan fallback for tasks with explicit `when.steps`.

**Now**: `workflow create` uses broad-scan as the sole resolution mechanism. Tasks MUST declare `when.steps` to be discovered. Filename convention is not used for resolution.

#### Scenario: Discovery across multiple skills
- **WHEN** `workflow create` runs for a workflow with step `inspect`
- **AND** `.agents/skills/designbook/design/tasks/inspect-storybook.md` has `when: steps: [inspect]`
- **AND** `.agents/skills/designbook-stitch/tasks/inspect-stitch.md` has `when: steps: [inspect], extensions: stitch`
- **THEN** both are discovered via broad scan and included (if `when` conditions match)
- **AND** filename is not a factor in discovery

## REMOVED Requirements

### Requirement: workflow create task discovery (DELTA)

**Reason**: The original requirement described filename-based matching with broad-scan fallback. Replaced by uniform broad-scan resolution in the `uniform-task-resolution` spec.
**Migration**: All task files must add `when: steps: [<step>]` to frontmatter. No CLI command changes needed.
