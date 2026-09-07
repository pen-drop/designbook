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
