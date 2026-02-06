## 1. DataModelCard Display Component

- [x] 1.1 Create `DataModelCard` component at `.storybook/source/components/DataModelCard.jsx` composed from `DeboCard` and `DeboCollapsible`
- [x] 1.2 Entities section: `DeboCollapsible` with count badge, responsive 2-column grid of entity cards (name + description)
- [x] 1.3 Relationships section: `DeboCollapsible` with count badge, bullet-point list of relationship strings

## 2. Update Barrel Exports

- [x] 2.1 Add `DataModelCard` export to `.storybook/source/components/index.js`

## 3. Data Model MDX Page

- [x] 3.1 Create `.storybook/onboarding/data-model.mdx` with `<Meta title="Data Model" />`
- [x] 3.2 Add `parseDataModel` parser function that extracts `{ entities: [{ name, description }], relationships: string[] }` from the `## Entities` / `### EntityName` / `## Relationships` format
- [x] 3.3 Use `DeboSection` with `dataPath="data-model/data-model.md"`, `parser={parseDataModel}`, `command="/data-model"`, and `renderContent` using `DataModelCard`

## 4. AI Command for Data Model

- [x] 4.1 Create `/data-model` AI command at `.cursor/commands/data-model.md`
- [x] 4.2 AI command reads `designbook/product/product-overview.md` and `designbook/product/product-roadmap.md` for context
- [x] 4.3 AI command proposes entities and relationships based on product context, iterates with user
- [x] 4.4 AI command saves to `designbook/data-model/data-model.md` in the Design OS markdown format
- [x] 4.5 AI command handles missing product vision (suggests running `/product-vision` first)

## 5. Validation

- [x] 5.1 Verify data-model.mdx page appears as "Data Model" in Storybook sidebar
- [x] 5.2 Verify empty state renders with `/data-model` command reference
- [x] 5.3 Create test data model file and verify `DataModelCard` renders entities grid + relationships list
