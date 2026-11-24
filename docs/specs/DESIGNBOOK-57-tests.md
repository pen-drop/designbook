# DESIGNBOOK-57 — Proposed test plan

Confirmation: pending human confirmation of this plan, the design, and the implementation plan. No feature case or browser check has run in spec. `scenario_required = true`. Concrete tests, selectors, screenshots, browser walkthrough artifacts, and fixtures are authored in coding.

## Repository-native case checks — AC1, AC3, AC4, AC5, AC6

Type: `debo-test` integration with semantic artifact assertions and browser verification. Rationale: the public skill entry point, intake, saved definition, executor, generated artifacts, and Storybook together are the acceptance boundary; unit tests alone cannot establish agent behavior.

Run each invocation from the ticket worktree. These are skill invocations, not assumed shell binaries. Each invocation uses `debo-test run` setup to freshly rebuild its own workspace and layer its case inputs. Suite: `drupal-petshop`. Validate workflow: `none` for all eight, because these cases use explicit textual criteria without a new visual reference. Actual main-run build/render validation remains mandatory.

| Invocation | Required observable result |
|---|---|
| `debo-test run drupal-petshop design-component --workspace workspaces/designbook-57/design-component` | Create avatar with distinct small/medium/large variants, valid props/slots/stories and stable component references. Render every variant and observe its specified differences. |
| `debo-test run drupal-petshop design-component-update --workspace workspaces/designbook-57/design-component-update` | Seed valid avatar variants, stories, and consumers. Change one variant and one requested prop/slot contract; preserve the other variants and component ID, update all affected stories/usages, and render the changed and preserved variants plus affected consumers. |
| `debo-test run drupal-petshop design-screen --workspace workspaces/designbook-57/design-screen` | Create homepage scene, its needed components and mappings. Resolve the shell and sample records, with exactly one route-bearing main content and valid supplementary blocks. |
| `debo-test run drupal-petshop design-screen-update --workspace workspaces/designbook-57/design-screen-update` | Seed at least two named scenes with metadata. Change only the selected scene and planned dependencies, retaining sibling content and metadata. Repeat the identical request in this workspace through a second independently saved definition; retain one target entry and equivalent final content. Verify both run definitions and results separately. |
| `debo-test run drupal-petshop design-shell --workspace workspaces/designbook-57/design-shell` | Create the canonical design-system shell with header/footer/navigation, one content injection point, and working mobile behavior. Correct the current case's outdated shell output-path expectation against the active canonical contract. |
| `debo-test run drupal-petshop design-shell-update --workspace workspaces/designbook-57/design-shell-update` | Seed the canonical shell and a consuming screen. Change the specified navigation/mobile behavior, preserve shell identity and content injection, create no second shell, and render the consuming screen with its content intact at desktop/mobile sizes. |
| `debo-test run drupal-petshop design-entity --workspace workspaces/designbook-57/design-entity` | Reuse pet-card for node.pet teaser, produce valid mapping/tagged sample records and standalone preview, and verify mapped field values in the rendered output. |
| `debo-test run drupal-petshop design-entity-update --workspace workspaces/designbook-57/design-entity-update` | Seed mapping, data, preview, and another bundle/mode. Change the selected field output while preserving target IDs, unrelated data/modes, and the component inventory. Include an existing form-mode neighbor and verify it remains usable; if a shared form-mode contract changes, also exercise a targeted form-mode update in this case. |

Every case must check exact planned task IDs against completed state, nonempty required results, successful result validators, no open workflows, and an unchanged definition. No task may be added during execution. Changed files must appear through `modifiedFiles`/contents or equivalent case checks. Compare untouched fixture artifacts to the baseline; a missing `fileContents` key is not proof of preservation. Assertions must detect false append, identity changes, damaged consumers, unnecessary new components, and missing required outputs.

Expected result: all eight pass after implementation. Before implementation, the new change assertions are expected to expose creation-only behavior, missing preservation, or inadequate evidence; failures must be attributed to the observed defect rather than setup errors. A failed/blocked/unexecuted case is reported with its actual status, never counted as passing. Eight cases include at least nine saved main executions because the screen update repeats.

