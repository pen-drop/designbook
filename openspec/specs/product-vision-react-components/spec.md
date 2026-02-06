## ADDED Requirements

### Requirement: React Component Library Structure
The system SHALL provide a React component library in `.storybook/source/components/` containing reusable UI components for the product vision workflow.

#### Scenario: Component directory exists
- **WHEN** the system is set up
- **THEN** the directory `.storybook/source/components/` exists
- **AND** components are organized for easy import in MDX files

#### Scenario: Component imports in MDX
- **WHEN** an MDX file imports a component from `.storybook/source/components/`
- **THEN** the import resolves correctly
- **AND** the component can be used in the MDX file

### Requirement: Independent Vite Configuration
The system SHALL provide a separate Vite configuration file at `.storybook/source/vite.config.js` that is independent from Storybook's main configuration.

#### Scenario: Vite config exists independently
- **WHEN** the system is set up
- **THEN** a Vite configuration file exists at `.storybook/source/vite.config.js`
- **AND** it is separate from Storybook's main configuration at `.storybook/main.js`

#### Scenario: Vite config is independent
- **WHEN** the Vite configuration is used for building React components
- **THEN** it operates independently from Storybook's build process
- **AND** changes to Storybook's main configuration do not affect the source Vite config

#### Scenario: Vite config supports React
- **WHEN** React components are built or processed
- **THEN** the Vite configuration supports React and JSX/TSX files
- **AND** it includes necessary plugins and settings for React component development

### Requirement: ProductForm Component (Available, Not Used in MDX)
The system SHALL provide a ProductForm React component that captures product vision information. **Note:** This component is available in the library but is NOT used in the Storybook MDX page. Product vision data input happens exclusively via the `/product-vision` AI command.

#### Scenario: Form renders with all fields
- **WHEN** ProductForm component is rendered
- **THEN** it displays input fields for product name, description, problems/solutions, and key features
- **AND** form fields are properly labeled and accessible

#### Scenario: Form submission
- **WHEN** user completes and submits the form
- **THEN** the component calls an onSubmit callback with form data
- **AND** form data includes all captured product vision information

### Requirement: StepIndicator Component (Available, Not Used in MDX)
The system SHALL provide a StepIndicator React component that displays the current step in a multi-step workflow. **Note:** This component is available in the library but is NOT used in the Storybook MDX page. The multi-step workflow runs in the AI command, not in Storybook.

#### Scenario: Step indicator displays current step
- **WHEN** StepIndicator component is rendered with step number and status
- **THEN** it displays the current step number and title
- **AND** it visually indicates which step is active

#### Scenario: Step indicator shows progress
- **WHEN** multiple steps are provided to StepIndicator
- **THEN** it displays all steps with their status (completed, current, upcoming)
- **AND** completed steps are visually distinct from current and upcoming steps

### Requirement: ProductOverviewCard Component (Primary Display Component)
The system SHALL provide a ProductOverviewCard React component that displays a summary of the defined product vision including name, description, problems/solutions, and key features. The component SHALL be composed from `DeboCard` and `DeboCollapsible` shared base components instead of inline card/collapsible implementations.

#### Scenario: Card displays product information
- **WHEN** ProductOverviewCard is rendered with product data
- **THEN** it wraps content in a `DeboCard` component with the product name as title
- **AND** it shows the product description

#### Scenario: Card shows problems and solutions
- **WHEN** ProductOverviewCard receives problems/solutions data
- **THEN** it displays problems and solutions inside a `DeboCollapsible` component
- **AND** the `DeboCollapsible` shows the count of problems as a badge
- **AND** users can expand/collapse the problems section

#### Scenario: Card shows key features
- **WHEN** ProductOverviewCard receives key features data
- **THEN** it displays the list of key features inside a `DeboCollapsible` component
- **AND** the `DeboCollapsible` shows the count of features as a badge
- **AND** features are presented in a clear, scannable format

#### Scenario: Component is significantly smaller after refactoring
- **WHEN** the refactored `ProductOverviewCard` is compared to the original
- **THEN** it uses `DeboCard` and `DeboCollapsible` instead of inline card/toggle implementations
- **AND** the component source code is reduced from ~130 lines to ~30 lines

### Requirement: Component Props-Based Design
All React components SHALL accept data via props and SHALL NOT import data directly from files or external sources.

#### Scenario: Component receives data via props
- **WHEN** a component is used in an MDX file
- **THEN** all data is passed through props
- **AND** the component does not perform direct data imports

#### Scenario: Component is reusable
- **WHEN** the same component is used with different prop values
- **THEN** it renders correctly with each set of props
- **AND** component state does not leak between instances

### Requirement: Storybook MDX Compatibility
All React components SHALL be compatible with Storybook's MDX rendering context and SHALL work within Storybook's theme system.

#### Scenario: Component renders in MDX
- **WHEN** a component is imported and used in an MDX file
- **THEN** it renders without errors in Storybook
- **AND** it integrates with Storybook's styling and theme system

#### Scenario: Component supports themes
- **WHEN** Storybook theme changes
- **THEN** components adapt to the new theme
- **AND** all UI elements remain visible and accessible

### Requirement: CSS Isolation via Tailwind Prefix
All React components in `.storybook/source/` SHALL use Tailwind CSS with the `debo:` prefix (short for Designbook) to prevent CSS class collisions with the original Storybook/Drupal components. The CSS entry point SHALL use `@import "tailwindcss" prefix(debo)`.

#### Scenario: React components use prefixed Tailwind classes
- **WHEN** React components are styled
- **THEN** they use `debo:` prefixed Tailwind utility classes (e.g., `debo:bg-blue-500`, `debo:flex`, `debo:p-4`)
- **AND** no unprefixed Tailwind classes are used in React components

#### Scenario: No CSS leakage from Drupal components to React components
- **WHEN** both Drupal/Twig components and React components are rendered in Storybook
- **THEN** the unprefixed Tailwind classes from Drupal components do not affect React component styling
- **AND** the prefixed `debo:` classes from React components do not affect Drupal component styling

#### Scenario: Prefixed Tailwind supports dark mode
- **WHEN** dark theme is active
- **THEN** React components use `debo:dark:` variant classes (e.g., `debo:dark:bg-gray-800`)
- **AND** dark mode styles are correctly applied without interfering with Drupal dark mode styles

#### Scenario: CSS entry point configuration
- **WHEN** the CSS for React components is configured at `.storybook/source/`
- **THEN** it imports Tailwind with prefix: `@import "tailwindcss" prefix(debo)`
- **AND** DaisyUI classes are also scoped under the `debo:` prefix

### Requirement: Design System Integration
All React components SHALL use Tailwind CSS (with `debo:` prefix) and DaisyUI classes consistent with the project's design system, supporting both light and dark themes.

#### Scenario: Components use prefixed Tailwind classes
- **WHEN** components are styled
- **THEN** they use `debo:` prefixed Tailwind CSS utility classes
- **AND** they follow the project's Tailwind configuration

#### Scenario: Components support dark mode
- **WHEN** dark theme is active
- **THEN** components use appropriate prefixed dark mode variants (e.g., `debo:dark:` classes)
- **AND** all text and UI elements are readable in dark mode

#### Scenario: Components use DaisyUI
- **WHEN** components need UI elements (cards, buttons, etc.)
- **THEN** they use DaisyUI components and classes where appropriate
- **AND** they maintain consistency with the project's DaisyUI v5 setup
