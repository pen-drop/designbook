## 1. Workflow Definition

- [x] 1.1 Create `designbook/import/workflows/import.md` with intake + execute stages (`each: workflow`, step: `run-workflow`), `engine: direct`
- [x] 1.2 Create `designbook/import/tasks/intake--import.md` — resolves design reference, lists available screens, lets user select, builds sub-workflow list with pre-filled params, presents summary for confirmation
- [x] 1.3 Create `designbook/import/tasks/run-workflow.md` — instructs the agent to start the referenced sub-workflow with pre-filled params using standard workflow execution, mark parent task done on completion

## 2. SKILL.md Integration

- [x] 2.1 Add `import` workflow to the designbook SKILL.md dispatch rules so `/designbook import` or intent "import from reference" triggers it

## 3. Verification

- [ ] 3.1 Run `./scripts/setup-workspace.sh drupal` from repo root, then test the import workflow manually with the existing Stitch project — verify intake resolves reference, generates sub-workflow list, and executes sub-workflows in sequence *(manual)*
