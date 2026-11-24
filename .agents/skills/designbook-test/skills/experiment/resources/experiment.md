# Experiment contract (HOW)

Authoring guide: [`docs/experiments/README.md`](../../../../../../docs/experiments/README.md).
Spec: DESIGNBOOK-62 experiment/evaluation contract.

All commands run from the repository / worktree root via:

```bash
node promptfoo/scripts/experiment-cli.mjs <subcommand> …
```

## validate

```bash
node promptfoo/scripts/experiment-cli.mjs validate docs/experiments/<id>/experiment.yml
```

Fails non-zero when ticket, variant commits, or other required fields are missing.

## report

```bash
node promptfoo/scripts/experiment-cli.mjs report <experiment-id>
```

Finds `docs/experiments/<id>/` by directory name or `experiment.yml` id /
`primary_key.experiment`. Reads optional `runs.json` beside the manifest and
writes `comparison.md` with branch+experiment identity, ticket, variant commits,
three evaluation levels, requested vs effective models, and evidence paths.

## judge

```bash
node promptfoo/scripts/experiment-cli.mjs judge <evidence-run> \
  --result <result.png> \
  --reference <reference.png> \
  --status pass|fail|unclear|rejected \
  --criteria "<text>" \
  [--blind] \
  [--rationale "<text>"] \
  [--evaluator "<name>"]
```

Writes `judgment.yml` under the evidence run. Open (`unclear` / pending) or
`rejected` human optical judgment keeps `final_positive` false for visual cases.

## Evidence store

Durable proof lives under `promptfoo/evidence/<experiment-id>/<run-id>/`
(gitignored). Workspace wipe under `promptfoo/workspaces/` must never delete it.

## AC-11 interactive reference-approval proof (attended)

Use only when proving real human reference approval — not for CI smoke.

1. Present real captured screenshots to the human.
2. Ask explicitly whether to approve the reference revision.
3. Remain `pending` without an answer; do not invent approval.
4. On approve: write `approval.yml` + `approval-provenance.yml` with
   `mode: interactive` and `status: approved`.
5. On reject: write rejected status; dependent planning stays blocked
   (`reference approval-check` fails).

Fixture/automation paths (e.g. `fixtures/drupal-web/cases/extract-reference.yaml`)
use `mode: simulated` and must not claim real human approval or human optical
design judgment.

## Non-promotion

- `isRealHumanApproval` is true only for `mode: interactive` + approved.
- Simulated/recorded must not set `optical.human` to pass/fail/rejected.
- Harness-only commit changes are not product Task/Rule improvements.
