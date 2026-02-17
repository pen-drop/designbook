# Screen Designs

Reference: https://keytec.de/de/drupal-ai-content-erstellung-ckeditor-seo-optimierung

## blog_listing

Blog listing page showing all articles in a 3-column card grid.

### Layout
- **Header**: Standard Shell Header.
- **Hero**: Simple hero with H1 "Drupal Blog", and intro text "Interessantes aus der Drupal-Welt".
- **Content**:
    - **Article Grid**: 3-column responsive grid (uses `layout` component with `grid-3`). Stacks to 1 column on mobile.
- **Footer**: Standard Shell Footer.

### Article Card
- **Component**: `card` (variant `default`)
- **Data**: `node.article` (teaser view mode)
- **Props**:
    - `image`: `field_media`
    - `preheadline`: `field_teaser_preheadline`
    - `title`: `title`
    - `text`: `field_teaser_description`
    - `badge`: `field_teaser_button_color` (visual accent)

---

## blog_detail

Full article detail view matching keytec.de design.

### Layout
- **Header**: Standard Shell Header.
- **Hero**: `hero` component (variant `blog-detail`).
    - **Background**: `field_media` (image) or `field_teaser_button_color` (solid).
    - **Breadcrumbs**: "Home > Blog > [Title]"
    - **Meta**: `created` (Date) | `uid` (Author)
    - **Title**: H1 `title`
    - **Intro**: `field_teaser_description`
- **Content**: `layout` component (single column, constrained width).
    - **Body**: `text-block` with `body` content (Rich Text).
    - **Images**: `figure` for inline images.
- **Related Section**: `layout` component (`grid-3`, background `base-200`).
    - **Title**: H2 "Weiterführende Artikel"
    - **Grid**: 3 x `card` (teasers of `field_related` articles).
- **CTA**: `cta-banner` (variant `primary`).
    - **Title**: "Haben wir Ihr Interesse geweckt?"
    - **Button**: "Kontakt aufnehmen"
- **Footer**: Standard Shell Footer.

### Data
- Uses `node.article` (full view mode).
- Fields: `title`, `created`, `uid`, `field_teaser_description`, `field_media`, `body`, `field_related`.

---

## blog_ai_landing

Service-style landing page for the "Drupal & KI Integration" article series. Uses Layout Builder with hero, body sections, related articles, and contact CTA.

Reference: https://keytec.de/de/drupal-ai-integration

### Layout
- **Header**: Standard Shell Header.
- **Breadcrumb**: `breadcrumb` — "Home > Blog > Drupal & KI Integration"
- **Hero**: `hero` component (variant `landing`).
    - **Background**: `media.collage` (illustration with Drupal logo, code windows, AI elements).
    - **Theme**: `valentine` (red background).
    - **Title**: H1 "AI und Drupal"
    - **Subtitle**: "Der Schlüssel zu effizienteren Websites und smarteren Prozessen"
    - **CTA Button**: "Beratung Anfordern" (accent/yellow color, links to /kontakt)
- **Body Content**: `layout` (single column, `container-md`, `pt-auto pb-auto`).
    - **Intro**: Paragraph text (no heading) — "Künstliche Intelligenz hält in immer mehr Bereiche..."
    - **Section 1**: H2 "Warum Drupal & AI?" — paragraph about AI possibilities for Drupal websites.
    - **Section 2**: H3 "Flexibel und modular" — paragraph about the Drupal AI module, submodules, and provider flexibility.
    - **Section 3**: H2 "Was erwartet Sie hier?" — article series overview + inline CTA link.
    - Uses `block_content.text` with `field_rich_text_relaxed` for each section.
- **Related Section**: `layout` (`grid-3`, `container-md`, `pt-auto pb-auto`).
    - **Header**: H2 "Weiterführende Artikel" (with `display_header: true`).
    - **Items**: 3 × `card` components for related articles:
        1. "KI Übersetzung in Drupal"
        2. "Content Erstellung mit Drupal AI"
        3. "Coming up next: AI Assistance"
    - Cards use article teasers: image (colored illustration bg), title, description, "MEHR" link.
    - Data source: `block_content.manual_list` referencing article nodes.
- **Contact CTA**: `cta-banner` (variant `contact`).
    - **Theme**: `valentine` (dark red/maroon background).
    - **Title**: H2 "Sie suchen eine Drupal Agentur für die Entwicklung nachhaltiger digitaler Projekte?"
    - **Button**: "JETZT ANFRAGEN" (accent/yellow, links to /kontakt)
    - **Contact Person**: Circular photo + "Thomas Mfinanga", "Projektmanager", email, phone.
    - Data source: `block_content.contact_box`.
- **Footer**: Standard Shell Footer.

### Data
- Uses `node.article` (landing view mode) with Layout Builder.
- Node fields: `title`, `field_media` (collage), `field_teaser_description`.
- Layout blocks: `block_content.text` (body), `block_content.manual_list` (related), `block_content.contact_box` (CTA contact).
