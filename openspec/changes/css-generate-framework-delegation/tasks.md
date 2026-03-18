## 1. Workflow Update

- [x] 1.1 Update `debo-css-generate.md` frontmatter: add `stages: [generate-jsonata, generate-css]`, remove `!WORKFLOW_PLAN`/`!TASK` markers
- [x] 1.2 Update `debo-css-generate.md` body: add Step 0 (load workflow skill), verify-input + check-regeneration as pre-plan steps, remove reference to `designbook-css-generate/SKILL.md`

## 2. Framework Task Files

- [x] 2.1 Create `designbook-css-daisyui/tasks/generate-jsonata.md` (`when: frameworks.css: daisyui`) — inline DaisyUI jsonata generation + Tailwind layout token generation (color, font, layout-width, layout-spacing)
- [x] 2.2 Create `designbook-css-tailwind/tasks/generate-jsonata.md` (`when: frameworks.css: tailwind`) — Tailwind structural token jsonata generation (layout-width, layout-spacing, grid)

## 3. Generic Pipeline Task

- [x] 3.1 Create `designbook-css-generate/tasks/generate-css.md` (no `when`) — merge content from `steps/execute-transforms.md`, `steps/ensure-imports.md`, `steps/verify-output.md`

## 4. Cleanup

- [x] 4.1 Remove `designbook-css-generate/steps/delegate-framework.md`
- [x] 4.2 Remove `designbook-css-generate/steps/execute-transforms.md` (merged into task)
- [x] 4.3 Remove `designbook-css-generate/steps/ensure-imports.md` (merged into task)
- [x] 4.4 Remove `designbook-css-generate/steps/verify-output.md` (merged into task)
- [x] 4.5 Keep `steps/verify-input.md` and `steps/check-regeneration.md` as workflow body references (or inline into workflow)

## 5. SKILL.md Update

- [x] 5.1 Slim `designbook-css-generate/SKILL.md` to pipeline overview + pointer to task files (remove generate expression details — those live in framework task files now)
