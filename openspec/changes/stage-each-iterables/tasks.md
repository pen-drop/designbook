## 1. CLI: Stage each expansion

- [ ] 1.1 Add `each` property to `StageDefinition` type in `workflow-types.ts`
- [ ] 1.2 Update `workflow plan` in `cli.ts` to read `each` from stage definitions and expand iterables from `--params` into tasks (replace `--items` loop)
- [ ] 1.3 Remove `--items` flag from `workflow plan` command definition
- [ ] 1.4 Update `resolveAllStages` in `workflow-resolve.ts` to store `each` in `stage_loaded`

## 2. CLI: Intake as engine convention

- [ ] 2.1 Update `workflow create` to resolve intake task file by convention (`intake--<workflow-id>.md`) and store separately from stages
- [ ] 2.2 Update `workflow instructions` to support `--stage intake` without requiring intake in stage definitions

## 3. Workflow frontmatter migration

- [ ] 3.1 Update `design-shell.md` — add `each` to stages, remove intake from steps
- [ ] 3.2 Update `design-screen.md` — add `each` to stages, remove intake from steps
- [ ] 3.3 Update `design-component.md` — add `each` to stages, remove intake from steps
- [ ] 3.4 Update `css-generate.md` — remove intake from steps (no `each` needed, singleton stages)
- [ ] 3.5 Update all remaining workflows (tokens, data-model, vision, sections, shape-section, sample-data, design-guidelines) — remove intake from steps

## 4. Execution rules

- [ ] 4.1 Update `workflow-execution.md` — rewrite Phase 1 for new plan flow (params with iterables, no items)
- [ ] 4.2 Update `workflow-execution.md` — document intake as engine convention in Phase 0/1

## 5. Verification

- [ ] 5.1 Run a design-shell workflow end-to-end and verify test-stage tasks are auto-created
- [ ] 5.2 Run a css-generate workflow (singleton stages) and verify backward compatibility
