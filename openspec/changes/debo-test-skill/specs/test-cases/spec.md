## ADDED Requirements

### Requirement: Case file format
Each case SHALL be a YAML file stored at `fixtures/<suite>/cases/<case-name>.yaml`. The file SHALL contain a `fixtures` list and a `prompt` string. It MAY contain an `assert` list for automated testing.

#### Scenario: Minimal case file
- **WHEN** a case file `fixtures/drupal-stitch/cases/vision.yaml` exists
- **THEN** it SHALL contain at minimum:
  ```yaml
  fixtures: []
  prompt: |
    Run /debo vision...
  ```

#### Scenario: Case with fixtures and assertions
- **WHEN** a case file `fixtures/drupal-stitch/cases/design-screen.yaml` exists
- **THEN** it SHALL contain `fixtures`, `prompt`, and optionally `assert`:
  ```yaml
  fixtures:
    - vision
    - tokens
    - data-model
    - design-component
    - sections
  prompt: |
    Run /debo design-screen...
  assert:
    - type: javascript
      value: output.newFiles.some(f => f.endsWith('.scenes.yml'))
  ```

### Requirement: Fixtures list references fixture directories
Each entry in the `fixtures` list SHALL correspond to a directory name within the same suite directory. The setup process SHALL layer them in order.

#### Scenario: Fixture resolution
- **WHEN** a case specifies `fixtures: [vision, tokens, data-model]`
- **THEN** the setup process SHALL copy files from `fixtures/<suite>/vision/`, then `fixtures/<suite>/tokens/`, then `fixtures/<suite>/data-model/` into the workspace, in that order
- **THEN** later layers SHALL overwrite earlier ones if paths conflict

### Requirement: Prompt field is shared between manual and automated use
The `prompt` field SHALL contain the exact prompt text to execute. Manual testing displays it to the user. Automated testing (promptfoo) sends it to the model.

#### Scenario: Manual use reads prompt
- **WHEN** the `debo-test` skill sets up a workspace from a case
- **THEN** it SHALL display the `prompt` field content to the user

#### Scenario: Promptfoo uses same prompt
- **WHEN** promptfoo evaluates a case
- **THEN** it SHALL use the `prompt` field as the prompt sent to the model

### Requirement: Assert field is optional and promptfoo-only
The `assert` field SHALL be ignored during manual testing. It SHALL only be evaluated by promptfoo.

#### Scenario: No assertions in manual mode
- **WHEN** the `debo-test` skill runs a case that has an `assert` field
- **THEN** the skill SHALL NOT evaluate assertions
