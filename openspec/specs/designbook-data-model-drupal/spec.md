# Designbook Data Model Drupal Spec

## Overview
This specification defines the `designbook-drupal/data-model/` skill, which serves as a best-practice guide for creating Drupal-compatible data models within Designbook.

## Goals
- Provide clear guidelines for mapping generic Designbook data models to Drupal entity structures.
- Define naming conventions for Drupal fields to ensure compatibility.
- Integrate with the `debo-data-model` workflow as a reference resource when `DESIGNBOOK_TECHNOLOGY` is set to `drupal`.

## Requirements

### Skill Definition
- **Type**: Documentation / Reference Skill + Entity Type Schemas
- **Name**: `designbook-drupal/data-model/`
- **Description**: Guidelines and structured schemas for creating Drupal-compatible data models.

#### Scenario: Entity type schemas are part of the skill
- **WHEN** the designbook-drupal skill is loaded
- **THEN** entity type schema files at `entity-types/*.md` are available for the intake task to read

### Requirement: Content Guidelines
The skill documentation SHALL cover:
1. **Entity Mapping**: content → node, assets → media, categories → taxonomy_term, reusable blocks → block_content (layout_builder), canvas pages → canvas_page (canvas extension)
2. **Field Naming**: base fields no prefix, custom fields must use `field_` prefix
3. **Entity Type Schemas**: structured markdown files per entity type in `entity-types/` defining base fields and required status
4. **Bundle Purpose**: bundles may declare `purpose` to communicate semantic intent; extension rules respond to known purpose values to set view_modes templates and guide sample data generation

#### Scenario: Skill covers all supported entity types
- **WHEN** the skill is read during intake
- **THEN** it provides entity type schemas for node, media, taxonomy_term, block_content, canvas_page, and view

#### Scenario: Bundle purpose documented in skill
- **WHEN** the skill is read during intake
- **THEN** it documents that `purpose: landing-page` is the known purpose for bundles rendered by layout-builder or canvas

### Workflow Integration
- The `debo-data-model` workflow must be updated to:
    -   Check for `DESIGNBOOK_TECHNOLOGY=drupal`.
    -   If true, instruct the agent/user to **READ** the `designbook-drupal/data-model/` skill.
    -   Apply the guidelines manually during the data model creation step.
    -   **NO** automated scripts should be executed for this transformation.

## Constraints
- The skill should NOT contain executable code or scripts for data transformation.
- The standard `designbook-data-model` skill remains responsible for validation and saving.
