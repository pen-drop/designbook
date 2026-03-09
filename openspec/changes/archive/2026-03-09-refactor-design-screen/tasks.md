## 1. Rewrite Workflow Structure

- [x] 1.1 Rewrite `debo-design-screen.md` Step 1 (Prerequisites): Source `designbook-configuration` (`set-env.sh`) first to resolve `$DESIGNBOOK_FRAMEWORK_COMPONENT`, `$DESIGNBOOK_FRAMEWORK_CSS`, `$DESIGNBOOK_DIST`, `$DESIGNBOOK_DRUPAL_THEME`. Then check: shell exists (fail-fast), section spec + data exist, data model exists
- [x] 1.2 Rewrite Step 2 (Select Section): Keep as-is — list sections with spec + data ready
- [x] 1.3 Write Step 3 (Execute): Replace old Steps 3-5 with a single execution step containing sub-steps 3.1–3.4 with just-in-time skill loading

## 2. Implement Just-in-Time Sub-Steps

- [x] 2.1 Sub-step 3.1: Read `designbook-components-$DESIGNBOOK_FRAMEWORK_COMPONENT/SKILL.md` (e.g., `designbook-components-sdc`) → create UI components needed for the section
- [x] 2.2 Sub-step 3.2: Read `designbook-view-modes/SKILL.md` → create `.jsonata` view mode files for entity types in the section
- [x] 2.3 Sub-step 3.3: Read `designbook-scenes/SKILL.md` → create `{section}.scenes.yml` with all scenes
- [x] 2.4 Sub-step 3.4: Delegate to `//debo-css-generate` workflow for CSS token generation

## 3. Remove Dead References

- [x] 3.1 Remove all references to `designbook-components-entity-sdc` and `generate-stories.js`
- [x] 3.2 Remove all references to `designbook-web-reference` and its resources
- [x] 3.3 Remove all references to `designbook-css-daisyui` and `daisyui-llms.txt` (delegated to `//debo-css-generate`)
- [x] 3.4 Remove the "Read All Design Skills & Resources" step entirely

## 4. Cleanup & Guardrails

- [x] 4.1 Update the `--spec` mode description to match the new flow (dry run of what WOULD be created)
- [x] 4.2 Update the Guardrails section at the bottom of the workflow
- [x] 4.3 Update the completion report (Step 4) to match the new output structure