## Build, render, summary, and scoring paths

Type: build plus browser checks within the case's saved definition. Rationale: build catches generation/import problems, while rendering and interaction establish variant differences, mapped field values, navigation, and content injection.

For each case, run `pnpm build-storybook` from its theme directory, `WORKSPACE/web/themes/custom/test_integration_drupal`. Require exit code zero and actual build output. Run `npx storybook-addon-designbook storybook check <story-url>` for each concrete affected story URL determined during intake. Require successful `CHECK_RESULT` and the case's semantic/browser observations; a clean console alone does not establish the visual or behavioral criterion. Cover all declared component variants and affected consumers, desktop/mobile navigation behavior, and entity previews. Bind URLs, interaction selectors, and exact viewport criteria in coding before execution.

From the workspace root, collect `npx storybook-addon-designbook workflow summary <saved-run-path> --json` for each execution, including both screen updates. Use the existing scorer with explicit absolute paths:

```text
node <repo>/.agents/skills/designbook-test/resources/eval-score.mjs --workflow <saved-run-path> --case <repo>/fixtures/drupal-petshop/cases/<case>.yaml --data-dir <workspace-data-dir> --theme-dir <theme-dir> --definition-before <before-definition.yml>
```

The before-file contains the definition object expected by the scorer. Require `assertions.total > 0`, every assertion passed, and an empty failures list. A process exit of zero alone is insufficient. For repeated runs, assess each definition/run directly; a map entry overwritten by a reused workflow ID cannot prove both runs.

Evidence for each case: exact invocation and verification commands, observed assertion counts/status, actual build exit/result, actual rendered story URLs/behaviors, and the immutable implementation commit. Record workspace and saved workflow paths as execution locations. Logs, baseline copies, and screenshots are transient under `assets-ai/DESIGNBOOK-57/`, grouped by producing tool; they supplement the durable command/result/commit record rather than replace it.

## Contract and authoring checks — AC1, AC2, AC3, AC5, AC7

| Type | Command/path | Rationale and expected result |
|---|---|---|
| Discovery/schema contract | `pnpm --filter storybook-addon-designbook exec vitest run src/__tests__/workflow-planning-contract.test.ts src/__tests__/workflow-discovery.test.ts src/__tests__/workflow-document.test.ts` | Extend existing tests in coding to inspect shipping catalogues for write stages, applicable shared and screen/shell rules, unchanged shared schemas, and fixed definitions. All selected tests pass. |
| Active-reference audit | `rg -n --hidden '\b(create-component|create-scene)\b' .agents/skills fixtures packages/storybook-addon-designbook/src scripts` | Inspect every match; no active old task caller, trigger, task filename, or stale instructional path remains. Matches for the intentionally retained `create-scene-file` initializer and historical documentation are distinguished explicitly. |
| Skill authoring validation | Invoke `Validate skill <changed-skill-root>` under `.agents/skills/designbook-skill-creator/resources/validate.md` for each changed root | Apply the common, file-type, and writing checks from their single source. Report findings and schema references; resolve errors in the modified scope and explicitly account for warnings. Matt's writing-for-agents guides trigger boundaries and concise indexes. |
| Focused scorer checks, if changed | `node --test .agents/skills/designbook-test/resources/eval-score.test.mjs` (proposed coding artifact) | Demonstrate that preserved files, repeated execution evidence, missing outputs, and deliberately damaged case data produce the correct pass/fail observations. All selected checks pass. |
| Static analysis/lint/unit suite | `pnpm check` from the repository root before committing | All configured fail-fast checks pass. At this baseline the script also runs `check:legacy-flush` before typecheck, lint, and tests. In spec this validates only the documentation commit, not the future feature. |

Evidence for each executed check uses the same command / observed result / immutable commit triad. The AC1–AC7 requirements remain implementation requirements, not checks passed by authoring this plan. Human confirmation is required before coding begins.
