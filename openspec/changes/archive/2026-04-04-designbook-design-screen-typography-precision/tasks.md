## 1. Typography Scale Token Schema

- [x] 1.1 Update `designbook/tokens/tasks/intake--tokens.md` Step 3 to declare that font sizes are required — no concrete role names or examples. The task only states that a typography scale with font sizes, weights, and line heights SHALL be collected. Concrete values come from the design reference at runtime.
- [x] 1.2 Update `designbook/tokens/tasks/intake--tokens.md` Step 5 to remove type scale from the "optional" list (it is now standard in Step 3)

## 2. CSS Mapping for Typography Scale

- [x] 2.1 Add primitive font-size tokens to `designbook-css-tailwind/blueprints/css-mapping.md` — Tailwind text sizes (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, etc.) as primitive tokens under `primitive.typography` with `prefix: text`, analogous to `primitive.color`
- [x] 2.2 Add semantic typography-scale group to `designbook-css-tailwind/blueprints/css-mapping.md` — maps `semantic.typography-scale` roles to semantic tokens that reference primitive text sizes (analogous to `semantic.color` referencing `primitive.color`)
- [x] 2.3 Update `designbook-css-tailwind/blueprints/jsonata-template.md` to handle composite typography expansion — expand `$type: typography` tokens into `--text-<role>` (fontSize), `--text-<role>--weight` (fontWeight), `--text-<role>--line-height` (lineHeight); skip fontFamily sub-value

## 3. Google Fonts Download Task

- [x] 3.1 Create `designbook/css-generate/fonts/google/tasks/download-fonts.md` with `when: extensions: google-fonts` — a dedicated task that downloads Google Fonts CSS. Reads fontFamily tokens from `semantic.typography`, derives weights from `semantic.typography-scale`, fetches the CSS from the Google Fonts API, and saves it as `css/tokens/google-fonts.src.css`
- [x] 3.2 Create any necessary rules under `designbook/css-generate/fonts/google/rules/` with `when: extensions: google-fonts` (e.g., weight derivation, URL construction)
- [x] 3.3 The download-fonts task SHALL run BEFORE other generate-css tasks — the downloaded CSS must appear first in the cascade so fonts are available when `@theme` blocks reference them
- [x] 3.4 Font weights in the Google Fonts URL SHALL be derived from `semantic.typography-scale` tokens; default to `wght@400;500;600;700` if no scale exists
- [x] 3.5 Add the download-fonts step to the css-generate workflow definition so it runs as a separate step before the standard `generate-css` step

## 4. Component Typography Rule

- [x] 4.1 Create `designbook/design/rules/typography-tokens.md` with `when: steps: [create-component]` — enforce that components use `var(--text-*)` or Tailwind `text-*` utilities from the typography scale instead of arbitrary size classes
- [x] 4.2 Add the rule to the `create-component` step loading so it is discovered alongside `guidelines-context.md`

## 5. Verification

- [x] 5.1 Run `./scripts/setup-workspace.sh drupal` from the repo root to rebuild the test workspace with updated skills
- [x] 5.2 Run tokens workflow in the test workspace and define a typography scale
- [x] 5.3 Run `css-generate` and verify that `google-fonts.src.css` is generated FIRST, then `typography-scale.src.css` with correct CSS custom properties
