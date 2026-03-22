## ADDED Requirements

### Requirement: Design Guidelines Tab in Design System UI
The `DeboDesignSystemPage` component SHALL include a "Guidelines" tab as the first entry in its `TabsView`, before "Tokens". The tab SHALL follow the existing pattern: a `GuidelinesTab` function component wrapping `DeboSection`, plus a new `DeboDesignGuidelines` display component in `src/components/display/`.

`DeboSection` props for the Guidelines tab:
- `dataPath="design-system/guidelines.yml"`
- `command="/debo-design-guideline"`
- `emptyMessage="No design guidelines yet"`

`DeboDesignGuidelines` receives the parsed `guidelines.yml` data and renders:
- **References** — clickable links with labels, icon indicating figma vs url type
- **Design file** — prominent link with type badge
- **Principles** — bulleted list
- **Component patterns** — bulleted list
- **Naming** — convention badge + example chips
- **MCP** — server name + URL
- **Skills** — list of skill names as badges

All styled components SHALL use `styled` from `storybook/theming` (same as `DeboDesignTokens`). No Tailwind or external CSS classes.

#### Scenario: Guidelines tab is first in TabsView
- **WHEN** `DeboDesignSystemPage` renders
- **THEN** the tabs array starts with `{ id: 'guidelines', title: 'Guidelines', children: () => <GuidelinesTab /> }`
- **AND** the Tokens tab follows at index 1

#### Scenario: Guidelines content rendered
- **WHEN** `design-system/guidelines.yml` exists and the Guidelines tab is active
- **THEN** `DeboSection` parses the YAML and passes data to `DeboDesignGuidelines`
- **AND** all present sections (references, principles, naming, etc.) are rendered

#### Scenario: Guidelines tab empty state
- **WHEN** `design-system/guidelines.yml` does not exist
- **THEN** `DeboSection` renders `DeboEmptyState` with message "No design guidelines yet" and command "/debo-design-guideline"

#### Scenario: References and design file are clickable
- **WHEN** `references` or `design_file` entries are displayed
- **THEN** each renders as an anchor tag with `target="_blank"` and `rel="noopener noreferrer"`

#### Scenario: Optional sections absent
- **WHEN** `guidelines.yml` contains only `naming`
- **THEN** only the Naming section renders — no empty sections are shown
