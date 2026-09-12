# DESIGNBOOK-57 — Unified creation and targeted changes

Status: proposed specification; human confirmation pending. Native planning used; no optional planning tool selected. Baseline inspected: `b5d6e1b293289b52b99e4ec840d422721393e8d1` on `feat/designbook-57-design-skil`, based on `feat/designbook-56-designbook`.

## Decision and scope

Keep `design-component`, `design-screen`, `design-shell`, and `design-entity` as the four entry points for both creation and targeted changes. Intake selects the exact target from the request and current artifacts, then saves the complete workflow definition for `execute-workflow`. Introduce the shared stage names `write-component` and `write-scene`; retain existing result schemas and validators. Separate update skills, required update flags, migrations, compatibility aliases, and legacy repair are outside scope.

This is a `work:code` feature with a runtime surface: agent instructions generate artifacts consumed by Storybook. The design aspect concerns those intended artifacts; spec invokes no design intake and creates no component, scene, mapping, executable case, or saved execution document. The project-specific tester-only spec shortcut does not apply. `scenario_required = true` for subsequent browser verification of variants, mobile navigation, shell injection, and entity output. No environment provisioning, Drupal deployment, or backend config export occurs in spec.

The qualification handoff v1 is current: recomputing its documented SHA-256 basis from the current title, raw description, sorted labels, and recorded qualification revision returns `c5d3d841a9ad2566b370854d71e1c7f58bc122246b0646ad8a65a2ed7a545c18`. Its confirmation field remains historical; the current ticket state and explicit instruction authorize this spec run. The spec and test plan still require their own confirmation.

## Current behavior and source ownership

- The four `skills/design-*/resources/intake.md` files already delegate through `designbook/resources/workflow-building.md`. Extend their domain decisions without introducing a second builder or changing the immutable-definition engine.
- `designbook-drupal/components/tasks/create-component.md` owns the active SDC component task. Its output contract requires schema, Twig, and default story, with optional JavaScript; it also contains generation procedure that should move to the appropriate blueprint/resource while editing this contract.
- `designbook/scenes/tasks/create-scene.md` explicitly appends to `scenes[]`. The canonical scene identity is the selected file plus `SceneDef.name`, as defined in `scenes/schemas.yml`; the SceneFile `id` and Storybook URL are related identities, not interchangeable selectors.
- Screen and shell rules currently match workflow-qualified `create-scene` steps. Shared rules, Drupal/Tailwind integration rules, blueprints, import, discovery tests, and documentation also name the old stages.
- Existing creation cases emphasize file existence. Some accept mentions of `build-storybook` as proof. `designbook-test/resources/eval-score.mjs` exposes `modifiedFiles`, but `fileContents` includes only changed/new files, and workflow collections are keyed by definition ID. These limits matter for preserved neighbors and repeated updates.

## Intake contract

Each intake records the selected identity and paths, relevant existing artifacts, requested delta, concrete acceptance criteria, preserved content, and affected consumers. A clear text request supplies the change reference; a new visual reference is optional. When supplied, reference analysis is completed and embedded before execution. Clarify ambiguous identity or scope before saving a runnable definition.

Component intake inventories variants, props, slots, stories, scripts, and usages in other components, scenes, and mappings. It distinguishes consumers needing edits from consumers needing verification. Shared-component impact is visible in the decisions. Every necessary consumer edit, prerequisite, build, and verification target becomes an explicit task or output before execution.

Screen intake selects one named scene in one section SceneFile and identifies its route-bearing main content, shell, mappings, and data. Shell intake selects the existing `design-system:shell` target and its page/header/footer composition, navigation, content injection, and consuming screens. Entity intake identifies entity type, bundle, and exactly one view- or form-mode target, then inspects its mapping, model/display settings, sample pool, components, and standalone preview.

All structural choices use existing definition inputs, task parameters, targets, dependencies, context, and outputs. Reuse shared schema types by reference; add only missing task inputs needed to state the write target and existing content. Rules consume task parameters instead of owning private parameters. No general update-mode schema or runtime task expansion is needed.

