# Onboarding Documentation

## Purpose
Define requirements for distributing and exposing onboarding documentation within the Designbook ecosystem.

## Requirements

### Requirement: Documentation Distribution
The addon SHALL include the onboarding documentation files (`onboarding/*.mdx`) in its package distribution.

#### Scenario: Package Content
- **WHEN** the package is built and packed
- **THEN** the `dist/onboarding` (or equivalent) directory contains the MDX files

### Requirement: Documentation Exposure
The addon SHALL provide a way for consumers to locate the documentation files for configuration.

#### Scenario: Locating Docs
- **WHEN** a consumer configures their Storybook `main.js`
- **THEN** they can reference the addon's documentation files via a stable path (e.g., `node_modules/storybook-addon-designbook/dist/onboarding/*.mdx`)
