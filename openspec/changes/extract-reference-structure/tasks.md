## 1. Extraction Rule

- [x] 1.1 Create `extract-reference.md` rule in `.agents/skills/designbook/design/rules/` with frontmatter (`when: steps: [tokens:intake, design-shell:intake, design-screen:intake]`, `provides: reference.extraction`), three focus modes (styles, structure, content), provider-agnostic strategy selection (Playwright → API → vision), and extraction spec YAML generation instructions per focus mode
- [x] 1.2 Define the extraction output JSON format in the rule (extending compare-markup's extraction-reference.json with `children`, `focus`, and `strategy` fields), including output path convention (`$DESIGNBOOK_DATA/design-system/extractions/{focus}--{url-hash}.json`)

## 2. Intake Task Modifications

- [x] 2.1 Modify `intake--tokens.md`: Add new Step 1 (Extract Reference Styles) before color/typography steps. Read extraction JSON and present extracted colors as starting palette, extracted fonts as defaults. Preserve fallback to existing behavior when no extraction available.
- [x] 2.2 Modify `intake--design-shell.md`: After Step 1 (Resolve Design Reference), invoke extraction with `focus: structure`. In Step 2, derive layout from extracted landmarks. In Step 3, derive components from extracted DOM hierarchy. In Step 4, pre-fill navigation/footer from extracted content. Preserve fallback behavior.
- [x] 2.3 Modify `intake--design-screen.md`: After Step 2 (Resolve Design Reference), invoke extraction with `focus: content`. In Step 5, derive components from extracted content structure. Preserve fallback behavior.

## 3. Provider Interface Extension

- [x] 3.1 Update `provide-stitch-url.md` to additionally set `hasAPI: true` alongside existing `hasMarkup: true`.

## 4. Compare-Markup Format Extension

- [x] 4.1 Update `compare-markup.md` Phase 2 output documentation to include `focus` (`"comparison"`), `strategy` (`"playwright"`), and `children` fields. No behavioral change — only format documentation alignment.

## 5. Verification

- [ ] 5.1 Run `./scripts/setup-workspace.sh drupal-web` from the worktree root, set up the drupal-web test workspace, and execute a tokens workflow with a reference URL to verify that the extraction rule activates and produces a styles extraction JSON
- [ ] 5.2 Execute a design-shell workflow in the test workspace to verify that the structure extraction produces landmark/navigation data and the intake uses it to derive the shell layout
