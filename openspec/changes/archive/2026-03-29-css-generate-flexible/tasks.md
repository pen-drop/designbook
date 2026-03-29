## 1. Workflow Resolver: Multi-task steps + skip + remove depends_on

- [x] 1.1 Change `resolveTaskFile` in `workflow-resolve.ts` to return `string[]` (all matches) instead of single `string`; return `[]` for no match instead of throwing
- [x] 1.2 Update `resolveAllStages` to collect all matching tasks per step; skip steps with no matches; emit debug log on skip
- [x] 1.3 Update `resolveWorkflowPlan` to create multiple tasks per step from all matches; skip steps with empty resolution
- [x] 1.4 Remove `depends_on` from `ResolvedTask` interface and `computeDependsOn` function
- [x] 1.5 Update tests in `workflow-resolve.test.ts`: multi-task per step, skip on no match, no depends_on

## 2. CSS Mapping Rules

- [x] 2.1 Create `designbook-css-tailwind/rules/css-mapping.md` with `when: { steps: [generate-jsonata, generate-css], frameworks.css: tailwind }` and groups mapping
- [x] 2.2 Create `designbook-css-daisyui/rules/css-mapping.md` with `when: { steps: [generate-jsonata, generate-css], frameworks.css: daisyui }` and groups mapping (color uses `@plugin` wrapper)

## 3. Generic generate-jsonata Task

- [x] 3.1 Create `designbook/css-generate/tasks/generate-jsonata.md` — generic task that reads css-mapping rule, inspects design-tokens.yml, generates one JSONata template per present token group
- [x] 3.2 Remove `designbook-css-tailwind/tasks/generate-jsonata.md`
- [x] 3.3 Remove `designbook-css-daisyui/tasks/generate-jsonata.md`

## 4. Extract Font Loading from generate-css

- [x] 4.1 Remove Google Fonts Step 5 from `designbook/css-generate/tasks/generate-css.md`

## 5. Cleanup & Verification

- [x] 5.1 Update `designbook-css-tailwind/SKILL.md` — remove task file references, document css-mapping rule
- [x] 5.2 Update `designbook-css-daisyui/SKILL.md` — remove task file references, document css-mapping rule
- [x] 5.3 Run tests: `pnpm check`
