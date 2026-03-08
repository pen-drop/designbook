# Promptfoo Test Improvements

## Summary

Improve promptfoo test infrastructure by fixing assertion rubrics, consolidating section files (`overview.section.yml` → `spec.section.yml`), adding `--spec` mode to workflows, and fixing the Storybook SyntaxError. Testing with Gemini only.

## Capabilities

### 1. Fix Assertion Rubrics
Rewrite `llm-rubric` assertions from file-content verification to conversation-output verification. The grader only sees chat output, not files.

### 2. Gemini-Only Provider
Remove Opus provider. Test only with `antigravity-gemini-3.1-pro` to reduce cost and avoid SDK fetch failures.

### 3. Workflow `--spec` Mode
All `//debo-*` workflows get a `--spec` parameter. When passed, the workflow outputs a structured plan (paths + content summary) instead of creating files. Solves the grading problem since the plan IS the output.

### 4. Consolidate Section Files
`overview.section.yml` is deprecated. `spec.section.yml` is the single section definition file containing:
- id, title, description, status, order
- shell
- user_flows, ui_requirements
- screen definitions (from old `overview.section.yml`)

All references must migrate: `preset.ts`, `vite-plugin.ts`, workflows, `DeboSectionDetailPage.jsx`.

### 5. Fix Storybook SyntaxError
Root cause: `loadScreenYml` returns `null` on error → Vite serves raw YAML as JavaScript. Return proper error module instead of `null`.
