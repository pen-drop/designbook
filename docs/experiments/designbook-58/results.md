# DESIGNBOOK-58 measurement work

Coding is in progress. No efficiency measure has been accepted and no valid
Codex baseline exists yet. The historical design runs remain diagnostic.

The frozen case selections and preflight settings are in `manifest.json`.
Reference content still needs a fixed artifact snapshot before efficiency
comparisons; the current diagnostic uses the cases' original live reference.

## Measurement changes

Commit `732b84f5` adds Grok 4.6 to the existing Promptfoo provider pipeline,
checks terminal usage against every complete assistant message, pins Codex
reasoning to medium, and retains valid terminal usage after process or artifact
collection failures. CSV records native usage source, scope, known subagent
contribution and evidence paths. Historical missing values remain unknown.
These are measurement corrections, not measured workflow optimizations.

The Grok preflight exercised two model turns and a real `pwd` tool call.
Native terminal counts matched per-message sums: 66,125 total input tokens
(including 33,024 cache reads), 125 output tokens, 66,250 total tokens.
The CLI reported 13,570 ms; this is its native duration, not total provisioning
or outer process wall time. Reasoning tokens were unavailable. This smoke is
recorded as `cli-preflight/grok-tool-smoke`, not as a design case or baseline.
Raw evidence: `promptfoo/reports/designbook-58-preflight/grok-smoke.jsonl`.

Validation before commit: `pnpm check` passed typecheck, lint and 778 tests
across 89 files. The separate `node --test promptfoo/tests/runner.test.mjs`
passed all 26 tests, including all three adapters through Promptfoo, invalid
Grok counters/terminal results, failed-run usage retention and CSV accounting.

## Attempts

| Attempt | Source | Purpose | Status |
| --- | --- | --- | --- |
| designbook-58-preflight | 90a8e5ef + measurement patch | Grok native counter contract | Smoke passed; no design score |
| designbook-58-shell-diagnostic-01 | 732b84f5 | Fresh Codex shell plus separate verify | Invalid; 0/4 visual checks passed |

The shell diagnostic uses `gpt-5.6-luna`, medium reasoning, a 3,600,000 ms
limit per CLI call, disabled Promptfoo caching, and Storybook port 6118.
Its report directory is `promptfoo/reports/designbook-58-shell-diagnostic-01/`;
its fresh workspace is `promptfoo/workspaces/designbook-58-shell-diagnostic-01/`.
Full temporary workspaces and raw logs remain outside Git.

## Outstanding gates

AC1–AC3 need runtime contract corrections and diagnostic evidence. AC4–AC6
need successful baseline repetitions, isolated candidate comparisons, the
combined comparison and model/held-out validation. AC7 has a versioned
measurement history and report, but experiment accounting is incomplete.
AC8's code checks pass; the real workflow gate failed.
Optimizer/coordinator usage has not been measured and remains unknown.

## Diagnostic 01 audit

Main used 6,615,929 tokens in 586,121 ms; verify used 7,162,552 tokens in
627,685 ms. Total measured CLI work: 13,778,481 tokens and 1,213,806 ms
(20.23 minutes), including 13,259,008 cached input tokens and 8,901 reasoning
tokens as subsets. Provisioning adds outer wall time and is not in these CLI
phase durations. The original CSV phase rows retain Promptfoo's raw outcomes:
main passed its weak assertions; verify failed with score 12 and 0/4 checks.
All four captures were error pages/missing selectors, so their 61.58–77.31%
diff ratios do not measure rendered design fidelity.

Native log audit found a deleted/recreated workflow and before snapshot
(main events `item_55`/`item_57`), failed Storybook build (`item_59`), and
weakened output schemas. The initial definition was recovered from native event
`item_40` into `initial-observed-workflow.json` alongside the reports. Verification
embedded PNG bytes into YAML through string output schemas. The detailed audit,
friction, summaries and screenshot evidence stay in the diagnostic report/workspace.

The next infrastructure correction adds external creation-time/definition
snapshots, fail-closed build/browser acceptance, PNG definition validation,
root workspace CLI/build tooling and copied skill inputs. It also retains valid
Claude/Grok terminal-error usage without treating those responses as success.
Both new regressions failed before their fixes. Afterward `pnpm check` passed
780 tests in 89 files; all 32 separate Promptfoo tests passed.

A bounded `gpt-5.6-luna` optimizer proposed a single-file planning-contract
correction from the training findings only. The proposal has not been evaluated;
its native token usage is unknown. It received no held-out inputs or reports.

## Diagnostic 02 audit

Source `651a6580` plus the single-file planning proposal; fresh workspace
`promptfoo/workspaces/designbook-58-shell-diagnostic-02`, Storybook port 6119.
Reports and detailed audits: `promptfoo/reports/designbook-58-shell-diagnostic-02/`.
Main used 6,493,071 tokens in 861,290 ms; separate verify used 4,685,629 tokens
in 528,755 ms. Total CLI work: 11,178,700 tokens and 1,390,045 ms. These are
failed diagnostic costs, not savings against diagnostic 01.

