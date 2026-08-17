# Scenario — sync-to carries a Scene 1:1 to Drupal (DESIGNBOOK-42)
#
# Abstract, reproducible click-path: sync a Scene config-only (plus a presenter-template where a
# surface is theme-methods-only), open the real Drupal page, and confirm main content, both block
# kinds, and the view listing are where the Scene has them. Regions (Ziel G) are out of this
# ticket's scope and live in the split-out follow-up ticket. The negative scenario proves the
# block-decision rule rejects an undeterminable block instead of guessing (RED before GREEN).

Feature: A synced Scene reproduces its content 1:1 on the real Drupal page

  Background:
    Given a running Drupal for the drupal-web workspace
    And a running Storybook for the same workspace
    And a Scene that places a block_content block, a block_plugin block, and a view listing

  Scenario: The synced page matches the Scene (GREEN)
    When I run sync-to for the Scene (scene branch, config plus presenter-template)
    And I import the emitted config into Drupal
    And I open the real page the synced config resolves to
    Then the page returns HTTP 200
    And the block_content block renders where the Scene places it
    And the block_plugin block renders where the Scene places it
    And the view listing renders its row-bundle records through its bound component
    And a theme-methods-only surface (form / pager / exposed filter) renders through its presenter-template
    And sync-verify (kind: scene) reconciles the page against the Scene story and produces a ScoreReport

  Scenario: An undeterminable block is reported, not guessed (RED)
    Given a Scene that places a node as a block for which the data model declares
      neither a block_content bundle nor a block_plugin entry
    When I run sync-to for that Scene
    Then the run reports the undeterminable block and stops for that unit
    And no block config is authored for it by guessing a type
