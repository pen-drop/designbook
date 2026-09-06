---
name: write-planning
description: Shared intake contract for creation and targeted artifact changes.
---

# Plan complete writes

1. Inspect the selected existing artifacts and usages. Embed relevant existing source content in `definition.context` entries and reference those entries from each consuming task, including baselines for files that must remain untouched. Keep concrete source paths, identities and preservation criteria in definition inputs/task parameters. Context content can carry literal template syntax; structural inputs and parameters must be fully concrete. Record the exact delta and semantic preservation criteria; use byte/hash checks for whole unchanged files. Completion: target identity and baseline are unambiguous.
2. For a supplied visual reference, finish analysis and asset selection during intake and embed the measurements. For text-only requests, embed concrete appearance, behavior and responsive criteria plus retained structure. Completion: execution needs no new reference, asset or structural selection.
3. Enumerate all target IDs, paths, variants, stories, mappings, sample changes and consumer edits. Distinguish verification-only consumers. Assign `scene_scope` from the actual scene target and embed applicable screen/shell rules for consumer follow-ups. Completion: every necessary write and every affected story URL is accounted for.
4. Include component writes before their dependent mapping/scene tasks. When components require a refreshed Storybook index, declare the build/restart and index refresh as predecessors. Embed the union of existing and planned component IDs before execution; refreshed inventory supplies known artifact data only. Bind produced content with predecessor inputs from the shared builder. Completion: every prerequisite has a concrete task/output and dependency; scope cannot expand after a build.
5. Declare actual `pnpm build-storybook` evidence and `storybook check <story-url>` tasks for concrete affected URLs, with exact viewport, selector, interaction and semantic observations from the request. Cover preserved variants and affected consumers as well as changed output. Completion: successful command results and browser observations establish every acceptance criterion; transcript keywords or empty result collections are insufficient.

Preservation uses the existing artifact as baseline; blueprint defaults guide new structure. Retain identities unless an explicit rename includes all reference changes. Missing requirements discovered in execution block the saved run; a new intake must resolve them before a new fixed definition can run.
