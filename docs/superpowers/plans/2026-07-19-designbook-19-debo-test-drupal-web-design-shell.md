# DESIGNBOOK-19 debo-test: drupal-web / design-shell (opus) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the `drupal-web / design-shell` debo-test tester once via the opus (claude-opus-4-8, default) agent and report per-stage pass/fail, attaching the generated designbook URL to the ticket.

**Architecture:** This is a debo-test tester ticket (Task-Art: debo-test), not a UI/design change. The executable test IS the `debo-test run` invocation — no hand-coded components, no design planning, no BDD/Gherkin. The tester provisions its own test workspace and drives the changed workflow end-to-end.

**Tech Stack:** designbook-test skill, `debo-test` CLI, Drupal test workspace (`start-drupal-workspace.sh`), Storybook.

## Global Constraints

- Run the tester from a **plain checkout, NOT from inside a git worktree** — its setup does `git reset --hard` / `git clean -fd`.
- Agent: opus (`claude-opus-4-8`, default) — no routing label.
- Validate workflow: **none** (single functional pass; the ticket command carries no `--validate`).
- Do NOT hand-edit skill files; do NOT ad-hoc the verification.

---

### Task 1: Run the drupal-web / design-shell tester

**Files:**
- No source files created or modified — this is a tester run.

**Interfaces:**
- Consumes: the `drupal-web` suite `design-shell` case fixture.
- Produces: tester output (`workflow summary --json` block) + generated designbook URL.

- [ ] **Step 1: Run the tester (single functional pass)**

From a plain checkout (not this worktree):

```bash
debo-test run drupal-web design-shell
```

- [ ] **Step 2: Capture the result**

Capture the `workflow summary --json` block: per-stage pass/fail and any harness errors. Extract the generated designbook (Storybook) URL for the shell.

- [ ] **Step 3: Report**

Coding `summary` comment reports per-stage pass/fail (AC-1, AC-2). Attach the designbook URL to the ticket `links` at transition (AC-3).

---

## Acceptance mapping

- **AC-1** — tester runs the drupal-web / design-shell case via opus and completes without harness errors → Task 1 Step 1–2.
- **AC-2** — coding summary reports per-stage pass/fail → Task 1 Step 3.
- **AC-3** — designbook URL attached to ticket links → Task 1 Step 3 (attached at coding transition).
