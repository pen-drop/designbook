# Testing Designbook Skills with promptfoo

This guide explains how to use [promptfoo](https://promptfoo.dev/) to test and evaluate the AI skills in `.agent/skills`.

## Overview

We use `promptfoo` to ensure that our Skill definitions (`SKILL.md` files) reliably produce high-quality output when used by AI agents.

## Setup

1.  **Install dependencies**:
    ```bash
    pnpm install
    ```

2.  **Configure Providers**:
    Edit `promptfoo.yaml` in the root directory.
    To test with "Antigravity" equivalent models, we recommend using **Google Gemini 1.5 Pro** or **Anthropic Claude 3.5 Sonnet**.
    
    Uncomment the provider configuration in `promptfoo.yaml` and export your API key:
    ```bash
    export GOOGLE_API_KEY=your_key_here
    # or
    export ANTHROPIC_API_KEY=your_key_here
    ```

## Running Tests

Run the evaluation suite:

```bash
npm run test:prompt
```

## Adding New Tests

Open `promptfoo.yaml` and add a new entry under the `tests` section.

```yaml
tests:
  - description: "Test [New Skill Name] behavior"
    vars:
      # Path to the skill definition
      skill_content: file://.agent/skills/[skill-name]/SKILL.md
      # The simulated user request
      task: "Simulate a user request that triggers this skill"
    assert:
      # Verify the output contains expected structures or keys
      - type: contains
        value: "expected_output_string"
      # Use an LLM to grade the response quality
      - type: llm-rubric
        value: "The response should follow the exact YAML structure defined in the skill."
```

## Best Practices

*   **Mocking**: Use the `echo` provider for quick syntax checks of your test config.
*   **LLM Rubrics**: Use `type: llm-rubric` assertions to check for complex logic that simple string matching can't catch (e.g., "Ensure tone is professional").
*   **Skill Updates**: Whenever you modify a `SKILL.md`, run the tests to verify the changes didn't break existing behavior.
