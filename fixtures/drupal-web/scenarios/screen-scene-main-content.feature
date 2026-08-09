# Scenario — Screen-Scene main content (view-main)
#
# Abstract, reproducible click-path into the section story that renders a screen scene
# whose page `content` slot carries exactly one route-bearing main content: a View.
# Storybook story id: `startseite-section-scenes--landing`
# Iframe: /iframe.html?id=startseite-section-scenes--landing&viewMode=story

Feature: A screen scene has exactly one route-bearing main content

  Background:
    Given a running Storybook for the drupal-web workspace
    And the "startseite" section was built by design-screen with one scene "landing"

  Scenario: View as the single route-bearing main content
    When I open the "Startseite / Scenes › Landing" story
    Then the shell renders (header and footer) around the page content slot
    And the page content slot contains exactly one main content: the View "view.landing_teasers"
    And the View lists several landing_page teasers (each an image and a title)
    And the listing comes from the View, not from several equal-rank entity nodes
    And no second route-bearing content appears in the content slot

  Scenario: Reference-listing exception (entity renders its own references)
    Given a screen scene whose main content is a single entity with an
      entity-reference field (e.g. paragraph.signage → field_signage_item → paragraph.signage_item)
    When I open that scene's story
    Then the referenced items render inside the entity's own subtree
    And they are not flagged as a second main content in the content slot
