## Context

Promptfoo is used to evaluate AI agent workflows (Designbook skills like `debo-design-screen`). Currently 5 files are scattered in the project root. The project uses opencode as the AI agent provider via promptfoo's `exec:` provider.

## Goals / Non-Goals

**Goals:**
- Workflow-based folder structure under `promptfoo/`
- Declarative assertions using `llm-rubric` (no custom scripts)
- Centralized report output in `promptfoo/reports/`
- Easy to add new test cases (just add prompt + `tests:` entry)

**Non-Goals:**
- Changing the opencode provider mechanism (still `exec:`)
- CI/CD integration (future work)
- Custom assertion libraries or frameworks

## Decisions

### 1. One folder per workflow, not per test case
Test cases are entries in the `tests:` array within a workflow's config. New test case = new prompt file + new tests entry. No new folder needed.

**Why:** Matches promptfoo's design. A config file is a suite, tests are cases within it.

### 2. `llm-rubric` over custom scripts
Use promptfoo's built-in LLM-as-Judge instead of Python/JS assertion scripts.

**Why:** Purely declarative YAML. No code to maintain. Natural language describes expected behavior. The exec provider outputs file listings that the judge can evaluate.

### 3. Central `reports/` directory
All suites write to `promptfoo/reports/<suite-name>.json` via `outputPath`.

**Why:** Single place to check results. Easy to gitignore.

## Risks / Trade-offs

- **LLM-as-Judge non-determinism** → Mitigated by clear, specific rubric criteria. Can add `threshold` to tune strictness.
- **exec provider still hacky** → Acceptable for now. Structured in its own config rather than inline shell.
