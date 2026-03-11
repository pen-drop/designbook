## Context

Designbook has ~15 core debo-workflows forming a sequential product design pipeline. Currently there is one promptfoo test (`debo-design-screen`) that only validates planning output, not execution. The existing `opencode:sdk` provider enables tool-equipped AI testing within promptfoo. All workflows are conversational (multi-turn) and produce files in `${DESIGNBOOK_DIST}/`, with each workflow depending on files from previous workflows.

Key constraint: The `promptfoo-structure` spec requires `llm-rubric` assertions only (no custom scripts).

## Goals / Non-Goals

**Goals:**
- Fixture-based, deterministic tests for all core debo-workflows
- Workspace isolation enabling parallel execution across providers
- Clean command to reset test state before runs
- Two-provider testing (gemini-3-pro + claude-opus-4-6)
- Assertions via `llm-rubric` validating both file creation and content quality

**Non-Goals:**
- Testing Figma-dependent workflows (`debo-figma-*`) — require external service
- Testing OpenSpec workflows (`opsx-*`) — separate concern
- Full end-to-end pipeline tests (sequential run of all workflows)
- Performance benchmarking or cost optimization

## Decisions

### 1. Per-workflow fixture directories (not levels)

Each workflow gets its own fixture directory containing exactly the prerequisite files it needs. This maximizes clarity and independence — each test's fixtures are self-documenting.

**Alternative rejected**: Shared "level" directories (level-0 through level-4) — adds indirection, harder to understand per-test prerequisites.

**Trade-off**: Some file duplication across fixtures (e.g., `vision.md` appears in many). Acceptable because fixtures are small and explicit isolation outweighs DRY concerns.

### 2. Workspace directories for isolation

Each test+provider combination gets its own workspace: `promptfoo/workspaces/<workflow>--<provider>/designbook/`. Clean wipes the entire `workspaces/` directory.

Each workspace includes its own `designbook.config.yml` with `dist: ./designbook` pointing to the workspace-local output. This requires the `config-resolution-walk-up` change.

### 3. Deterministic all-in-one prompts

Each workflow test uses a single prompt that bypasses conversational multi-turn by specifying all inputs upfront:

```text
IMPORTANT: Use promptfoo/workspaces/{{workspace_id}}/designbook/ as DESIGNBOOK_DIST.

Execute workflow //debo-product-vision.
Do NOT ask any questions. Use these exact values:
- Product Name: PetMatch
- Description: A pet adoption platform...
- Problems: 1) ... 2) ...
- Features: Search, Profiles, Requests
```

**Alternative rejected**: Adding `--non-interactive` mode to workflows — higher implementation cost, changes existing workflow code.

### 4. Assertion strategy: llm-rubric only

Per the `promptfoo-structure` spec, all assertions use `llm-rubric`. File existence and content quality are validated through the rubric description:

```yaml
assert:
  - type: llm-rubric
    value: |
      The agent was asked to create a product vision for "PetMatch".
      Verify from the output:
      1. A file was created at the DESIGNBOOK_DIST path
      2. The file contains a product name "PetMatch"
      3. The file contains problems & solutions
      4. The file contains key features
```

### 5. Consistent test product: "PetMatch"

All workflow tests use the same fictional product ("PetMatch" — a pet adoption platform) to ensure consistency across the fixture chain. This makes cross-workflow validation easier and provides a coherent test narrative.

## Risks / Trade-offs

- **[Non-deterministic AI output]** → llm-rubric is itself non-deterministic. Mitigation: Assert structural properties (file exists, contains sections) not exact content.
- **[Prompt sensitivity]** → Small prompt changes can produce different behavior across models. Mitigation: Test both providers to catch model-specific failures.
- **[Workspace path injection]** → Agent must respect the workspace path in the prompt instead of using the root config. Mitigation: Workspace-local `designbook.config.yml` via `config-resolution-walk-up` change.
- **[Test execution time]** → Each workflow test invokes an AI agent with tool access. Mitigation: Parallel execution via workspace isolation, `maxConcurrency` config.
