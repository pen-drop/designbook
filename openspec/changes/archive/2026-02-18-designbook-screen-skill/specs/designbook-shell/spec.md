## ADDED Requirements

### Requirement: Shell Component Directory Convention

The skill SHALL place shell components under `$DESIGNBOOK_DIST/design/shell/[name]/`. Component files use uniquely prefixed names: `shell_[name]`.

#### Scenario: Header component directory
- **WHEN** the skill generates a header shell component
- **THEN** the files are created at `$DESIGNBOOK_DIST/design/shell/header/shell_header.component.yml`, `shell_header.story.yml`, and `shell_header.twig`

#### Scenario: Footer component directory
- **WHEN** the skill generates a footer shell component
- **THEN** the files are created at `$DESIGNBOOK_DIST/design/shell/footer/shell_footer.component.yml`, `shell_footer.story.yml`, and `shell_footer.twig`

---

### Requirement: Shell Components Are Structural Only

Shell component Twig templates SHALL NOT contain HTML markup. They SHALL only render slot references.

#### Scenario: Header Twig is structural
- **WHEN** the skill generates `shell_header.twig`
- **THEN** the template contains only `{{ navigation }}{{ logo }}{{ user_menu }}` with no HTML elements or CSS classes

---

### Requirement: Shell Component Slots

The header component SHALL define slots for `navigation`, `logo`, and `user_menu`. The footer component SHALL define slots for `footer_nav` and `copyright`.

#### Scenario: Header has navigation slot
- **WHEN** the header component is generated
- **THEN** `shell_header.component.yml` defines a `navigation` slot for menu UI components

#### Scenario: Footer has copyright slot
- **WHEN** the footer component is generated
- **THEN** `shell_footer.component.yml` defines a `copyright` slot

---

### Requirement: Auto-Derive Navigation from Sections

The skill SHALL read all `sections/*.section.yml` files to auto-generate navigation menu items for the header story. Each section's `title` and `id` become a menu item.

#### Scenario: Navigation populated from section files
- **WHEN** three `.section.yml` files exist with titles "News", "Dashboard", "About"
- **THEN** the `shell_header.story.yml` navigation slot references a `main-nav` UI component with 3 menu items

#### Scenario: No section files exist
- **WHEN** no `.section.yml` files are found
- **THEN** the skill generates the header story with an empty navigation slot and warns the user

---

### Requirement: Skip If Already Present

The skill SHALL check if shell components already exist before generating. If present, the skill SHALL skip generation unless a force flag is provided.

#### Scenario: Shell already exists
- **WHEN** `$DESIGNBOOK_DIST/design/shell/header/shell_header.component.yml` already exists
- **AND** no force flag is set
- **THEN** the skill skips header generation and reports "Shell header already exists, skipping"

#### Scenario: Force regeneration
- **WHEN** shell components exist but force flag is set
- **THEN** the skill regenerates all shell components

---

### Requirement: Delegation to designbook-drupal-components

The skill SHALL delegate actual file creation to `designbook-drupal-components`, passing the output directory as `$DESIGNBOOK_DIST/design/shell/[name]/` and the component name as `shell_[name]`.

#### Scenario: Shell files created via delegation
- **WHEN** the skill generates the header
- **THEN** it prepares a component definition and invokes `designbook-drupal-components` with `outputDir` set to `$DESIGNBOOK_DIST/design/shell/header/` and component name `shell_header`