Both external definition snapshots remained intact, and PNG outputs used direct
image contracts. Main failed the stronger browser-observation gate. Inspection
found that the shared `validate` task had no result declaration, so the planner
invented a generic result even while preserving declared component contracts.
The public catalogue also omitted root required lists and mixed observed file
contents/existence flags with JSON schema entries.

Verify reported score 6 and 2/4 passing comparisons. Image inspection invalidates
that quality score: the reference `footer` matched an article footer containing
“​​Aktuelle Themen im Überblick”, while the story capture contained legal/footer
links. Their mostly empty 1600px canvas gave misleading differences of 0.05–0.11%.
The story header used the reference's `app-site-header` selector and matched
nothing. Header warnings were recorded as critical. The run is unevaluable.

The single-file optimizer proposal is not accepted as an efficiency improvement.
Its exact patch and decision remain in `research-runs/designbook-58/candidates/correctness-01/`.
The next correctness change exposes definition-ready parameter/output contracts
in `workflow discover` and gives the shared final validation task required build
and browser-evidence outputs. This changes the catalogue interface and requires
fresh baseline runs. No compatibility conversion is introduced.


## Grok Promptfoo preflight

On source `3f68f2b9`, `drupal-petshop/vision` passed through the real Grok 4.6
adapter and Promptfoo runner. The saved definition remained unchanged and the
vision artifact passed the case assertions. Native per-message usage matched the
terminal counters: 2,440,787 input tokens (2,327,040 cached) plus 14,634 output,
2,455,421 total; measured CLI duration 310,789 ms. This nonvisual preflight proves
runner/usage integration, not the final Grok design-quality acceptance.
Evidence: `promptfoo/reports/designbook-58-grok-preflight/summary.json`.

## User-required intake presentation

The user clarified during coding that design intakes must show selector choices
before building, and that this must be the first part of the Promptfoo main run
with deterministic validation. The shared write-planning contract now requires
a visible inventory. Reference intake requires observed screenshot/DOM evidence
at every requested breakpoint and keeps reference/story selectors distinct.
Promptfoo checks the assistant's table against declared reference selectors and
breakpoints, requires it before the first native workflow create/start/done
command, and fails closed when ordering evidence is absent. It also emits the
table during the CLI run. This static check establishes presentation and scope;
visual correctness still requires the screenshot audit and separate verifier.
These are user-requested correctness/measurement changes, not accepted token wins.


## Diagnostic 03 audit

Source `0b086d7f`; fresh workspace/report suffix `designbook-58-shell-diagnostic-03`,
Storybook port 6121. Main selected the actual site footer (newsletter, sponsor
logos, legal links), but ended at the intake table without creating a main
workflow. The heading was duplicated and story selectors were descriptive
placeholders. Main used 1,364,020 tokens in 213,780 ms.

Separate verify used 4,680,474 tokens in 569,041 ms: total 6,044,494 tokens and
782,821 ms of CLI work. No scene existed; all four story captures fell back.
Verify also changed frozen selectors and task IDs after snapshot; both integrity
checks rejected that mutation. Its reported score 12 and 0/4 passes are invalid
as rendered-design measurements. Detailed audits remain beside the raw reports.

The follow-up prompt explicitly requires completing intake and execution in the
same invocation. Static intake validation rejects descriptive story-selector
placeholders/duplicate subjects, handles a valid table after a repeated heading,
and parses shell quoting so documentation searches do not become lifecycle
commands. Intake text is displayed even when its table is invalid; validation
still fails. `pnpm check` passes 783 tests; separate runner checks pass 38 tests.
No efficiency gain is claimed from this incomplete run.

## Diagnostic 04 audit and intake phase correction

Source `06b1d20f`; fresh workspace/report suffix `designbook-58-shell-diagnostic-04`,
Storybook port 6122. The complete selector table was emitted with concrete planned
`.page__header`/`.page__footer` selectors and real reference screenshots. Main
again ended at the table without creating a workflow: 783,596 tokens, 148,959 ms.
Separate verify correctly blocked on the missing main workflow/scene and misplaced
baseline paths; it produced no rendered score: 1,880,048 tokens, 232,842 ms.
Total: 2,663,644 tokens and 381,801 ms. This is failed work, not a token saving.

After two terminations at user-facing intake output, the runner now makes intake
an explicit first Promptfoo evaluation. It statically validates the complete
selector table, reference metadata and canonical capture paths, saves the effective
planning catalogue, and creates an external handoff only on success. Main then
uses the same workspace and fixed selections. Intake alone provisions fixtures;
failed intake skips main explicitly, while requested separate verification remains.
All phases retain separate native usage rows under the same run ID. This changes
the measurement pipeline and requires a new baseline; it is not an accepted
workflow-splitting efficiency hypothesis.

