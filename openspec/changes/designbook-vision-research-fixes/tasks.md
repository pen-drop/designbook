## 1. Fix workflow-execution.md bootstrap documentation

- [x] 1.1 Update Phase 0 in `workflow-execution.md`: add note that `_debo()` must be redefined in every Bash block, add inline `eval && ...` as alternative for single-command calls
- [x] 1.2 Update the "Bootstrap Scope" callout to explicitly state that each Bash tool call is a fresh shell

## 2. Document task ID convention

- [x] 2.1 Add "Task ID Convention" subsection to Phase 2 in `workflow-execution.md` explaining `<step>-<param_value>` pattern with preserved casing/spaces
- [x] 2.2 Add guidance to retrieve IDs from CLI responses instead of constructing them manually

## 3. Fix params rule

- [x] 3.1 Replace "Singleton Workflows" section in `workflow-execution.md` with a single clear rule: `--params` is required when `expected_params` has any `required: true` entry, optional otherwise. Remove the singleton/iterable distinction entirely.

## 4. Deduplicate vision-format rule

- [x] 4.1 Remove duplicated format constraints from `vision/rules/vision-format.md` (Problems & Solutions heading format, Key Features bullet list)
- [x] 4.2 Keep only non-duplicated constraints: product name heading requirement, directory creation, read-before-overwrite

## 5. Verification

- [ ] 5.1 Run `./scripts/setup-workspace.sh drupal` from repo root to rebuild workspace
- [ ] 5.2 Run `/designbook vision --research` in workspace to verify zero friction
