## 1. Schema & Validation

- [ ] 1.1 Extend `design-tokens.schema.yml` to validate `$extensions.responsive` — object with string values under `$extensions`
- [ ] 1.2 Verify schema validates a token file with `breakpoints`, `fontSize`, and `$extensions.responsive` entries

## 2. Token Skill: Intake

- [ ] 2.1 Add breakpoint step to `designbook-tokens/tasks/intake.md` — ask about viewport breakpoints with Tailwind defaults (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
- [ ] 2.2 Add fontSize step to `designbook-tokens/tasks/intake.md` — present default type scale (h1–caption) with responsive lg overrides for headings
- [ ] 2.3 Add shadow, radius, and grid steps to `designbook-tokens/tasks/intake.md` (currently missing from intake)

## 3. Token Skill: Create Tokens

- [ ] 3.1 Add `breakpoints` as required group in `designbook-tokens/tasks/create-tokens.md` with format documentation
- [ ] 3.2 Add `fontSize` as required group in `designbook-tokens/tasks/create-tokens.md` with responsive format example
- [ ] 3.3 Document `$extensions.responsive` format in `create-tokens.md` — breakpoint key → dimension value map
- [ ] 3.4 Add `shadow`, `radius`, `grid` as optional groups in `create-tokens.md` (document existing token patterns)
- [ ] 3.5 Update `designbook-tokens/SKILL.md` token structure to include `$extensions` field

## 4. CSS Generation: Responsive JSONata Logic

- [ ] 4.1 Update `designbook-css-tailwind/tasks/generate-jsonata.md` to document responsive generation pattern (`:root` + `@media` for responsive, `@theme` for static)
- [ ] 4.2 Create `generate-fontSize.jsonata` — reads `fontSize` + `breakpoints` groups, outputs `font-size.src.css` with `@theme` for static and `:root`/`@media` for responsive tokens
- [ ] 4.3 Update existing JSONata expressions (`generate-grid.jsonata`, `generate-layout-spacing.jsonata`) to handle optional `$extensions.responsive` on their tokens

## 5. Test Integration

- [ ] 5.1 Add `breakpoints` group to test-integration-drupal `design-tokens.yml` (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
- [ ] 5.2 Add `fontSize` group to test-integration-drupal `design-tokens.yml` with responsive headings (h1–caption, lg overrides on h1–title)
- [ ] 5.3 Add `$extensions.responsive` to existing `grid.gap-md` and `layout-spacing.md` tokens as examples
- [ ] 5.4 Run CSS generation pipeline and verify output: `font-size.src.css` with correct `:root`/`@media` blocks
- [ ] 5.5 Add `font-size.src.css` import to `app.src.css`