## Write contracts

`write-component` produces the complete required artifacts for the selected component ID using its existing contract and the requested delta. Preserve unrelated variants, props/slots, story identities, and scripting. Explicitly declare every affected story path, including existing non-default stories, and every required consumer edit in the saved definition. A prop/slot rename changes its declared consumers together; compatibility aliases are not introduced. New artifacts are declared only where the requested outcome needs them. Existing content takes precedence over blueprint defaults for unaffected structure. The task states deliverables and invariants; framework construction guidance belongs in blueprints/resources.

`write-scene` returns the complete SceneFile through the existing `scene-file` result, `SceneFile` schema, and `scene` validator. For a uniquely selected existing name, replace only that scene's requested content; for a new name, add exactly one entry. Preserve sibling scenes, their order, unrelated selected-scene fields, and unrelated file metadata. Preserve file and scene identities unless a rename is explicitly requested and its references are planned. Multiple matches or conflicting selectors require intake clarification. Repeating the same change leaves one target entry and the same semantic result.

Keep `create-scene-file` as the distinct initializer for missing files. Intake includes it only when needed; an existing shell/section file must never be reset by initialization. This ticket does not rename every stage containing `create-`.

`map-entity` and sample-data tasks retain their existing names and shared result types. Make their change boundaries explicit where the current contract is insufficient. Reuse a sufficient sample pool; otherwise change only the necessary records/fields and retain stable identities and section tags. Preserve other bundles/modes and unrelated data-model/display configuration. Use the current standalone preview convention and existing form-mode support; do not create replacement components when the selected component already satisfies the mapping.

## Rules, execution, and validation

Rename active callers and triggers atomically with the two write stages, including import and qualified screen/shell triggers. Preserve one shared source for schemas and constraints. Reference-dependent derivations apply when a reference exists; text-only changes use the concrete intake criteria and retained structure. All structural, accessibility, component, shell, and screen constraints still apply.

Carry the applicable screen/shell rule context onto scene writes made as consumer follow-ups, even when the originating intake is `design-component`. Screen writes preserve shell inheritance and exactly one route-bearing main content. Shell writes preserve exactly one `$content` injection and contain no route-bearing main content. Neither rule family should be selected solely from the originating skill when the actual write target belongs to the other family.

Build/component-index prerequisites must be planned before dependent scene work. Existing inventory is inspected during intake, and planned component IDs are fixed there. Any post-build index refresh supplies known artifact data only; it cannot discover additional scope. Result validation and browser checks are explicit parts of the saved definition. Newly discovered requirements block the run rather than extend it.

`repair` continues to consume completed-check findings, and `design-verify` remains the completed-scene reference comparison workflow. Neither becomes the entry point for ordinary edits. The eight required text-based cases use `validate workflow: none`; they still require actual build, render, and semantic acceptance checks within their main run.

## Verification design and risks

The [test plan](DESIGNBOOK-57-tests.md) defines eight independent creation/update cases with explicit current-format fixture layers. Preserve whole untouched files by byte/hash comparison to the fixture baseline, and untouched parts of modified YAML by semantic comparison. Assertions must fail on duplication, lost variants/metadata/modes, missing consumer updates, and unintended component creation.

Extend only the shared eval scorer where needed to expose selected unchanged files, baseline comparisons, and evidence for every execution in the repeat-update scenario. Keep file collection bounded to case artifacts and avoid duplicating scoring in the addon. Assertions over an empty task/result collection must fail, not pass vacuously. Machine results from actual commands and browser observations replace transcript keyword checks.

Rule selection and live-index dependencies are the main integration risks; inspect real discovered catalogues in focused contract checks. Browser behavior is not established by a successful static Storybook build. Both observations are required. Test fixtures are valid supported inputs written from scratch, not migrated historical output. Reference-free rules and existing form-mode paths need explicit coverage rather than assumptions.

The [implementation plan](DESIGNBOOK-57-plan.md) is a proposal for coding. No implementation check or case is claimed as passing by this specification.
