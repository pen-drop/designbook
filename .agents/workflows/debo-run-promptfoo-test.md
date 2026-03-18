---
name: /debo-run-promptfoo-test
id: debo-run-promptfoo-test
category: Designbook
description: Run promptfoo workflow tests and write a structured evaluation report with lessons learned
workflow:
  title: Run Promptfoo Tests
  stages: [dialog, run-eval, write-report]
---

Run the Designbook promptfoo evaluation suite, analyze the results, and produce a structured report with lessons learned, errors, and improvement suggestions for skills and workflows.

> **Spec Mode (`--spec`):** If the user passes `--spec`, do NOT run tests. Instead, output a YAML plan listing which tests would run, which providers, and estimated duration.

**Steps**

## Step 0: Load Workflow Tracking

Load the `designbook-workflow` skill via the Skill tool.

## Step 1: Select Test Scope

> "Which tests would you like to run?
>
> - **Full suite** — all workflows (takes 5–30 min)
> - **Filter** — specify a pattern to run specific tests (e.g. `debo-vision`)
>
> Which would you prefer?"

Wait for response. Once confirmed, the `run-eval` and `write-report` stages run automatically.
