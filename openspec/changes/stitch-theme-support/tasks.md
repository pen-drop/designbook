## 1. Stitch Token Intake — Theme Selection

- [ ] 1.1 Add theme selection step to `stitch-tokens.md` rule: after default DS import, ask "Import additional Stitch design systems as themes?" and "Mark any theme as dark mode?"
- [ ] 1.2 Implement delta computation: compare each `semantic.color.*` token between default and theme DS, exclude identical values (RGB distance < 8), produce delta object
- [ ] 1.3 Implement additional theme import: list available design systems via `list_design_systems`, let user select, compute delta against default for each
- [ ] 1.4 Write theme files: create `$DESIGNBOOK_DATA/design-system/themes/<name>.yml` with only the `semantic.color` deltas (W3C format, resolved hex values, no references). If marked as dark mode, add `$extensions.darkMode: true` metadata.

## 2. CSS Generation — Theme Override Files

- [ ] 2.1 Extend `generate-jsonata` task to scan `themes/*.yml` directory and generate a JSONata template per theme file
- [ ] 2.2 Implement theme CSS wrapper: output `@layer theme { [data-theme="<name>"] { --color-*: values } }` instead of `@theme`
- [ ] 2.3 Implement dark mode selector: if theme file has `$extensions.darkMode: true`, additionally wrap with `@layer theme { @media (prefers-color-scheme: dark) { :root { --color-*: values } } }`
- [ ] 2.4 Extend `generate-jsonata` index.src.css generation to include `@import` statements for `color.theme-*.src.css` files after the default `color.src.css`

## 3. Verification

- [ ] 3.1 Run `./scripts/setup-workspace.sh drupal` from repo root, then `pnpm run dev` inside the workspace to verify theme CSS files are generated and loaded correctly