Capture, asset, extraction and catalogue bytes are frozen between intake and main.
YAML reference metadata is compared by complete parsed value to permit formatting
by the normal result writer. The native intake transcript remains the presentation
proof; main's declared selectors/breakpoints must agree. Pipeline tests cover
intake/main/verify failures, setup isolation, handoff scope, metadata formatting
and changed-reference rejection. Separate runner tests pass 41 checks.

## Diagnostic 05: first intake phase exercised

Source `93ea7d1b`; fresh workspace/report suffix `designbook-58-shell-diagnostic-05`,
Storybook port 6123. The separate first intake phase passed with a visible
selector inventory: `scene-header` / `body > app-root > app-site-header` and
`scene-footer` / `body > app-root > app-footer > footer`, both at `sm,xl`,
with planned `.page__header` / `.page__footer` story selectors and four real
baseline captures. Main consumed the handoff, preserved its reference artifacts,
and passed the presentation-order check before creating its workflow. External
definition checks reported no mutations in either main or separate verify.

Intake used 2,103,280 tokens in 349,313 ms; main used 4,480,426 tokens in
490,956 ms; verify used 2,082,497 tokens in 283,575 ms. Total measured CLI
work: 8,666,203 tokens and 1,123,844 ms. CSV durations additionally include
provider overhead and are retained separately. This is failed diagnostic cost.

Main built components and Storybook but final rendering blocked: its shell
used an invented `content_injection` entity instead of the required root
component `$content` slot. Verify independently blocked because it requested
`header/footer` baseline IDs although the intake provided `scene-header/scene-footer`.
It performed no comparisons and produced no usable quality score.

The first static intake gate is now exercised end-to-end. It establishes visible
presentation, reference selector/capture bindings and ordering; it does not
establish full reference/extract schema validity or that planned story selectors
match rendered DOM. The shell structure and verifier subject preservation remain
open correctness issues. No valid baseline or efficiency improvement is claimed.
Detailed phase accounting is saved beside the reports in `summary.json`.

## Context logging and step execution requested during coding

Commit `6fc87d6e` retains per-request context logs per Promptfoo phase. Codex
now persists its native session; the harness archives it and emits request
input counts, context-window observations and compaction events. Claude/Grok
use native message usage including cache reads/writes, deduplicated by message
ID and excluding subagent messages. Missing counters remain unknown. Context
summaries are root-thread observations, not cumulative phase token usage.
A real Codex smoke reported 17,371 input + 5 output tokens, a 258,400-token
context window and no compaction; evidence is in
`promptfoo/reports/designbook-58-context-smoke/`. It is not a design score.

The user requested full-plan Markdown exports, then clarified that execution
must load only a step and produce all its tasks before a joint completion.
The implementation adds explicit task `step` IDs, compact step routing,
step-scoped Markdown/JSON context and joint start/done/block operations.
Independent tasks share a step; dependencies cross steps and step cycles are
rejected. A failed batch preserves validation evidence and leaves all batch
tasks pending. Lifecycle responses no longer return the entire definition.
The full Markdown plan remains an explicit human inspection command.
This changes the execution contract and requires fresh workflows and a new
measurement baseline. It introduces no conversion for earlier saved documents.

Inspection of diagnostic 05's saved plan found shortened instructions for all
seven tasks and zero embedded shared schemas, despite the intake catalogue
containing full instructions and schemas. Definition immutability alone did
not detect this initial omission. Detailed evidence and a full Markdown reading
view are beside its reports. This remains an open planning-fidelity issue.

The user selected Opus as the reference model. A fresh `claude-opus-5` shell
run was launched on `6fc87d6e` before the step API changes, with the original
CLI bundle kept fixed during execution. Intake passed: 12,263,084 total tokens,
92 root message requests, peak input 228,466 tokens, reported context window
1,000,000 and zero observed compactions. Main reached 28 completed saved tasks
but its CLI invocation timed out after 3,600,000 ms without a successful terminal
result; final phase usage is unknown. Its observed 148 root message requests
peaked at 487,178 input tokens, with no observed compaction. Separate verification
finished but failed the typed score-report gate. No successful reference baseline
or efficiency gain is claimed.


## Completed Opus reference and isolated step diagnostic

`designbook-58-opus-reference-01` verification used 12,871,760 tokens. It authored
`score_report`/`score_report_file` with a `rows` object instead of the discovered
`score-report`/`ScoreReport` contract. Its raw comparisons report header differences
0.0016/0.0018 and footer differences 0.1676/0.1282 at sm/xl (fixed threshold 0.03).
Those are unaudited comparison values, not an accepted quality score. Known intake
and verification usage totals 25,134,844 tokens; total run usage remains unknown
because main timed out. Verification's peak root input was 223,059 tokens.

