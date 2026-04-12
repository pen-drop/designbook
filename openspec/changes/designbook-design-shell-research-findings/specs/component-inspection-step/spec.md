## ADDED Requirements

### Requirement: Create-component task reads existing components before generating

The `create-component` task MUST read all existing component files relevant to the new component (including dependencies declared in the component params) before generating any output. This inspection phase ensures the generated component references correct slot names, prop shapes, and include paths for components that already exist.

#### Scenario: Create-component checks that a dependency component exists

- **WHEN** the component params reference a dependency component (e.g., `container`) that should already be present in the file system
- **THEN** the `create-component` task reads the existing component's `.component.yml` and Twig template before generating the new component, and uses the discovered slot names and prop names in the generated output

#### Scenario: Create-component detects missing dependency

- **WHEN** the component params reference a dependency component that is not yet present in the file system
- **THEN** the `create-component` task reports the missing dependency before generating, rather than silently producing an include that will fail at render time

---

### Requirement: Polish task inspects generated files and checks Storybook rendering before applying fixes

The `polish` task MUST perform an inspection phase before applying any code fix. The inspection phase SHALL:

1. Read all generated component files (Twig template, `.component.yml`, story YAML, and scene YAML) from the file system
2. Open the Storybook URL for the component's story and verify that the component renders visually

Only after completing this inspection phase SHALL the task apply code changes.

#### Scenario: Polish reads files before fixing

- **WHEN** the polish task is invoked for a component that has already been generated
- **THEN** it reads the current Twig template and `.component.yml` from disk before producing any edits, ensuring fixes are based on the actual file state rather than a prior mental model

#### Scenario: Polish checks Storybook rendering before fixing

- **WHEN** the polish task opens the Storybook URL for the story
- **THEN** it visually verifies the current render state (e.g., confirms whether slot content appears, whether layout is correct) and uses this information to determine which fixes are needed

#### Scenario: Polish skips fix when rendering is already correct

- **WHEN** the polish task inspects the Storybook render and finds the component renders correctly with no visible issues
- **THEN** it marks itself done without applying any code changes

---

### Requirement: Both create-component and polish tasks open the Storybook URL to verify visual output

The `create-component` task and the `polish` task MUST both open the Storybook URL for the relevant story and verify the visual output as part of their execution. This visual check SHALL occur after all file writes are complete, confirming that slot content is rendered and the component layout matches expectations.

#### Scenario: Create-component verifies visual output after generation

- **WHEN** the `create-component` task finishes writing all component files
- **THEN** it opens the Storybook story URL and confirms that the component renders without errors and that named slots display content

#### Scenario: Polish verifies visual output after applying a fix

- **WHEN** the polish task has applied a code fix to a component
- **THEN** it opens the Storybook story URL and confirms that the previously identified rendering issue is no longer present
