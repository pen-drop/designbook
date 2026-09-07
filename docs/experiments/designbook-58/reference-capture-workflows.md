# Reference capture workflows and a shared observation contract

Status: user-approved specification, 2026-09-08. DESIGNBOOK-58 remains in coding.
This document records the agreed design. Implementation and verification evidence
is recorded below; DESIGNBOOK-58 remains in coding.

## Problem and intended result

Reference preparation currently mixes source access, observations, implementation
decisions and file ownership. Astra/Sonnet04 split one reference into sm/xl
directories, although the extraction contract expects a common meta.yml. In
Grok46-01, completing the reference task rewrote an unchanged extract.json with
one additional newline and failed the frozen-input check. Neither run produced
a completed shell. See [run evidence](results.md).

Source-specific skills will prepare observations through a dynamically assembled
capture workflow. Existing `workflow done` validation and writers will persist
those results under a common schema. A completed capture produces an immutable
reference revision. Design planning consumes that revision; later design workers
do not rewrite it. Storybook capture uses the same observation schema, allowing
verification to compare actual observations with reference observations.

## Responsibilities

| Owner | Responsibility |
| --- | --- |
| Source integration skill | Recognize supported sources, access them with its tools, interpret source identities, declare capture tasks and translate observations into the shared contract |
| Design intake | Select the design target and required capture scope, present selectors or source locators and evidence, clarify necessary missing information |
| Capture workflow | Execute the fixed source-specific capture tasks and submit validated observations through `workflow done` |
| Source-neutral CLI | Validate and persist results, manage reference/revision identity and publication, resolve bounded read-only queries |
| Design planner | Choose target structure, component decomposition, styling, behavior and acceptance criteria; prepare complete step work orders |
| Design worker | Execute its fixed step using supplied decisions and data; query only its bound reference revision for targeted checks |
| Storybook capture and verification | Record the actual implementation using the observation contract and compare the declared corresponding subjects/views/states |

Source integrations are separate skills, not source-adapter implementations or
a provider switch embedded in CLI code. Existing source-access tools may be used
by a skill; the shared storage/query layer does not know Figma APIs, website
extraction procedures or Stitch access logic. Installed skills declare supported
sources and capabilities through the skill integration mechanism. An unambiguous
match selects the skill; an ambiguous selection is clarified during intake.

## Figma as a concrete capture workflow

Figma is a design case for the dynamic workflow mechanism, not just a possible
future source name. A dedicated Figma integration skill contributes the source
selection and capture tasks while the shared CLI remains source-neutral.

Before workflow creation, the skill identifies the selected file and frames/nodes,
the available source revision identity, and which selected views or variants
correspond to the requested subjects and states. It presents this mapping during
intake. A whole file is not imported automatically when only a header is requested.

For a selected header with mobile and desktop frames, the assembled workflow can
contain the following concrete tasks, using capabilities actually available to
the Figma skill's tools:

1. Read the selected node hierarchies and their observed properties, preserving
   file/node identity and parent-child relationships.
2. Capture or export visual evidence for each selected frame/state. Record its
   dimensions and source association; use an explicit view-to-breakpoint mapping.
3. Collect the referenced assets and available typography/style observations.
   Report unavailable required files or properties instead of fabricating them.
4. Submit the observations and file evidence through the workflow's declared
   outputs with `workflow done`; use shared schema definitions and writers.
5. Validate complete selected coverage and make the reference revision available
   to the design planner.

The actual task set is assembled from discovered integration instructions and
the selected scope, not hard-coded as a Figma branch in CLI code. If a frame shows
only a resting menu, the skill does not infer an observed open state. A supplied
variant or other source evidence may establish it; otherwise intake clarifies the
missing requirement. Source updates during capture must not silently mix versions
inside a completed reference revision; unavailable revision information is explicit.

The resulting Figma reference has the same metadata/structure/extract/screenshot
contract as a website reference. Its source locators remain Figma identities.
The planner defines the intended Storybook implementation and comparison mapping
separately. The Storybook capture workflow records the resulting rendered DOM and
images as actual observations under the common contract.

Verify this path with a deterministic Figma-shaped fixture containing selected
mobile/desktop frames, an asset dependency and an absent interaction state. The
fixture must demonstrate dynamic task assembly, common output validation and
actionable missing-evidence handling without requiring Figma-specific CLI code.
A live Figma test additionally requires the source skill and accessible source;
fixture success must not be reported as a successful live Figma capture.

## Reference identity and scope

