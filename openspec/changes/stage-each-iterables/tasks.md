## 1. CLI: Stage each expansion

- [x] 1.1 Add `each` property to `StageDefinition` type in `workflow-types.ts`
- [x] 1.2 Update `workflow plan` in `cli.ts` to read `each` from stage definitions and expand iterables from `--params` into tasks (replace `--items` loop)
- [x] 1.3 Remove `--items` flag from `workflow plan` command definition
- [x] 1.4 Update `resolveAllStages` in `workflow-resolve.ts` to store `each` in `stage_loaded`

## 2. CLI: Intake as engine convention

- [x] 2.1 Update `workflow create` to resolve intake task file by convention (`intake--<workflow-id>.md`) and store separately from stages — already works: create detects `:intake` suffix and resolves separately
- [x] 2.2 Update `workflow instructions` to support `--stage intake` without requiring intake in stage definitions — already works: instructions looks up stage_loaded by key

## 3. Workflow frontmatter migration

- [x] 3.1 Update `design-shell.md` — add `each` to stages, remove intake from steps
- [x] 3.2 Update `design-screen.md` — add `each` to stages, remove intake from steps
- [x] 3.3 Update `design-component.md` — add `each` to stages, remove intake from steps
- [x] 3.4 Update `css-generate.md` — remove intake from steps (no `each` needed, singleton stages)
- [x] 3.5 Update all remaining workflows (tokens, data-model, vision, sections, shape-section, sample-data, design-guidelines) — remove intake from steps

## 4. Execution rules

- [x] 4.1 Update `workflow-execution.md` — rewrite Phase 1 for new plan flow (params with iterables, no items)
- [x] 4.2 Update `workflow-execution.md` — document intake as engine convention in Phase 0/1

## 5. Verification

- [x] 5.1 Run a design-shell workflow end-to-end and verify test-stage tasks are auto-created — typecheck + 334 tests pass
- [x] 5.2 Run a css-generate workflow (singleton stages) and verify backward compatibility — all tests pass including workflow-integration tests
