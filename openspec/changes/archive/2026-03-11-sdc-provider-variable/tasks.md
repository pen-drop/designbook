# Tasks

## 1. Add `$DESIGNBOOK_SDC_PROVIDER` to configuration skill

- [x] Update `set-env.sh` — derive provider from `$DESIGNBOOK_DRUPAL_THEME` basename with `-` → `_`
- [x] Update `load-config.cjs` — N/A (set-env.sh handles derivation, load-config.cjs is a thin wrapper)
- [x] Update `designbook-configuration/SKILL.md` — document new env variable in table

## 2. Update skill resources to use `$DESIGNBOOK_SDC_PROVIDER`

- [x] Update `component-yml.md` — replaced `[provider]` with `$DESIGNBOOK_SDC_PROVIDER`
- [x] Update `story-yml.md` — replaced `[provider]` with `$DESIGNBOOK_SDC_PROVIDER`
- [x] Update `layout-reference.md` — replaced all `[provider]` with `$DESIGNBOOK_SDC_PROVIDER`

## 3. Add provider resolution rule to SKILL.md

- [x] Add rule to `designbook-components-sdc/SKILL.md` — resolve `$DESIGNBOOK_SDC_PROVIDER` at generation time