The isolated step-runtime diagnostic used equivalent source trees e98d8e8c plus
525f50d4 (detached commit a6fa5eb7), in
`/tmp/designbook-58-step-runtime-e98d8e8c`. Initial attempt `opus-step-01` failed
bootstrap before any model call because the renderer imported an unbuilt CLI
module; 525f50d4 made the evidence renderer lazy. Fresh `opus-step-02` then failed
intake's selector binding for `scene-header-search`, so main was correctly skipped.
Its separate verifier confirmed the absent shell scene and emitted Markdown in
place of the typed score report. It cannot measure batch execution or design quality.
Intake used 9,965,113 tokens and verification 9,443,126: 19,408,239 total failed
run tokens. Their peak root inputs were 189,036 and 162,293. Both phase CSV rows
are preserved unchanged from the isolated checkout, including its source identity.
Detailed summaries, native workflow calls and outtake-contract audits are beside
each run's original reports. Neither failed attempt is a comparison baseline.

## Approved precise planning and simple execution contract

The user confirmed the two design documents `plan-references.md` and
`extract-queries.md`. Shared instruction bodies now have internal registry IDs,
are deduplicated exactly, and appear once in the human-only Markdown plan. Saved
catalogue validation rejects shortened instructions, altered output contracts and
weakened referenced schemas, including references with sibling constraints.

Reference analysis now provides typed task-kind packages with exact subjects,
states and breakpoints, ancestor layouts and local assets/fonts. Preparation
validates the effective schemas and freezes source fingerprints; execution
resolves and deduplicates only the current step's packages. Missing or changed
material blocks execution instead of inviting a model guess.

An explicit Promptfoo mode separates capable intake/planning/verification from a
fresh smaller-model call for every execution step. Static gates retain intake
presentation and frozen evidence, check completion of the exact assigned batch,
and reject other-task state changes. Existing final build/case and separate visual
gates remain. The first combined model run is still required; serialization and
unit tests alone do not establish lower token use or acceptable visual quality.

Implementation checks before the combined run: `pnpm check` passed 810 tests
in 93 files after typecheck/lint, addon build passed, and the rebuilt provider
passed all 52 Node/Promptfoo regression checks. These are implementation checks,
not model quality evidence.

Two handoff gaps found during integration were corrected in an isolated coding
checkout so the active acdb837a model run remains unchanged. Downstream inputs
may no longer bind the complete `reference_extract`. Intake now runs the same
reference validation engine before freezing: effective schemas, every declared
cell, every present package kind and local evidence must pass. The compact CLI
validation is saved in native evidence and the handoff. Isolated checks passed
828 tests/93 files, addon build, and 55 Node/Promptfoo checks. The active model
run does not include these additional guards; do not attribute its results to them.

The phase artifact assertion was corrected after inspection found that ordinary
provider output has no `modifiedFiles`, and `newFiles` includes copied skills and
fixtures. Planning now compares protected application file hashes against the
intake inventory using effective configured paths. It permits unchanged fixtures
and authoring scratch files while rejecting generated, changed or deleted
application artifacts. A regression now runs the actual Promptfoo evaluator with
stub native CLI processes and real workflow create/start/done commands through
planning and two distinct execution calls. Final checks: 828 addon tests and
57 Node/Promptfoo tests passed. This is not a real-model quality result.

## Split-model diagnostics and external limit

`opus-luna-steps-01` ran on acdb837a. Intake passed its then-current gates, but
additional read-only validation identified relative asset IDs where the extract
uses absolute URL identities. The planner subsequently rewrote the frozen
extract to correct that mismatch, violating the handoff. It never attempted
workflow validate/create and left only partial Python work-order files in
`/tmp/plan-ds/`. Claude's session limit ended planning; the automatic verifier
also reported that limit. No complete plan or Luna execution resulted.
Intake used 7,854,691 tokens, planning 12,761,140, verification 0: total
20,615,831. Peak input was 194,434 in intake and 317,600 during planning.

`opus-luna-steps-02` ran in the isolated fad5d8c4 checkout. Its strengthened
intake gate passed the effective schemas, two subjects, six state/breakpoint
cells and 18 component/composition/token packages with local dependencies.
Intake used 11,149,558 tokens and planning 1,603,351; verification reported
0 after immediately hitting the same limit. Total: 12,752,909. Peak input was
223,161 in intake and 114,166 during planning. No executor call started.

Both runs ended naturally at the Claude limit before an attempted cancellation;
no process was signalled. The native message reports reset at 21:20 Europe/Berlin
on 2026-09-07. Their typed model failures occurred before evaluating the buggy
plan artifact assertion, so do not attribute the observed termination to that
assertion. All phase rows and native usage are retained, including zero reported
quota-rejection usage. Neither run is an efficiency or quality baseline.

