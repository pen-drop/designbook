## ADDED Requirements

### Requirement: Screenshots stored per scene per breakpoint in directory structure

Visual artifacts SHALL be stored in a structured directory under the scenes file's parent directory.

#### Scenario: Section scene screenshots
- **WHEN** the screenshot task captures screenshots for scene "product-detail" in section "galerie"
- **THEN** screenshots are stored at:
  ```
  sections/galerie/screenshots/product-detail/
    desktop.png
    sm.png
    md.png
  ```

#### Scenario: Design system scene screenshots
- **WHEN** the screenshot task captures screenshots for scene "shell" in design-system
- **THEN** screenshots are stored at:
  ```
  design-system/screenshots/shell/
    desktop.png
    sm.png
  ```

### Requirement: References stored in reference subdirectory

Reference images resolved by the resolve-reference task SHALL be stored in a `reference/` subdirectory alongside screenshots.

#### Scenario: Stitch references per breakpoint
- **WHEN** the resolve-reference task resolves references for scene "product-detail"
- **THEN** references are stored at:
  ```
  sections/galerie/screenshots/product-detail/reference/
    desktop.png
    sm.png
  ```

### Requirement: Visual-compare report stored as report.md

The visual-compare task SHALL write its report as `report.md` in the scene's screenshot directory.

#### Scenario: Report written
- **WHEN** the visual-compare task completes for scene "product-detail"
- **THEN** the report is written to:
  ```
  sections/galerie/screenshots/product-detail/report.md
  ```

### Requirement: Screenshot directories are gitignored

Screenshot directories SHALL be gitignored since they are generated artifacts.

#### Scenario: Gitignore pattern
- **WHEN** the project has a `.gitignore`
- **THEN** it includes `**/screenshots/` or equivalent pattern to exclude generated screenshots
