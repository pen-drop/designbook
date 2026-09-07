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
