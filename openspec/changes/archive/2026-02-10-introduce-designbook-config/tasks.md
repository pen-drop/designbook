## 1. Designbook Configuration Skill

- [x] 1.1 Create `designbook-configuration` skill directory structure
- [x] 1.2 Implement `scripts/load-config.js` to parse `designbook.config.yml` (reading `technology`, `dist`, `tmp`)
- [x] 1.3 Implement `scripts/set-env.sh` to source config values into environment variables (`DESIGNBOOK_TECHNOLOGY`, `DESIGNBOOK_DIST`, `DESIGNBOOK_TMP`)
- [x] 1.4 Create `SKILL.md` for `designbook-configuration` documenting usage

## 2. Update Dependent Skills (ALL)

- [x] 2.2 Update `designbook-data-model` skill (`scripts/validate-and-save.cjs`) to use `DESIGNBOOK_DIST`
- [x] 2.3 Update `designbook-tokens` skill (`scripts/validate-and-save.cjs`) to use `DESIGNBOOK_DIST`
- [x] 2.4 Update `designbook-components` SKILL.md to reference config concepts (doc update only)

## 3. Workflow Integration (ALL)

- [x] 3.1 Update `/debo-product-vision` workflow to use `DESIGNBOOK_DIST`
- [x] 3.2 Update `/debo-product-roadmap` workflow to use `DESIGNBOOK_DIST`
- [x] 3.3 Update `/debo-design-shell` workflow to use `DESIGNBOOK_DIST`
- [x] 3.4 Update `/debo-data-model` workflow to use `DESIGNBOOK_DIST` and `DESIGNBOOK_TMP` (for draft files)
- [x] 3.5 Update `/debo-sample-data` workflow to use `DESIGNBOOK_DIST`
- [x] 3.6 Update `/debo-shape-section` workflow to use `DESIGNBOOK_DIST`
- [x] 3.7 Update `/debo-export-product` workflow to use `DESIGNBOOK_DIST`

## 4. Verification

- [x] 4.1 Verify `designbook.config.yml` creation and loading
- [x] 4.2 Verify skill and workflow integration via manual test are set correctly
- [x] 4.3 Run `/debo-data-model` scripts and verify they write to the configured test directory
