## ADDED Requirements

### Requirement: Intake passes design_hint per component item
The intake task SHALL include a `design_hint` field on each component item in the `component` array param when marking the task as done. The `design_hint` contains the structured design extraction data for that specific landmark — rows/sections with background colors and heights, font specifications, and interactive pattern descriptions. This data originates from the `design-reference.md` extraction performed during intake.

#### Scenario: Design reference available
- **WHEN** intake extracts design characteristics from a reference URL
- **THEN** each component item in the `--params` JSON SHALL include a `design_hint` object containing the landmark-specific extraction (styles, fonts, interactive patterns) from `design-reference.md`

#### Scenario: No design reference available
- **WHEN** no reference URL is available and intake relies on vision.md only
- **THEN** each component item SHALL omit the `design_hint` field or set it to `null`

### Requirement: create-component uses design_hint from its own params
The `create-component` task SHALL use the `design_hint` field from its own component item params (passed via `each: component` expansion). The hint is already scoped to the correct landmark — no lookup by component name is needed.

#### Scenario: design_hint present on component item
- **WHEN** the component item params contain a `design_hint` object
- **THEN** the task SHALL use the hint's styles, fonts, and interactive patterns as primary input for template generation, preferring hint values over generic defaults

#### Scenario: design_hint absent on component item
- **WHEN** the component item params do not contain a `design_hint` field
- **THEN** the task SHALL fall back to the component's other params (description, styles, fonts) as before

### Requirement: polish receives component_design_hints
The `polish` task SHALL have access to `component_design_hints` via workflow params. When fixing issues, the task SHALL cross-reference the hints to verify that fixes align with the design reference extraction.

#### Scenario: Polish uses hints for verification
- **WHEN** a polish task fixes a visual deviation (e.g., wrong background color)
- **THEN** the task SHALL check `component_design_hints` for the expected value before applying the fix

## MODIFIED Requirements

### Requirement: Title interpolation handles structured params
The `expandParams` function SHALL handle array and object param values without producing `[object Object]`. For array params where elements contain a `scene` or `storyId` field, the function SHALL extract the first element's `scene` or `storyId` value as the string representation. For other structured values, the function SHALL use `JSON.stringify()` as fallback.

#### Scenario: Array param in title template
- **WHEN** a title template contains `{scene}` and the `scene` param is an array `[{scene: "design-system:shell", storyId: "..."}]`
- **THEN** the interpolated title SHALL contain `design-system:shell` (not `[object Object]`)

#### Scenario: String param in title template
- **WHEN** a title template contains `{storyId}` and the `storyId` param is a string
- **THEN** the interpolated title SHALL contain the string value as before (no behavior change)

#### Scenario: Object param without scene/storyId field
- **WHEN** a title template contains `{param}` and the param is an object without `scene` or `storyId` fields
- **THEN** the interpolated title SHALL contain the JSON stringified representation
