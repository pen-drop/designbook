# Tasks: refactor-config-frameworks

## 1. Update Config Loader
- [x] Update `designbook-configuration/SKILL.md`: map `backend` → `DESIGNBOOK_BACKEND`
- [x] Update `designbook-configuration/SKILL.md`: map `frameworks.component` → `DESIGNBOOK_FRAMEWORK_COMPONENT`
- [x] Update `designbook-configuration/SKILL.md`: map `frameworks.css` → `DESIGNBOOK_FRAMEWORK_CSS`
- [x] Remove old `technology` → `DESIGNBOOK_TECHNOLOGY` mapping
- [x] Remove old `css.framework` → `DESIGNBOOK_CSS_FRAMEWORK` mapping
- [x] Update `designbook-configuration/scripts/set-env.sh` with recursive flatten (frameworks → FRAMEWORK singular)

## 2. Rename Skills (directories + internal refs)
- [x] `designbook-drupal-components-ui` → `designbook-components-sdc`
- [x] `designbook-figma-drupal-components` → `designbook-figma-components-sdc`
- [x] `designbook-figma-drupal-stories` → `designbook-figma-stories-sdc`
- [x] `designbook-figma-drupal-twig` → `designbook-figma-twig-sdc`
- [x] `designbook-drupal-data-model` → `designbook-data-model-drupal`
- [x] Update SKILL.md descriptions in each renamed skill

## 3. Update Remaining Skills (env var refs)
- [x] `designbook-css-generate`: `DESIGNBOOK_CSS_FRAMEWORK` → `DESIGNBOOK_FRAMEWORK_CSS`
- [x] `designbook-css-generate/steps/delegate-framework.md`: all refs
- [x] `designbook-css-generate/steps/execute-transforms.md`: all refs
- [x] `designbook-css-daisyui`: `DESIGNBOOK_CSS_FRAMEWORK` → `DESIGNBOOK_FRAMEWORK_CSS`
- [x] `designbook-data-model-drupal`: `DESIGNBOOK_TECHNOLOGY` → `DESIGNBOOK_BACKEND`
- [x] `designbook-addon-skills`: updated naming convention table + concern-first rule

## 4. Update Workflows (env var + skill name refs)
- [x] `debo-design-screen`: `designbook-$DESIGNBOOK_TECHNOLOGY-components-*` → `designbook-$DESIGNBOOK_FRAMEWORK_COMPONENT-components-*`
- [x] `debo-design-tokens`: `DESIGNBOOK_CSS_FRAMEWORK` → `DESIGNBOOK_FRAMEWORK_CSS`
- [x] `debo-css-generate`: `DESIGNBOOK_CSS_FRAMEWORK` → `DESIGNBOOK_FRAMEWORK_CSS`
- [x] `debo-data-model`: `DESIGNBOOK_TECHNOLOGY` → `DESIGNBOOK_BACKEND`
- [x] `debo-design-shell`: `designbook-drupal-components` → `designbook-components-sdc`
- [x] `debo-design-component`: `designbook-drupal-components` → `designbook-components-sdc`

## 5. Update Promptfoo
- [x] Update all `promptfoo/fixtures/*/designbook.config.yml` to new schema
- [x] Update all `promptfoo/workspaces/*/designbook.config.yml` to new schema

## 6. Verify
- [x] `npm run lint && npx vitest run` — clean
- [x] Grep for remaining `DESIGNBOOK_TECHNOLOGY` / `DESIGNBOOK_CSS_FRAMEWORK` — none found
