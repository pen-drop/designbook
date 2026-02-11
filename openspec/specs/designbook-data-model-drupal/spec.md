# Designbook Data Model Drupal Spec

## Overview
This specification defines the `designbook-data-model-drupal` skill, which serves as a best-practice guide for creating Drupal-compatible data models within Designbook.

## Goals
- Provide clear guidelines for mapping generic Designbook data models to Drupal entity structures.
- Define naming conventions for Drupal fields to ensure compatibility.
- Integrate with the `debo-data-model` workflow as a reference resource when `DESIGNBOOK_TECHNOLOGY` is set to `drupal`.

## Requirements

### Skill Definition
- **Type**: Documentation / Reference Skill
- **Name**: `designbook-data-model-drupal`
- **Description**: Guidelines for creating Drupal-compatible data models.

### Content Guidelines
The skill documentation (`SKILL.md`) must cover:
1.  **Entity Mapping**:
    -   `content` -> `node` entity type.
    -   `assets` -> `media` entity type.
2.  **Field Naming**:
    -   **Base Fields**: Must NOT be prefixed (e.g., `title`, `body`, `uid`, `status`, `created`, `changed`, `path`, `langcode`).
    -   **Configurable Fields**: Must be prefixed with `field_` (e.g., `field_subtitle`, `field_image`).

### Workflow Integration
- The `debo-data-model` workflow must be updated to:
    -   Check for `DESIGNBOOK_TECHNOLOGY=drupal`.
    -   If true, instruct the agent/user to **READ** the `designbook-data-model-drupal` skill.
    -   Apply the guidelines manually during the data model creation step.
    -   **NO** automated scripts should be executed for this transformation.

## Constraints
- The skill should NOT contain executable code or scripts for data transformation.
- The standard `designbook-data-model` skill remains responsible for validation and saving.