The two isolated corrections are integrated on the ticket branch as a4e8ad1b
and 9296d79f. A fresh full real-model pass remains outstanding after quota
availability returns; no provider/model substitution or extra model run was
started under the known limit. DESIGNBOOK-58 remains in coding.

## Codex Astra planner / Luna executor diagnostic

`designbook-58-astra-luna-01` ran `drupal-web/design-shell` from 350fb660,
with `gpt-6-astra` for intake/planning/verification and `gpt-5.6-luna` for
execution, both Codex medium. Fresh workspace and Storybook port: 6128.
Intake passed with three subjects, 13 capture cells and 26 reference packages.
Planning passed all assertions and saved 25 pending tasks, with an immutable
Markdown export under `plan-evidence/run-thFQTp/workflow-1.md`.

The first executor step, `setup-assets-fonts`, failed before native process
creation with `spawn E2BIG`. Its resolved Markdown was 4,456,252 bytes and was
passed as one CLI argument. Selected shared contexts included 2,227,027 bytes
of `measurements` and a 1,966,703-byte desktop-header package even for asset/font
setup. The valid plan therefore still supplies overly broad per-step context.
Passing large prompts through stdin would address transport only; it would not
establish that this context fits the executor or that package scoping is adequate.
No Luna model call occurred and no execution-quality conclusion is possible.

Automatic verification confirmed the missing shell scene and Storybook entry,
preserved main artifacts, and left comparisons ungraded. No accepted visual
score exists. Intake used 3,273,470 tokens, planning 2,931,915 and verification
476,296: 6,681,681 reported tokens, including 6,364,288 cached input tokens.
Native phase durations sum to 1,448,345 ms (about 24.1 minutes), excluding fixture
setup and failed-spawn overhead. Executor usage is absent; no estimate is added.

All four phase attempts remain in results.csv. Raw reports and the complete
`summary.json`, `log-validation.json`, `friction.json` and `context-failure.json`
are under `promptfoo/reports/designbook-58-astra-luna-01/`. Native failed authoring
commands and recovered validation errors are retained. This is a diagnostic,
not a quality/efficiency baseline. No saved artifact was repaired or rerun.

## Astra planner / Sonnet worker with scoped reference queries

`designbook-58-astra-sonnet-02` ran from ddceda34 in a fresh workspace on
Storybook port 6130. Intake and planning used Codex `gpt-6-astra`; workers
used Claude alias `sonnet` (the first native log identifies `claude-sonnet-5`).
Intake passed three subjects, nine state/breakpoint cells and 36 typed packages.
Planning passed with 40 tasks in 22 steps. The Markdown export is 541,754 bytes,
also copied to `/tmp/designbook-58-astra-plan.md`. All 22 complete worker prompts
passed the 262,144-byte preflight: 22,541–164,633 bytes. These are byte sizes,
not token estimates or a controlled quality comparison with the previous plan.

The three asset-provisioning workers passed. Worker four (`write-primitives-images`)
failed before native invocation: Promptfoo parsed literal markup in the resolved
work order as Nunjucks and reported `unexpected token: <`. Automatic verification
failed without a validated score-report. No complete shell or visual quality
result exists. The run is retained unchanged as a failed diagnostic.

Reported usage totals 11,779,847 tokens: 11,722,120 input (including 11,192,825
cached input) and 57,727 output. This is cumulative usage across native turns,
not the size of one prompt. The fourth worker has no native usage; none is estimated.
Reports, phase usage, byte bounds and transport findings are retained under
`promptfoo/reports/designbook-58-astra-sonnet-02/`, including `summary.json`,
`log-validation.json` and `friction.json`. The audit does not establish a complete
successful native-log or visual check.

The transport correction serializes each already resolved worker prompt as a
nested object variable, preventing Promptfoo from evaluating embedded Twig/code.
The native pipeline regression first reproduced the same failure, then passed
with literal interpolation, control and comment syntax preserved at the worker.
Byte preflight still measures the original complete prompt. The separate
nonfatal numeric-tag warning is corrected by serializing the byte-limit tag
as a string and parsing it for validation. These corrections are not retroactively
applied to this run.

The earlier `designbook-58-astra-sonnet-01` attempt was stopped during intake
at the user's request to inspect context first. No planner or worker started.
Its retained partial usage is 21,815 tokens; no final phase usage is inferred.

## Astra / Sonnet rerun after literal prompt transport correction

`designbook-58-astra-sonnet-03` ran from ec7a4708 in a fresh workspace on
Storybook port 6132. The intake failed before planning or Sonnet execution.
Astra presented the exact requested five-column selector table, but used
separate rows for each state, repeating the three subject IDs. The static
`selectorTable` parser requires unique subjects and reported the misleading
error "Missing complete user-visible selector table in intake". Removing only
duplicate subject rows in memory makes that same parser accept the table;
no run artifact was changed. The intake prompt does not explicitly state the
one-row-per-subject requirement. The native transcript retains all 13 capture
cells and the presented evidence paths.