A reference represents one deliberately selected design target and its relevant
views and states. It is not automatically an entire website or every frame of a
design file. The source skill supplies the stable source identity and the selected
scope; CLI reference identity must support non-URL sources rather than assuming
every identity is a normalized website URL.

A website and a Figma file remain two independent references. Their observations
are not implicitly merged into a synthetic reference. Source identifiers and
provenance remain available in query results.

Each reference revision has one shared meta.yml and extract.json, with the
selected captures and assets belonging to that revision. Breakpoints do not
create independent metadata files for the same revision. Conceptually:

```text
<reference revision directory>/
  meta.yml
  extract.json
  assets/
  <view>--<subject>--<state>.png
```

The CLI owns physical paths, collision handling and serialization. Source skills
submit typed results and files rather than independently choosing final folders.
The exact revision-directory naming is an implementation detail; reference ID
plus revision must identify one complete immutable snapshot.

## Shared observation schema

One authoritative schema defines both source observations and actual Storybook
observations. Its logical parts are:

| Part | Required meaning |
| --- | --- |
| Metadata | Reference/revision identity, source provenance, selected subjects, views, states, dimensions, capture coverage and artifact associations |
| Observed structure | Element identities, hierarchy and source locators or mappings |
| Extracted observations | Measured properties, observed content, assets/fonts and available interaction observations |
| Screenshots | Captured files associated with an exact subject, view/state and dimensions, with file identity/integrity evidence |

These are logical parts of the shared contract, not a requirement for four new
file formats. Reuse common schema definitions and the existing result contract;
meta.yml, extract.json and the capture files remain explicit stored artifacts.

The shared core preserves source-specific details and capabilities without
requiring one source to imitate another. A CSS selector identifies website or
Storybook DOM; a Figma node/frame identity is a source locator, not an invented
CSS selector. Views and variants retain their source meaning. A frame is mapped
to a responsive breakpoint only when that mapping is explicitly established.
Unavailable observations are represented as unavailable, never invented.

Only observations belong in this schema. Planned target structure and concrete
implementation decisions belong in the design plan. Reference structure, planned
structure and actual Storybook structure are distinguishable by ownership and
identity. Verification uses explicit correspondences rather than assuming equal
node IDs across a source and its implementation.

## Capture lifecycle and `workflow done`

1. Discover the applicable source skill and explore enough to identify the target,
   source capabilities and required capture scope. Clarify required missing
   states or views with the user. This exploration is preparation, not a complete
   published reference.
2. Assemble a capture workflow from the source skill's discovered tasks, schemas,
   rules and outputs. Dynamism is in this assembly: after creation its definition
   is fixed, using the existing workflow execution contract.
3. Execute the capture tasks. Submit structured results and artifact evidence
   through `workflow done`, using the same validation/writing mechanisms as other
   workflow outputs. No special source-specific completion command is needed.
4. Validate the shared schema, selected coverage, structure relationships, source
   identities and referenced files. A file's existence alone is insufficient;
   images and observations must describe the intended subject.
5. Make the reference revision available to planners only when the required
   capture outputs are complete and valid. A failed preparation stays incomplete
   and can be corrected using the existing task lifecycle. It never replaces the
   last complete revision or becomes a runnable plan input.
6. Bind the completed reference ID and revision in the design plan. The capture
   workflow's result is consumed without another reference write in the design
   workflow.

This does not require an additional arbitrary all-files batch API. Individual
task outputs use ordinary `workflow done`; publication of a usable revision is
gated on the complete selected capture contract. Partial preparations may exist
on disk but are not published references.

If exploration or capture reveals additional scope, create a new fixed capture
definition for it. Do not append tasks to an executing definition. Refresh and
scope extensions produce new revisions; existing plans continue to use their
bound revision, never an implicit latest version.

## Writer and integrity contract

`workflow done` owns uniform schema validation and serialization of metadata and
extract results. Reuse the existing result writer rather than introducing another
serializer with different formatting behavior. Binary files retain exact content
integrity checks and must be the declared capture/asset files.

Once a revision is published, design workers have read-only access to it. They
do not resubmit its contents through a writer merely to record a dependency.
This prevents the observed newline-only mutation without teaching workers to
repair hashes or weakening checks for real reference changes.

The capture workflow may produce a new revision using the shared writer; it
cannot update a revision already bound by another plan. Publication must not
expose a mixture of old and new capture outputs.

## Context and planning boundary

