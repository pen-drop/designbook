Feature: config-verify reconciles a backend render against the Storybook reference

  Background:
    Given a Storybook instance with a story mapped from a backend config
    And a backend whose designbook module renders that config

  Scenario: Derive story and render URL from a backend config
    Given a config of type "entity_view_display"
    When config-verify runs with that config
    Then the matching story_id is derived from the config-to-component mapping
    And render_url is resolved via the backend-supplied command

  Scenario: First-shot measurement against the Storybook baseline
    Given a resolved story_id and render_url
    When the reference stage freezes the Storybook render as the baseline
    And the capture stage screenshots the backend render at render_url
    Then compare produces a first-shot score-report diffing backend against Storybook at matching breakpoints and states

  Scenario: Single config fix pass moves the score
    Given a first-shot score-report with deviations
    When the polish pass edits the backend config only
    And the workflow re-captures and re-compares
    Then the final score reflects the config change
    And the Storybook component is never modified

  Scenario: Pass within threshold
    Given a backend render matching the Storybook baseline within the configured threshold
    When config-verify completes
    Then the score-report reports a passing result

  Scenario: Backend neutrality
    When config-verify runs in core
    Then no backend or drush code is added to the core designbook skill
    And Drupal specifics live only in the designbook-drupal integration