Automatic verification failed all four header/footer breakpoint prerequisites:
no main definition, shell scene or target DOM existed. The inspected diagnostic
screenshot is an actual Storybook missing-story page, excluded from scoring.
There is no visual score and no new executor-quality result. An initial missing
shell-dom.json inspection command was recovered by a subsequent write/read;
both attempts remain in the native log.

Intake used 3,194,027 tokens; verification used 842,092. Total 4,036,119:
4,016,278 input (3,841,408 cached) and 19,841 output. Reported native durations
sum to 835,374 ms, excluding setup and harness overhead. Planning/worker usage
is absent because those phases never started. Both CSV rows, raw reports,
`summary.json`, `log-validation.json` and `friction.json` are retained under
`promptfoo/reports/designbook-58-astra-sonnet-03/`. This run establishes an intake
presentation-contract mismatch, not a regression in Sonnet or the transport fix.

## Skill-only presentation clarification: Astra / Sonnet

`designbook-58-astra-sonnet-04` used 74bcf523 plus the shared write-planning
instruction to present one row per subject, grouping states and evidence.
Fresh workspace, Storybook port 6134; scripts unchanged. Astra followed the
new presentation rule with two rows, header and footer, each listing sm and xl.

Intake failed with `Reference metadata omits xl for scene-header`. The reference
uses separate `sm/meta.yml` and `xl/meta.yml`, each binding the same subject IDs
to its own breakpoint and capture files. `referenceInventoryError` selects only
the first matching metadata entry, then requires all row breakpoints there;
the actual xl metadata/captures are ignored. The extract-reference contract
places one meta.yml, extract.json and all breakpoint captures in the resolved
reference folder. Astra split that single reference contrary to the intended
layout; the intake should clarify this existing contract. This is not another
duplicate-row presentation failure. Neither
planning nor Sonnet execution started. The original artifacts remain unchanged.

Automatic verification confirmed the missing main definition and shell scene
on disk and in this workspace's Storybook index. All four checks are blocked;
there are no rendered captures, comparisons or visual score. One failed initial
browser/Python extraction command was recovered using browser eval and Python
standard-library JSON/regex; native evidence retains both attempts.

Total usage is 4,294,187 tokens: 4,271,621 input (4,091,776 cached) and 22,566
output. Intake accounts for 3,607,738, verification for 686,449. Native durations
sum to 965,427 ms excluding setup/harness overhead. Reports and audit JSONs are
under `promptfoo/reports/designbook-58-astra-sonnet-04/`. The skill clarification
was observed working; complete design execution remains unproven by this run.

## Parallel Grok 4.6 planner / worker diagnostic

`designbook-58-grok46-01` ran alongside Astra/Sonnet04 from the same 74bcf523
plus skill-only clarification, with its own fresh workspace and Storybook 6136.
The copied write-planning.md SHA-256 matches source and Astra04:
`5a39cab8247dbe90cde1b9a8ae3cdf43657a7ed6ef2e3be88352710fb1d3c8f3`.
Both roles used Grok `grok-4.6`; native terminal modelUsage identifies
`grok-4.6-build`. Intake passed with one row per subject, two subjects, six
capture cells and 24 packages in a common reference folder.

The formal plan gate passed: 38 tasks in 20 steps, tasks.yml 408,126 bytes.
All complete step prompts passed the byte preflight, 14,040–152,519 bytes.
However, the planner read earlier Astra/Luna and Astra/Sonnet plans and concrete
decision/context contracts from sibling workspaces and reports. The verifier
also read previous verification contracts. This violates the fresh-input
boundary: the run is excluded from independent model comparisons even where
formal assertions pass. Those native calls/results remain in the audit.

The first worker completed only its assigned `extract-reference` batch and
preserved the definition, but failed `Execution changed frozen intake evidence`.
Submission reserialized meta.yml and extract.json. Parsed metadata is identical;
the extract changed only by one trailing newline (156,810 to 156,811 bytes),
and removing that newline reconstructs the original hash. The measured failure
is therefore a byte-level rewrite, not a semantic change to reference measurements. The remaining 19 worker
steps never started; no shell was built.

Automatic verification failed all six comparisons. Actual captures show the
Storybook missing-story page with absent target selectors; these are invalid
design captures and provide no accepted visual score. No successful design
quality or execution baseline results from this run.