The source skill supplies observations and evidence. Intake fixes the requested
selection and requirements. The stronger planner owns implementation decisions;
the capture stage must not also author the component architecture or target DOM.

The CLI supplies typed, bounded selections by reference/revision, subject, view,
state and required material, including necessary shared dependencies. Raw source
dumps stay on disk. Missing required information yields specific findings rather
than fallback to a whole extract or guessed data.

Each execution step receives all necessary decisions and resolved input data in
advance. Further CLI reads are allowed for targeted checks against the same
revision and scope. A missing design decision blocks the step; the worker does
not access the live source, refresh evidence or become the planner.

## Relationship to existing experiment contracts

Keep the bounded query, provenance, dependency deduplication and per-step context
requirements from [extract queries](extract-queries.md) and the shared-context
requirements from [plan references](plan-references.md).

This specification supersedes their earlier placement of target decisions inside
reference packages and any requirement to repeat reference writes in the design
workflow. Shared source/Storybook observations use the observation schema; target
decisions remain in the plan. Step assembly can supply both without merging their
ownership or asking the worker to infer missing decisions.

Existing stored test artifacts are disposable. Implement the new writers/readers
and test from fresh artifacts; no migration, compatibility reader or repair of
old test workspaces is part of this work.

## Acceptance criteria

1. A source skill can contribute a different source locator and capture task set
   without adding source-provider dispatch or extraction logic to the shared CLI.
2. A website with sm/xl views and menu states produces one complete reference
   revision with a single meta.yml. All declared evidence is associated correctly.
3. A non-web source can preserve frame/node identity and available views under
   the same core schema. Missing responsive or interaction evidence remains
   explicit and blocks publication when required by the chosen scope.
4. Source observations and Storybook observations validate against the same core
   schema. Planned structure is stored separately, with explicit comparison links.
5. A dynamically assembled capture definition stays unchanged while running;
   its tasks complete through `workflow done` and the existing output validators.
6. Missing/invalid required files or observations prevent a usable reference
   revision. A failed refresh leaves the previous complete revision available.
7. A plan remains bound to its original revision after a successful refresh.
   Design execution and read-only queries leave that revision's files unchanged,
   including final newlines and other serialization bytes.
8. The design workflow consumes a completed capture result without resubmitting
   meta.yml or extract.json for writing. A newline-only rewrite cannot arise from
   merely consuming the reference.
9. Intake presents selected source locators, planned implementation selectors,
   views/states and evidence to the user. The test harness verifies the supported
   source's contract without imposing website-only locators on other sources.
10. A fresh official Promptfoo case exercises capture, planning, execution and
    actual Storybook verification with independently configurable planner and
    worker models. Previous runs are not inputs. Error-page screenshots and
    missing selectors cannot establish a visual pass.

## Implementation and verification scope

Update the shared design schema and source-intake instructions, capture workflow
assembly, `workflow done` output integration, source-neutral reference storage and
query bindings, and the design workflow's reference-consumption boundary. Adapt
source integrations and Storybook capture to the same contract. Figma support is
not a new Figma client embedded in the CLI; a source skill supplies that access.

Use focused tests for shared writer/revision publication, incomplete submissions,
fixed revision binding, common schema compatibility and read-only consumption.
Exercise a second source shape with deterministic fixture data; do not claim a
live Figma integration passed when only a fixture was tested. Run `pnpm check`
and the matching fresh debo-test/Promptfoo case for runtime changes. Preserve
all failed phases, native usage and actual capture evidence in the run audit.

## Implementation evidence

The shared capture lifecycle and separate website/Figma/Storybook skills are
implemented. Capture completion uses ordinary workflow output validation and
publication. Design and sync verification consume two published revisions with
explicit comparison mappings. Repair checks retain their orchestration and resolve
frozen source queries plus exact predecessor screenshot paths. Promptfoo accepts only completed reference capture
workflows during intake, checks every selected subject/locator/view/state before
handoff, and preserves capture files and workflow documents through planning and
worker execution.

Coding QA found and corrected the old sync verification writer and a full-manifest
query duplication. A regression fixture with 450 unrelated assets keeps a selected
query below 10 KB while still detecting a mutation to an unrelated published file.
Figma coverage uses deterministic node/frame fixtures; no live Figma capture has
been tested.

At this point `pnpm check` passes (848 unit tests), and all 66 Promptfoo harness
tests pass, including a real Promptfoo invocation with deterministic planner and
worker CLIs. A fresh real-model functional run is still required; harness success
alone does not establish generated design quality.
