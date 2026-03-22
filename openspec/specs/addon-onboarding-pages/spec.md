# addon-onboarding-pages Specification

## Purpose
Defines the Storybook onboarding display pages — read-only MDX pages that display workflow outputs via `DeboSection`. All data entry happens exclusively via AI commands, not in Storybook.

---

## Requirement: DeboSection pattern for all onboarding pages

All onboarding pages SHALL use `DeboSection` with `dataPath`, `parser`, `renderContent`, `command`, and `emptyMessage` props. No inline `useState`, `useEffect`, or `fetch` logic in MDX files.

### Scenario: Empty state
- **WHEN** the file at `dataPath` does not exist (404)
- **THEN** `DeboSection` renders `DeboEmptyState` referencing the AI command

### Scenario: Reload
- **WHEN** data is displayed
- **THEN** a reload button refetches from the Vite middleware without page navigation

---

## Requirement: Vite middleware loads designbook files

`GET /__designbook/load?path=<path>` serves files from `designbook/`. Returns 404 when not found.

---

## Requirement: Per-page data paths and commands

| Page | MDX path | dataPath | AI command | Display component |
|------|----------|----------|------------|-------------------|
| Product Vision | `.storybook/onboarding/product-vision.mdx` | `product/vision.md` | `/debo-vision` | `ProductOverviewCard` |
| Product Roadmap | (section on product-vision page) | `product/product-roadmap.md` | `/product-roadmap` | `DeboNumberedList` |
| Data Model | `.storybook/onboarding/data-model.mdx` | `data-model.yml` | `/debo-data-model` | `DeboDataModelCard` |
| Design Shell | `.storybook/onboarding/design-shell.mdx` | `design-system/design-system.scenes.yml` | `/debo-design-shell` | `ShellSpecCard` |
| Design Tokens | (DeboDesignSystemPage Tokens tab) | `design-system/design-tokens.yml` | `/debo-design-tokens` | `DesignTokensCard` |

### Scenario: Product Vision page contains roadmap section
- **WHEN** user opens `product-vision.mdx`
- **THEN** product vision section appears first, roadmap section below — each loads data independently

---

## Requirement: Design tokens workflow — interview + skill delegation

The `debo-design-tokens` workflow interviews the user for token values (colors, typography) and delegates to `designbook-tokens` skill for validation and storage. The skill is the sole authority for saving `designbook/design-tokens.json` (W3C format).

### Scenario: Skill validates before saving
- **WHEN** the workflow passes collected token data to `designbook-tokens`
- **THEN** schema validation runs before the file is written

---

## Requirement: Design-system workflows declare guidelines dependency

Task files for `debo-design-tokens`, `debo-design-component`, `debo-design-screen`, and `debo-design-shell` SHALL declare `reads: design-system/guidelines.yml` as a required dependency.

### Scenario: Stage blocked without guidelines
- **WHEN** any design-system stage starts and `design-system/guidelines.yml` is missing
- **THEN** the AI stops and tells the user: "❌ `guidelines.yml` not found. Run /debo-design-guideline first."

### Scenario: Naming and principles applied silently
- **WHEN** `guidelines.yml` is present
- **THEN** naming conventions and principles are applied as hard constraints without being mentioned to the user

---

## Requirement: Design Guidelines tab in DeboDesignSystemPage

`DeboDesignSystemPage` SHALL include a "Guidelines" tab as the first entry before "Tokens". Tab uses `DeboSection` with `dataPath="design-system/guidelines.yml"`, renders `DeboDesignGuidelines`.

### Scenario: Guidelines tab is first
- **WHEN** `DeboDesignSystemPage` renders
- **THEN** tabs array starts with `{ id: 'guidelines', title: 'Guidelines', ... }`, Tokens tab at index 1
