# Targeted extract queries and deterministic reference checks

Status: user-confirmed implementation contract. DESIGNBOOK-58 remains in coding.
The user accepted the final recommendations and requested one subagent per
workstream; this is not a new GAIA spec/review state.

The 2026-09-08 [reference capture workflow specification](reference-capture-workflows.md)
supersedes the placement of target decisions in reference packages and repeated
reference writes during design execution. It defines source-skill capture through
`workflow done`, a shared source/Storybook observation schema and immutable
reference revisions. Bounded queries and complete step work orders remain required.

## Observed problem

The reference analysis contains structure, typography, colors, assets, fonts,
interactive states and breakpoint measurements. Passing broad extract data and
validation instructions repeatedly consumes context. The existing extract task
already asks the model to query files using jq, but has no dedicated typed query
contract for the data required by a workflow step.

Current sources: `.agents/skills/designbook/design/schemas.yml`,
`.agents/skills/designbook/design/tasks/extract-reference.md`,
`packages/storybook-addon-designbook/src/cli/extract-page.ts` and
`packages/storybook-addon-designbook/src/inspect/`.

The extract command writes a skeleton while the task expects an enriched
DesignReference. The task result contract currently exposes reference metadata
and screenshots but no typed final extract result. This distinction needs an
explicit validation boundary; raw observations are not automatically a complete
validated design analysis.

## Confirmed requirements

- Keep the complete reference data available on disk as a frozen run input.
- Validate machine-checkable requirements through the CLI.
- Supply only the data required for the current step and its component subjects.
- Include relevant breakpoints and required dependencies such as parent layout,
  typography and referenced assets; do not silently omit necessary design context.
- Selector choices and their evidence remain visible in intake and statically checked.
- Semantic/visual correctness still requires model inspection and design verification.
- No migration or compatibility code for earlier disposable artifacts.

## Round 1 confirmed decision

Q3 confirmed: the planner fixes each step's reference requirements; the CLI
resolves them automatically. Keep an explicit query command for inspection and
diagnosis, without allowing runtime scope drift.

## Final decisions and implementation constraints

Q5 confirmed: use fixed data packages per task kind. Do not return the entire
extract and do not make the executor assemble it through many scalar queries.
A component package contains its selected structure/layout, typography/assets,
breakpoints/interaction states and necessary parent layout. Shared dependencies
appear once per package. Return all design-relevant fields in the selected scope;
no lossy summarization or guessed omissions.

The user requires the plan to be maximally concrete. During intake the planner
fixes the subjects, states, breakpoints and package kind for each consuming task.
The CLI verifies these requirements before the definition is runnable. Execution
reads a validated, immutable selection and does not choose new subjects/fields.

- Introduce a typed deterministic API in a dedicated module (suggested
  reference-query.ts) and a thin CLI command registered independently.
- Query requests identify the frozen reference, package kind, exact subject IDs,
  states and breakpoints. Match by recorded identities, not heuristic CSS/name
  similarity. No silent fallback to the full extract.
- Include direct dependencies needed to interpret selected subjects: parent
  layout, fonts and referenced local assets. Deduplicate shared dependencies.
  Reject missing/ambiguous required dependencies with actionable findings.
- Distinguish raw browser observations from the enriched, typed design analysis.
  Use the effective schema contract rather than duplicate schema definitions.
  Raw observations must not pass as a completed reference merely because a file exists.
- Statically validate schema, required fields, selected metadata/capture matrix,
  and local assets. Selected required-field failures block intake before freezing.
  Optional missing values remain explicitly absent; never invent defaults as evidence.
- Reading a frozen query is read-only: no network, capture refresh, artifact rewrite
  or scope changes during step execution. Visual/semantic confirmation stays in
  intake and the separately requested design verification.
- Return only selected data, deduplicated dependencies, provenance/fingerprints and
  compact successful-check information. On failure return precise field/subject
  findings without dumping the entire extract or its whole schema.
- Fresh artifacts use the new contract. No migration, fallback parser or legacy repair.

