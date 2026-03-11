## 1. Create `designbook-css-tailwind` skill

- [x] Create `.agent/skills/designbook-css-tailwind/SKILL.md` with:
  - Token Naming Conventions for `container`, `spacing`, `section-spacing`
  - CSS generation rules using `@theme inline` format
  - Group-to-file mapping table (container → `container.src.css`, spacing → `spacing.src.css`, section-spacing → `section-spacing.src.css`)
- [x] Add example token structures for each group (container: sm/md/lg/xl, spacing: xs–2xl, section-spacing: sm/md/lg)

## 2. Update `designbook-css-daisyui` skill

- [x] Add prerequisite: "Load `@designbook-css-tailwind` first"
- [x] Remove § Spacing Token Names section (moved to tailwind skill)
- [x] Keep § Radius Token Names (DaisyUI-specific `--radius-*`)
- [x] Update § Generate Expression Files to note that spacing generation is handled by the tailwind skill

## 3. Update `debo-design-tokens` workflow

- [x] Add new Step after Typography: "Choose Container Widths" — suggest standard sizes, ask user customization
- [x] Add new Step: "Choose Section Spacing" — suggest vertical rhythm scale (sm/md/lg)
- [x] Update Step 7 (Save Tokens) to include `container` and `section-spacing` groups in the output structure
- [x] Update Step 8 (Confirm) to show the new token groups in the summary

## 4. Update layout-reference.md

- [x] Document that `container-md` resolves to `--container-md` from the `container` token group
- [x] Document that `pb-auto`/`pt-auto` maps to default section-spacing token
- [x] Document that `gap-md` resolves to `--spacing-md` from the `spacing` token group
