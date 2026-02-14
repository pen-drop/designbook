# Section Specification: Blog

## User Flows
1.  **Browse Articles**: User views a list of latest blog posts (Teaser format).
2.  **Read Article**: User clicks a teaser to view the full article (Full format).
3.  **Explore Related**: User navigates to related articles from the detail page.

## UI Requirements
-   **List View**: Grid of article teasers (Image, Preheadline, Title, Description, Button).
-   **Detail View**:
    -   Hero Image
    -   Title & Metadata
    -   Rich Text Body
    -   Related Content Section
-   **Navigation**: Standard Header/Footer.

## Data Requirements
-   Entity: `node.article`
-   View Modes: `teaser`, `full`
