---
name: reference-packages
description: Bind bounded observed evidence to complete planner-authored work orders.
---

# Reference observations during planning

Start from a completed capture revision. The authoritative metadata schema is
the `reference` output of `publish-capture`. Query observations use the
projected `DesignReference` schema. The CLI derives this contract from the
published owning workflow when `--contract` is omitted. An explicit contract
retains the effective schemas and all transitive definitions.
The capture extract contains observations; target structure, styling, content
bindings and behavior decisions belong in the design plan.

For every consuming task, fix exact subjects, states and views. Browser requests
may select breakpoints only through explicit recorded view mappings. Distinct
subject matrices need distinct requests. Native source locators preserve their
meaning: a Figma node identity is not an implementation CSS selector.

| Query package | Selected observed evidence |
| --- | --- |
| `component` | Observed hierarchy, layout, typography, content and interactions. |
| `composition` | Observed hierarchy and layout. |
| `tokens` | Observed style and typography values. |
| `assets` | Exact local image and font dependencies. |

Dependencies bind exact ancestor IDs, `images[].url` identities and font-family
names. Non-system fonts require local binaries. Selected dependencies are returned
once. The query preserves provenance and selected capture associations; it never
converts measured values into target implementation decisions.

Use `reference validate --reference <completed-revision-directory> --contract
<contract.json>` to inspect the declared coverage. Prepare each fixed request with
`reference prepare --request <request.json> --contract <contract.json>`. The request
contains the absolute completed revision directory, package, subjects, states and
views (or explicitly mapped breakpoints). Save the returned fingerprinted request
in the task's typed reference requirement. Query it using `reference query` for
read-only targeted checks against the same contract.

Keep full extracts, raw source dumps and query response JSON on disk. Each selected
package and dependency retains the CLI byte bound. Narrow subjects or split tasks
when evidence exceeds the bound; required information is never truncated. The
worker receives its concrete implementation decisions and selected observations
in advance. Missing decisions block the step; worker execution cannot refresh or
read the live source. Refreshes leave earlier revision bindings unchanged.
