## 1. Reference Data Flow

- [x] 1.1 Update `resolve-design-reference.md` partial: add explicit instruction at end of Step 5 / Result section that the calling intake MUST include `reference` in `--params` JSON when calling `workflow done --task intake`
- [x] 1.2 Update `create-scene--design-shell.md`: add `reference: []` to `params:` block (optional, default empty); include `reference:` in the output YAML template when non-empty
- [x] 1.3 Update `create-scene--design-screen.md`: same changes as 1.2

## 2. Inspect Step in Workflow Definitions

- [x] 2.1 Update `design-shell.md` workflow: add `inspect` between `screenshot` and `resolve-reference` in test stage steps
- [x] 2.2 Update `design-screen.md` workflow: same change
- [x] 2.3 Update `design-verify.md` workflow: same change (if test stage exists)

## 3. Remove Stale devtools-context Rule

- [x] 3.1 Delete `.agents/skills/designbook/design/rules/devtools-context.md`

## 4. Verification

- [x] 4.1 Run `./scripts/setup-workspace.sh drupal-stitch` from repo root to rebuild test workspace with updated skill files
- [x] 4.2 Verify all changes propagated to workspace: inspect step in 3 workflows ✓, devtools-context.md deleted ✓, reference param in create-scene tasks ✓, MANDATORY instruction in resolve-design-reference ✓