Reported usage: intake 6,164,073; plan 4,821,592; worker 1,830,456; verification
8,256,887. Total 21,073,008 tokens: 20,915,432 input (19,595,648 cached) and
157,576 output. No separate reasoning counter is reported. Phase-report durations
sum to 3,148,009 ms, excluding external setup/harness overhead. Four CSV rows,
native logs and audit artifacts are retained under
`promptfoo/reports/designbook-58-grok46-01/`. Services remain available for
inspection. No saved input was repaired or rerun by the tester.


## Source-neutral capture workflow diagnostic

`designbook-58-astra-sonnet-05` (source `d8620735`, fresh workspace, Storybook 6140)
completed two reference capture revisions through ordinary `workflow done`.
Both retained their 19-task definitions and published bytes. The first revision's
component query exceeded 64 KiB; Astra created a second compact revision whose
417,836-byte extract passed reference validation. The native intake table was
present but rejected by the strict header parser, and the overwritten failure
reason incorrectly reported a missing source locator. Planner and Sonnet never
started. Automatic verification found no shell, failed 0/4 checks, and correctly
assigned no visual score.

Native evidence also records PNG assets renamed to `.image` after validator
rejection, and viewport captures containing unselected body content. Those are
unresolved failures of this run, retained in its audit. No previous run artifacts
were used. Subsequent fixes and the user-requested standalone `extract-reference`
workflow are documented in [the implementation record](reference-capture-workflows.md).

Total tokens: 3,139,492 = 3,123,286 input + 16,206 output. Cached input 2,985,088,
uncached 138,198. Native phase durations sum to 732,875 ms; peak root-thread input
103,820 tokens. Reports and complete audit JSONs are in
`promptfoo/reports/designbook-58-astra-sonnet-05/`. The original failed report and
CSV rows are unchanged by the later diagnostic replay of updated static checks.


## Standalone extract-reference workflow: Astra/Sonnet06

`designbook-58-astra-sonnet-06` tests source `65bf57e8` in a fresh workspace
with Storybook on port 6142. Intake completed one 33-task standalone
`extract-reference` workflow, publishing one `meta.yml` and a 408,939-byte
`extract.json` for nine selected subject/view/state cells. All 36 bounded query
packages validated, and the native selector presentation passed the first static
gate. The design catalogue contains no extraction helper task.

The native evidence audit nevertheless fails intake asset completeness: 16 saved
SVG assets are not valid standalone XML (one duplicate namespace declaration,
15 unbound `xlink` prefixes), and external symbol definitions were omitted from
the publication. Planning fetched the missing sprite live from the current source.
That invalidates this run as evidence of planning exclusively from a complete
frozen reference, despite its passing formal intake and planning assertions.
The planner embedded concrete target SVG bytes in the worker instructions; the
first worker did not fetch the source again.

The fixed plan has 51 tasks in 48 steps; its definition snapshot is 1,200,365 bytes.
Complete worker work orders passed the 256-KiB preflight. Recorded prompts range
from 11,109 to 175,567 bytes, including resolved predecessors when available. The first worker completed both icon and logo tasks together,
preserving the definition and published reference bytes. Its native model is
`claude-sonnet-5` (configured CLI alias `sonnet`). Its first request already
contained 111,883 input tokens before tool results; the CLI also loads its global
tools, skills, MCP servers and plugins, so exported work-order bytes do not measure
the entire model context. Peak context reached 183,728 tokens. Native evidence
shows no full-plan or raw-extract read in that worker.

Subsequent foundation execution read another task's result envelope from the saved
workflow to understand `workflow done`. The strict step-only audit records that
access as a failure. Several workers inspect CLI source or retry completion calls
to discover the submission format; a concrete completion example in the work order
is a remaining efficiency opportunity. These findings are preserved in the
per-phase audits under `promptfoo/reports/designbook-58-astra-sonnet-06/`.

The runner finished with exit 1 after 20 attempted worker calls: 19 passed, and
`verify-header-sm-default` correctly blocked because the menu button declares
`aria-controls="shell-menu"` while the rendered menu panel has no `id="shell-menu"`.
The worker preserved the fixed definition and did not repair components outside
its scope. The components build succeeded and the refreshed Storybook index
contained all 19 declared stories. Remaining design steps did not start.

Automatic verification also failed, but for a different reason: its prompt retains
`.page__header` and `.page__footer` from the fixture, whereas the saved main plan
and actual render use `[data-designbook-region="header"]` and the corresponding
footer attribute. Although the prompt says saved main targets take precedence,
the verifier used the stale classes. Its failed selector checks do not establish
that the shell is absent. Screenshots show a real shell with visible layout
problems; there is no accepted pixel-comparison score. The main worker screenshot
also moved the header out of its original DOM context and retained a transparent
full-height canvas, so it is unsuitable as a reference pixel comparison.

All 23 phase rows are retained in `promptfoo/results.csv`. Phase token totals:

| Phase | Input | Cached input | Output | Total |
| --- | ---: | ---: | ---: | ---: |
| Intake | 2,371,919 | 2,287,104 | 12,709 | 2,384,628 |
| Plan | 7,671,006 | 7,499,136 | 36,018 | 7,707,024 |
| 20 workers | 47,696,972 | 45,437,118 | 431,271 | 48,128,243 |
| Verification | 967,281 | 900,096 | 4,918 | 972,199 |
| Total | 58,707,178 | 56,123,454 | 484,916 | 59,192,094 |

Uncached input is 2,583,724 tokens. Reported reasoning (280,324 tokens) is a
subset of output, not an extra addition. CSV phase durations sum to 7,338,434 ms
(about 122 minutes), excluding setup and harness gaps. Full native audit and
per-phase usage are retained under `promptfoo/reports/designbook-58-astra-sonnet-06/`.
Native audit durations sum to 7,307,572 ms; peak root-thread input is 194,681
tokens in the navigation worker. The different CSV duration includes provider
overhead. No source or running-workspace repair was injected into this run.

The standalone extraction/reuse lifecycle is exercised successfully, but this run
is not a passing design-quality baseline. Remaining issues are complete portable
SVG capture, a self-contained completion-call contract, stronger step-local reads,
consistent verifier target bindings and the generated menu/layout defects.
The many tiny story and check steps also repeat the worker environment overhead;
batching related tasks is supported but used sparingly by this plan.


## Verification target fix and Opus comparisons (07)

Source `551fa99c` removes standalone verification fixture prompts from automatic
follow-up verification. Reference bindings, story IDs, exact selectors, views and
states come exclusively from the saved main plan. The pipeline supplies its exact
saved path when available. The saved threshold is preserved; an explicit
`verificationThresholdPercent: 3` config supplies the fallback. Regression tests
check the generated shell prompt contains neither obsolete wrapper selectors nor
the fixture reference URL.

Fresh `designbook-58-opus-only-07` and `designbook-58-opus-luna-07` were launched
with the same source and fixture, on ports 6144 and 6146. Both completed reference
capture but failed the first selector-presentation gate. Planning and workers never
started, so these attempts do not compare Opus and Luna execution performance.

Opus/Luna presented a complete six-column inventory, separating views and states;
its source locator header included `(CSS)`. The parser incorrectly required five
columns and rejected it. All six screenshots were audited as proper source crops;
the complete SVG sprite was published and standalone SVGs parsed successfully.
Opus-only also used six columns, but explicitly deferred the concrete header
selector to the planner. That is a real intake failure. Its ministry logo geometry
was also missing from the published assets/structure despite a claim it was saved.

Both automatic verifiers correctly blocked on missing actual output and did not
substitute stale selectors or fabricate a pixel score. Total native usage was
23,942,655 tokens / 1,875,310 ms for Opus/Luna, and 29,046,465 tokens / 2,024,242 ms
for Opus-only. Full audits remain under their original report directories.

The parser follow-up maps semantic column names, allows a separate states column
and preserves literal selector identity. Missing, ambiguous or explicitly deferred
selector decisions still fail. A read-only diagnostic against the original native
messages accepts Opus/Luna presentation and captured scope, while Opus-only remains
rejected. Original 07 reports and CSV results remain failed; fresh 08 runs are
required to measure execution with the corrected gate.


## Opus comparison retries (08)

Fresh retries at `1df2bbbe`, ports 6148 and 6150, again stopped at intake.
Opus-only presented concrete `.page__header`/`.page__footer` selectors under
`Subject ID`; Opus/Luna presented a complete table with German column headings.
Both were parser false negatives. The follow-up recognizes these equivalent
English/German headings without changing exact selector values. A read-only
diagnostic accepts both native inventories and their capture scope. Original
reports remain failed; no planner or executor ran.

Opus-only completed one 16-task reference capture. All SVG assets including the
ministry logo were present and valid, but six screenshots were created through
`capture screenshot --selector`, whose existing implementation moves the selected
element into a replacement document body. The resulting 1600/1680-pixel images
lose the source layout context and contain large transparent areas.

Opus/Luna preserved three fixed capture attempts: the first blocked before
publication because its declared files omitted the icon sprite; the next published
that dependency; a third corrected observed form attributes and SVG text labels.
Published bytes and definitions stayed unchanged. Header crops are usable, but
footer capture also relocated the subject and the ministry SVG geometry is missing
from both published revisions. The initial blocked capture remains visible and
would still fail the incomplete-workflow gate even with its presentation accepted.

Both automatic verifiers correctly report missing main output without inventing
selectors, comparisons or scores. Opus-only: 27,869,408 tokens, native duration
1,879,551 ms, peak context 290,505. Opus/Luna: 31,032,783 tokens, native duration
2,274,157 ms, peak context 277,461. Detailed audits and all raw failures are kept
in their `promptfoo/reports/designbook-58-*-08/` directories.
