# Prepare the design reference during intake

Use before fixing a design-shell, design-entity or design-screen component inventory.
Reference analysis supplies structural decisions, so it must finish before the
saved workflow definition is authored.

1. Load `workflow discover <template>` through the shared builder. Read the
   effective `extract-reference` task instructions, schemas and matched
   integration rules from that catalogue. Use the resolved instructions rather
   than only reading the core task file. Missing extraction instructions block
   planning when a reference was supplied.
2. Resolve the original reference, persistent reference directory, requested
   subjects and breakpoints. Apply the loaded extraction/capture instructions
   now as intake preparation. Inspect `extract.json`, the scoped reference
   screenshots and the overview images. Follow the task's frozen-baseline reuse
   behavior when the same scope is already prepared. Keep evidence in the
   workspace reference directory.
3. Derive the concrete inventory from that evidence: shell landmarks and nested
   regions, entity fields/component assignments, or section layout and content.
   Resolve assets, navigation states, selectors and responsive differences before
   committing to component IDs, slots, variants or task counts. Inspect targeted
   extraction fields instead of putting raw browser dumps into the context.
4. Record the reference paths, fixed capture scope and resulting design decisions
   in the definition's inputs and relevant embedded context. The builder can now
   enumerate the complete component/mapping/scene graph.
5. Keep the template's declared extraction task as the producer of its reference
   results. It reuses the already prepared extract/meta/baselines with the same
   fixed params; it does not discover new targets during saved-workflow execution.
   If the prepared reference no longer supports the planned structure, return to
   intake and create a new complete definition.

When the request intentionally has no design reference, follow the task's
no-reference branch and record that limitation explicitly. Do not invent reference
measurements. A requested reference comparison fails when no valid comparison reference is
available. Text-only cases use the concrete build/browser criteria selected by
the test case instead.
