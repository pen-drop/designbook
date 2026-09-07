# Plan references and deduplicated step context

Status: user-confirmed implementation contract. DESIGNBOOK-58 remains in coding.
This records the approved current-state changes, not a later GAIA state.
The user accepted rounds 1–2 and requested one subagent per workstream.

## Observed problem

The Opus reference plan has 28 tasks and 85 shared context entries referenced
974 times. The Markdown export expands those references into approximately
3.47 MB of repeated context. Its total size is approximately 4.82 MB. The saved
definition itself is approximately 730 KB in compact JSON. Repeated task
instructions occupy about 63 KB; six distinct instruction objects occupy about
12 KB. These are byte counts, not token or runtime savings.

Evidence: `promptfoo/reports/designbook-58-opus-reference-01/` and the user export
`/tmp/designbook-58-opus-plan.md`. The current renderer unnecessarily expands the
shared context for every task and prints some state more than once.

## Confirmed requirements

- The executor loads an overview, then one workflow step, never the full-plan export.
- It creates all independent component tasks of a step and submits them together.
- Every required result must pass before the batch is marked done.
- Instructions and shared context must be retained without information loss.
- A complete human-readable Markdown export must be available through the CLI.
- The saved run remains independent of subsequent edits to skill source files.
- New definitions use the new format. No migration or compatibility reader.

## Round 1 confirmed decisions

Q1 confirmed: YAML/JSON remains the authoritative saved plan with explicit
reference IDs. Markdown is generated with stable internal links. Runtime
resolution uses IDs, not Markdown heading parsing.

Q2 confirmed: deduplicate identical content only. Do not summarize, rewrite or
merge semantically similar instructions. Preserve real differences and provenance.

## Final decisions and implementation constraints

Q4 confirmed: the Markdown export contains only the fixed plan and serves human
inspection. Runtime state, results, attempt history and resolved predecessor
values do not belong in that export. They remain available through execution
inspection APIs and reports.

The user additionally requires the most precise possible plan. Every target,
parameter, dependency, reference requirement, output path, validation constraint
and acceptance observation must be concrete before execution. Dedupe must never
summarize or weaken instructions. Runtime resolves data; it does not invent
scope or decide missing structure.

- Store shared instruction/rule/blueprint content once inside the immutable
  definition and reference it by explicit stable IDs. Reuse the existing context
  registry where appropriate rather than creating competing registries.
- Deduplicate exact content deterministically and preserve all source provenance.
  Similar but different text remains separate. Schema/output constraints must
  retain requiredness, validators, direct/data submission and all types.
- References resolve inside the saved definition; source paths are provenance,
  never runtime instructions to rediscover current skill content.
- Reject dangling references and any permitted reference cycles during definition
  validation. Prefer a flat registry, which avoids recursive content references.
- Full-plan Markdown prints each shared block once, with stable anchors and links.
  Task sections carry their concrete values/contracts and internal references.
- Step context expands only that step's required material, each shared block once,
  plus all its tasks and referenced predecessor data. Later-step material and
  the whole workflow template do not enter the execution response.
- Keep human full-plan export and scoped executor context visibly distinct.
- The planner must preserve the discovered contracts. Validate all mechanically
  checkable equivalence; do not accept broad object schemas replacing real types.
- Update writers/readers and fresh tests to the new shape. Do not repair or read
  old artifact formats through compatibility branches.

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

1. A plan with many components sharing instructions/context emits each identical
   shared text once in Markdown and once per relevant step response.
2. Resolving references reproduces the exact required material and constraints;
   a changed instruction remains distinct and missing references are rejected.
3. Full-plan Markdown contains no mutable state/results and has working internal
   anchors. Different task parameters/outputs remain explicit and unchanged.
4. Step overview and lifecycle responses stay compact. Existing batch validation,
   immutable definitions and future-step exclusion remain intact.
5. Fresh authored definitions preserve catalogue contracts; regress the diagnostic
   failure where full instruction/schema bodies were replaced by short summaries
   and generic objects. Report boundaries that cannot be enforced statically.
6. Run focused tests and pnpm check. Parent owns the combined fresh Opus design
   run and context/size measurements; no quality or token-win claims from unit tests.

## Subagent ownership and integration

Plan subagent owns workflow-document.ts, workflow-store.ts, workflow-steps.ts,
workflow-markdown.ts, cli/workflow.ts and their tests; also the core
resources/workflow-building.md, workflow-execution.md and cli-workflow.md.
Extract internals and schemas are owned by the second agent. Do not edit its files.

Integration seam: parent connects a task's fixed reference requirements to the
extract agent's typed query API and includes only its validated result in step
context. Plan agent leaves a clear integration point and coordinates any proposed
schema field with the extract agent before changing shared contracts. No agent
runs model evaluations or rebuilds a running test checkout; parent owns those.

## Implemented interface

- `tasks[].instructions` is a registry ID, like `tasks[].context[]`.
- Registry entries retain `source` and exact `content`; `sources` preserves all
  origins when byte-identical bodies merge. Initial creation canonicalizes exact
  duplicates using the lexicographically first authored registry key. Persisted
  documents are validated and read as-is, never upgraded.
- Markdown uses explicit `context-<hex-encoded-ID>` anchors, independent of
  heading slug conventions. Full export includes definition contracts and
  references, never mutable state or predecessor result values.
- CLI `validate` and `create` require `--catalogue <saved-discover.json>`.
  Fidelity checks cover exact instructions and matched rules/blueprints/config
  context, parameter and result schema graphs, requiredness, submission and
  validators. Renamed internal schema definitions are permitted only when the
  resolved graph is equivalent. Concrete catalogue paths remain exact; templated
  paths must resolve to absolute paths. Meaningful visual decisions and the
  correctness of those substituted values remain semantic validation boundaries.

- Consuming tasks may persist `reference: {query, reference_schema, extract_schema}`.
  Query preparation freezes scope/files/contract before save. CLI validation and
  initial creation validate all requests; scoped execution revalidates only the
  selected step's requests and fails on changed fingerprints.
- Step output replaces each full reference requirement with a stable packet ID
  and emits each identical validated packet once in `references`. Reference-only
  validation schemas remain outside the executor response. Single-task inspection
  uses the same packet interface; full-plan Markdown retains the fixed query and
  schema contracts for human inspection without expanding reference artifacts.