## Planner/executor capability boundary

The user explicitly wants a very simple execution model. A capable planner owns
all reference interpretation, component decomposition, structural choices, data
selection, concrete values and acceptance checks. The execution model receives
a complete validated work order for one step and produces the specified outputs.
It must not be expected to recover missing design decisions by reading the full
extract/catalogue or by rediscovering skills. Missing decision-critical data is
a planning failure and blocks execution rather than inviting a guess.

Planning and execution must use separate model invocations; step-scoped CLI
output alone does not erase a planner conversation. Model selection is configurable.
Parent owns the Promptfoo planner/executor phase split and measurement, while
this workstream exposes the complete bounded data needed by that interface.
A smaller model succeeding under unchanged quality gates is a required outcome
of the eventual model comparison, not a claim from serialization improvements.

## Acceptance and verification

1. Header-only/component-package queries exclude unrelated footer/body data while
   preserving all requested state/breakpoint information and necessary dependencies.
2. Multiple subjects sharing fonts/assets receive each shared dependency once.
3. Missing subjects, required values, assets or screenshots produce deterministic
   failures; raw/incomplete extraction cannot be reported as a valid final reference.
4. Query execution leaves source bytes unchanged and preserves exact identities,
   provenance and declared scope. No hidden browser/network calls.
5. Output size is measured against full extract input without calling byte savings
   token savings. Parent validates rendered quality and native context use with Opus.
6. Focused API/CLI/schema tests pass. Parent owns the combined pnpm check and fresh
   end-to-end model evaluation after the two workstreams are integrated.

## Subagent ownership and integration

Extract subagent owns new query/validation modules and tests, cli/extract-page.ts,
cli/inspect-register.ts (or a dedicated new reference registration module), and
core design/schemas.yml, design/tasks/extract-reference.md plus directly relevant
reference intake instructions. Load designbook-skill-creator and matching rules
before editing guarded skills. Coordinate any other file before editing it.

Plan subagent owns workflow storage/context/Markdown and its core builder/executor
resources. Do not edit those files. Agree a typed request/result interface with
that agent early; parent connects it to saved task requirements and step context.
Do not launch model runs or rebuild a live test runtime. Parent performs the
combined official debo-test/Promptfoo validation.

## Implemented correction after the Astra diagnostic

The first Astra plan passed schema/fidelity checks but copied query responses and
broad measurements into ordinary context. Even asset/font setup received a
4,456,252-byte step context. The correction separates reference evidence from
executor decisions in fresh artifacts:

- `ReferenceSample.observations` retains raw measurements on disk. Each selected
  `component`, `composition`, `tokens` or `assets` package contains its own complete
  target decisions and exact parent/asset/font dependencies. Queries return that
  selected package intact, without the sample's observations or sibling packages.
- Component/composition structures use an explicit target node graph. Missing,
  unreachable, repeated and cyclic placements fail validation. Assets packages
  load only their declared files/fonts, without parent layouts or component DOM.
- Raw extract/query/measurement shapes in general plan context, params and inputs
  fail catalogue validation, even when encoded as JSON/YAML strings. Exact
  catalogue bodies retain their full text with verified provenance. Authored
  context plus params has a 64 KiB per-task bound; individual package/dependency
  material has a 64 KiB bound. Failure requires decomposition or narrower typed
  packages, never automatic truncation or loss of decisions.
- Promptfoo checks every planned worker prompt before any worker starts, then
  checks again with actual predecessor results before each invocation. The
  configurable `stepPromptMaxBytes` default is 262144 UTF-8 bytes. Saved
  `.context.json` evidence records sizes and limits. This is a transport/context
  guard, not token estimation or a quality score.
- Codex and Claude consume prompt text through stdin, avoiding the separate OS
  argument-size failure. This transport change does not waive the size checks.

Structural checks cannot prove that every design decision is appropriate or that
an arbitrary prose passage contains no copied measurement. Fresh model execution
and visual verification remain necessary. Earlier failed artifacts are evidence
only; they are neither migrated nor repaired into the new format.
