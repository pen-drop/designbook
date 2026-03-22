## MODIFIED Requirements

### Requirement: Dashboard displays Design System StatusBox
The dashboard SHALL display a StatusBox for "Design System" with badges for: `design-system/guidelines.yml` and `design-system/design-tokens.yml`. The `guidelines` badge SHALL appear before the `tokens` badge.

#### Scenario: Both guidelines and tokens exist
- **WHEN** both `design-system/guidelines.yml` and `design-system/design-tokens.yml` exist
- **THEN** the StatusBox shows two green badges: "guidelines" and "tokens"

#### Scenario: Guidelines missing
- **WHEN** `design-system/guidelines.yml` does not exist
- **THEN** the badge shows gray "guidelines" with hint "Run /debo-design-guideline"

#### Scenario: Design tokens missing
- **WHEN** `design-system/design-tokens.yml` does not exist
- **THEN** the badge shows gray "tokens" with hint "Run /debo-design-tokens"

#### Scenario: All files present
- **WHEN** both files exist
- **THEN** both badges are green, no hint is shown
