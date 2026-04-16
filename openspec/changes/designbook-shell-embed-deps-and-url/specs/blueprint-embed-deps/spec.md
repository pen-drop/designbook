## ADDED Requirements

### Requirement: Blueprints declare embed dependencies via `embeds:` frontmatter

Blueprint files MAY include an `embeds:` array in their YAML frontmatter listing component names that the blueprint's template uses via `{% embed %}`. Each entry SHALL be a plain component name (not namespaced).

```yaml
---
type: component
name: header
embeds:
  - container
when:
  steps: [design-shell:intake]
---
```

#### Scenario: Blueprint with single embed dependency
- **WHEN** a blueprint `header.md` has `embeds: [container]`
- **THEN** the frontmatter is valid and the `embeds` field contains `["container"]`

#### Scenario: Blueprint with no embed dependencies
- **WHEN** a blueprint `button.md` has no `embeds:` field
- **THEN** the blueprint is valid and `embeds` defaults to an empty array

#### Scenario: Blueprint with multiple embed dependencies
- **WHEN** a blueprint `section.md` has `embeds: [container, grid]`
- **THEN** the frontmatter is valid and the `embeds` field contains `["container", "grid"]`

### Requirement: Intake resolves embed dependencies from loaded blueprints

The intake task SHALL resolve embed dependencies after proposing visible components:
1. For each proposed component, find the matching loaded blueprint
2. Collect all `embeds:` entries from those blueprints
3. Add any missing embedded components to the component plan
4. Repeat until no new dependencies are found (one iteration is sufficient for non-transitive cases)

#### Scenario: Container auto-added via header and footer embeds
- **WHEN** intake proposes `[page, header, footer, navigation]` and `header.md` has `embeds: [container]` and `footer.md` has `embeds: [container]`
- **THEN** the final component list includes `container` even though it was not in the initial proposal

#### Scenario: No new dependencies when all embeds already proposed
- **WHEN** intake proposes `[page, header, footer, container]` and `header.md` has `embeds: [container]`
- **THEN** the component list remains unchanged (container was already proposed)

### Requirement: Intake sorts components by embed dependency order

The intake task SHALL sort the component list so that embedded components are built before their embedders. Components with no `embeds:` dependencies come first.

#### Scenario: Container built before header and footer
- **WHEN** the component plan is `[page, header, footer, container, navigation]` and header/footer embed container
- **THEN** the sorted build order places container before header and footer (e.g., `[container, navigation, header, footer, page]`)

#### Scenario: Components with no dependencies maintain relative order
- **WHEN** multiple components have no `embeds:` dependencies
- **THEN** their relative order is preserved from the original proposal
