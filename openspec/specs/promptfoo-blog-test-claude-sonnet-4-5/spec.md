# Blog Page Design Specification: Keytec AI Integration

## Purpose
Design a 1:1 replica of the Keytec "Drupal & AI" blog page (https://keytec.de/de/drupal-ai-integration) within the Designbook environment, using the `/debo-design-screen` workflow.

## Requirements

### Requirement: Section Structure
The blog page SHALL be implemented as a distinct section within the Designbook.

#### Scenario: Section creation
- **WHEN** the section is initialized
- **THEN** it SHALL be named `blog-ai-integration`
- **AND** it SHALL have a corresponding `spec.md` and `data.json`

### Requirement: Screen Components
The design SHALL replicate the visual hierarchy and components of the reference URL.

#### Scenario: Header and Navigation
- **WHEN** the page is viewed
- **THEN** it SHALL display a sticky header with the Keytec logo
- **AND** it SHALL include navigation links: "Leistungen", "Projekte", "Über uns", "Blog", "Open Source", "Kontakt"
- **AND** it SHALL include a language switcher (DE/EN)

#### Scenario: Hero Section
- **WHEN** the page loads
- **THEN** the hero section SHALL display the title "AI und Drupal"
- **AND** the subtitle "Der Schlüssel zu effizienteren Websites und smarteren Prozessen"
- **AND** a "Beratung Anfordern" CTA button
- **AND** decorative background SVG layers

#### Scenario: Main Content Area
- **WHEN** the content is rendered
- **THEN** it SHALL display the article text with headings (H2, H3)
- **AND** it SHALL support rich text formatting (bold, links)
- **AND** it SHALL include the "Warum Drupal & AI?" and "Was erwartet Sie hier?" sections

#### Scenario: Related Articles
- **WHEN** scrolling to the bottom
- **THEN** a "Weiterführende Artikel" section SHALL appear
- **AND** it SHALL display 3 cards:
  1. "KI Übersetzung in Drupal"
  2. "Content Erstellung mit Drupal AI"
  3. "Coming up next: AI Assistance"
- **AND** each card SHALL have an image, title, and "Mehr" link

#### Scenario: Footer
- **WHEN** scrolling to the very bottom
- **THEN** the footer SHALL display contact information (Address, Email, Phone)
- **AND** social links (Drupal.org, LinkedIn)
- **AND** legal links (Datenschutz, Impressum)

### Requirement: Design Workflow
The implementation SHALL follow the `debo-design-screen` methodology.

#### Scenario: Workflow execution
- **WHEN** the design process starts
- **THEN** the `debo-design-screen` skill SHALL be used
- **AND** `debo-shape-section` SHALL be used first to define the spec
- **AND** `debo-sample-data` SHALL be used to mock the blog content
- **AND** `debo-design-component` SHALL be used for custom UI elements if needed

## Data Model
The `data.json` SHALL include:
- A `blog_post` entity with fields: title, subtitle, body, hero_image, related_articles.
- A `related_article` entity with fields: title, teaser, image, link.
