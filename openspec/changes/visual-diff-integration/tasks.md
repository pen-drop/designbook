## 1. CLI: resolve-url Command

- [x] 1.1 Create `resolve-url.ts` — extract `resolveScene()` and `resolveStoryId()` from `screenshot.ts`
- [x] 1.2 Register `_debo resolve-url --scene <ref>` and `--file <path> --scene <name>` CLI command
- [x] 1.3 Remove `_debo screenshot` CLI command, delete `screenshot.ts`
- [x] 1.4 Update `prepareEnvironment()` in `cli.ts` to use `resolve-url` instead of screenshot
- [x] 1.5 Add tests for resolve-url (scene ref → URL resolution)

## 2. Core Tasks (designbook/design/tasks/)

- [x] 2.1 Create `screenshot.md` — reads breakpoints from design-tokens.yml, calls `_debo resolve-url`, runs `npx playwright screenshot` per breakpoint. Saves to `designbook/screenshots/{storyId}/storybook/{breakpoint}.png`.
- [x] 2.2 Create `resolve-reference.md` — reads scene/component reference, reads matched rules for type-specific resolution. Saves to `designbook/screenshots/{storyId}/reference/{breakpoint}.png`. For components: delegates to framework skill rule. Handles skip when no reference.
- [x] 2.3 Create `visual-compare.md` — reads `storybook/` + `reference/` directories per storyId, matches by breakpoint filename. Text context (tokens, scene-def, guidelines) + rule-provided context. AI comparison per breakpoint. Structured report.
- [x] 2.4 Create `polish.md` — reads visual-compare report. Fix loop: edit code → re-screenshot → re-compare → repeat until resolved or max iterations.

## 3. Core Rules (designbook/design/rules/)

- [x] 3.1 Create `url-reference.md` — `when: steps: [resolve-reference], reference.type: url`. Instructs: screenshot website URL at each breakpoint via Playwright. Save to `reference/{breakpoint}.png`.
- [x] 3.2 Create `image-reference.md` — `when: steps: [resolve-reference], reference.type: image`. Instructs: fetch image directly via WebFetch/Read. Save to `reference/default.png`.

## 4. designbook-stitch Skill (rules only)

- [x] 4.1 Create `designbook-stitch/SKILL.md`
- [x] 4.2 Create `designbook-stitch/rules/stitch-reference.md` — `when: steps: [resolve-reference], extensions: stitch`. Instructs: mcp__stitch__get_screen → fetch screenshot.downloadUrl → save to `reference/{breakpoint}.png`.
- [x] 4.3 Create `designbook-stitch/rules/stitch-intake.md` — `when: steps: [design-shell:intake, design-screen:intake, design-component:intake], extensions: stitch`. Enhances core reference intake with MCP-based screen listing.

## 5. designbook-devtools Skill (rules only)

- [x] 5.1 Create `designbook-devtools/SKILL.md`
- [x] 5.2 Create `designbook-devtools/rules/devtools-context.md` — `when: steps: [screenshot, visual-compare]`. Instructs: navigate_page, evaluate_script (computed styles), take_snapshot (DOM), lighthouse_audit (a11y), list_console_messages (errors).

## 6. Workflow Integration

- [x] 6.1 Add `test: { steps: [screenshot, resolve-reference, visual-compare, polish] }` to `design-shell.md`
- [x] 6.2 Add `test: { steps: [screenshot, resolve-reference, visual-compare, polish] }` to `design-screen.md`
- [x] 6.3 Add `test: { steps: [screenshot, resolve-reference, visual-compare, polish] }` to `design-component.md`
- [x] 6.4 Remove `design/workflows/design-test.md`
- [x] 6.5 Remove `design/tasks/visual-diff--design-test.md`
- [x] 6.6 Remove `design-test` from SKILL.md argument-hint list
- [x] 6.7 Update scene schema: add `url` to reference type enum, add `screens` object (keys must match breakpoint names from design-tokens.yml)

## 7. Guidelines

- [x] 7.1 Add optional `visual_diff.breakpoints` filter to guidelines.yml output format
- [x] 7.2 Update `design-guidelines:intake` to include visual_diff question
- [x] 7.3 Update `guidelines-context.md` to document `visual_diff` key

## 8. Core Intake: Reference Question

- [x] 8.1 Update `intake--design-shell.md` — use `design_reference` (already done in Decision 10 rename)
- [x] 8.2 Update `intake--design-screen.md` — add Step "Design Reference": check `guidelines.yml` for `design_reference`, ask user for reference per scene with optional per-breakpoint `screens` mapping
- [x] 8.3 Update `intake--design-component.md` — add Step "Design Reference": check `guidelines.yml` for `design_reference`, ask user for reference. Delegate storage to framework skill rule.

## 9. Component Reference: Framework Skill Integration

- [x] 9.1 Document component-reference convention in `designbook-addon-skills` skill-authoring resource — framework skills must provide a `component-reference` rule for storing/reading references
- [x] 9.2 Update `resolve-reference.md` to handle component targets: if target is a component (not a scene), read matched framework skill rule for reference location
