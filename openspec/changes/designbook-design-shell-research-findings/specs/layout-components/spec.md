## MODIFIED Requirements

### Requirement: Container component

The system SHALL provide a `container` component that constrains content width, provides horizontal browser-edge padding (padding-inline), and provides structural framing. Every named slot output in the container Twig template SHALL be wrapped in `{% block <slotname> %}...{% endblock %}` tags to enable `{% embed %}` overrides.

#### Scenario: Container with max-width

- **WHEN** `max_width` prop is set to `md`
- **THEN** the container SHALL render with `max-w-md`, centered content, and `padding-inline` (px) to keep content away from browser edges

#### Scenario: Container with padding

- **WHEN** `padding_top` is set to `lg` and `padding_bottom` is set to `sm`
- **THEN** the container SHALL apply `padding-top: var(--section-spacing-lg)` and `padding-bottom: var(--section-spacing-sm)`

#### Scenario: Container with background

- **WHEN** the `background` slot contains content
- **THEN** the container SHALL render a `.layout-background` div behind the content

#### Scenario: Container with theme

- **WHEN** `theme` prop is set to `dark`
- **THEN** the container SHALL add `data-theme="dark"` to the wrapper

#### Scenario: Container without max-width

- **WHEN** `max_width` prop is `full` or not set
- **THEN** the container SHALL render at full width without max-width constraint

#### Scenario: Container slot overridden via embed

- **WHEN** a consuming template embeds the container and overrides the `content` block
- **THEN** the overriding content is rendered in place of the default slot value

---

### Requirement: Grid component

The system SHALL provide a `grid` component that arranges items in responsive column layouts. Every named slot output in the grid Twig template SHALL be wrapped in `{% block <slotname> %}...{% endblock %}` tags to enable `{% embed %}` overrides.

#### Scenario: Grid with responsive columns

- **WHEN** `columns` prop is set to `3`
- **THEN** the grid SHALL render with `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

#### Scenario: Grid with gap

- **WHEN** `gap` prop is set to `md`
- **THEN** the grid SHALL apply `gap-4` (Tailwind built-in spacing)

#### Scenario: Grid with items

- **WHEN** the `items` slot contains a list of components
- **THEN** each item SHALL be rendered as a grid cell

#### Scenario: Grid standalone

- **WHEN** `grid` is used without a container wrapper
- **THEN** it SHALL render correctly at full parent width

---

### Requirement: Section component (Layout Builder adapter)

The system SHALL provide a `section` component that combines container + grid with 8 fixed column slots for Layout Builder. Every named slot output in the section Twig template SHALL be wrapped in `{% block <slotname> %}...{% endblock %}` tags to enable `{% embed %}` overrides.

#### Scenario: Section delegates to container

- **WHEN** a section has `max_width`, `padding_top`, `padding_bottom`, and `theme` props
- **THEN** it SHALL internally include the `container` component with those values

#### Scenario: Section renders grid from column slots

- **WHEN** `columns` is set to `3` and `column_1`, `column_2`, `column_3` contain content
- **THEN** the section SHALL render those slots as grid items in a 3-column responsive layout

#### Scenario: Section with 8 slots

- **WHEN** a section is used in Layout Builder
- **THEN** it SHALL expose `column_1` through `column_8` as named slots

#### Scenario: Section with background

- **WHEN** the `background` slot contains content
- **THEN** it SHALL be passed through to the internal container component

---

### Requirement: Layout component blueprints use advisory language

Blueprint files for layout components (`container.md`, `grid.md`, `header.md`, `section.md`) SHALL use advisory language (e.g., "recommended", "suggested", "typically", "consider") rather than normative constraint language (e.g., MUST, SHALL, never). Hard constraints on layout component construction are defined exclusively in rule files (`sdc-conventions.md`, `layout-constraints.md`) and are not duplicated in blueprints.

#### Scenario: Blueprint guidance does not duplicate rule constraints

- **WHEN** a developer reads a layout component blueprint
- **THEN** the blueprint provides structural guidance and examples without restating or contradicting constraints from the rules files

#### Scenario: Rule file overrides blueprint advisory guidance

- **WHEN** a blueprint suggests a pattern that a rule file explicitly prohibits
- **THEN** the rule file constraint takes precedence and the blueprint guidance is treated as non-binding

---

## REMOVED Requirements

### Requirement: layout component

**Reason**: Replaced by `container` + `grid` composition
**Migration**: Use `container` for max-width/padding/background; use `grid` for column arrangements; use `section` for Layout Builder

### Requirement: layout_columns component

**Reason**: Replaced by `section` component
**Migration**: Rename `layout_columns` to `section` in all references
