## ADDED Requirements

### Requirement: Screenshots stored per storyId per breakpoint

Visual artifacts SHALL be stored in `designbook/screenshots/{storyId}/` with `storybook/` and `reference/` subdirectories, as defined in the visual-diff-integration change (Decision 9).

#### Scenario: Scene screenshots
- **WHEN** the screenshot task captures screenshots for a scene with storyId `designbook-design-system--shell`
- **THEN** screenshots are stored at:
  ```
  designbook/screenshots/designbook-design-system--shell/
    storybook/
      default.png
      sm.png
      xl.png
  ```

#### Scenario: Reference images
- **WHEN** the resolve-reference task resolves references for the same scene
- **THEN** references are stored at:
  ```
  designbook/screenshots/designbook-design-system--shell/
    reference/
      default.png
      sm.png
  ```

### Requirement: Visual-compare report stored as report.md

The visual-compare task SHALL write its report as `report.md` in the scene's screenshot directory.

#### Scenario: Report written
- **WHEN** the visual-compare task completes for storyId `designbook-design-system--shell`
- **THEN** the report is written to:
  ```
  designbook/screenshots/designbook-design-system--shell/report.md
  ```

### Requirement: Screenshot directories are gitignored

The `designbook/screenshots/` directory SHALL be gitignored since it contains generated artifacts.

#### Scenario: Gitignore pattern
- **WHEN** the project has a `.gitignore`
- **THEN** it includes `designbook/screenshots/` to exclude generated screenshots
