# Screen Designs

Reference: keytec.de/de/drupal-blog

## blog_listing

Blog listing page showing all articles in a 3-column card grid.

### Layout
- **Header**: Standard Shell Header.
- **Content**:
    - **Page Header**: Centered section — H1 "Drupal Blog", subtitle "Interessantes aus der Drupal-Welt", introductory paragraph.
    - **Article Grid**: 3-column responsive grid of article teasers. Stacks to 1 column on mobile.
- **Footer**: Standard Shell Footer.

### Article Card
Each card shows:
- Hero image (top)
- Preheadline (category label)
- Title (large, linked)
- Teaser description
- Colored border accent (per-article `field_teaser_button_color`)
- Hover effect: subtle translate up/left

### Data
- Uses `node.article` (teaser view mode).
- Fields: `field_media`, `field_teaser_preheadline`, `title`, `field_teaser_description`, `field_teaser_button_color`.

---

## blog_detail

Full article detail view with colored hero block and single-column reading layout.

### Layout
- **Header**: Standard Shell Header.
- **Content**:
    - **Hero Block**: Full-width colored background block (uses `field_teaser_button_color`).
        - Breadcrumbs (Home > Blog > Article Title)
        - H1 Title (white text)
        - Teaser description as subtitle
    - **Body**: Centered single-column rich text content. Generous typography, interspersed images.
    - **Related Articles**: "Weiterführende Artikel" section — same 3-column card grid as listing, showing `field_related` articles in teaser format.
- **Footer**: Standard Shell Footer.

### Data
- Uses `node.article` (full view mode).
- Fields: `title`, `field_teaser_preheadline`, `field_teaser_description`, `field_teaser_button_color`, `field_media`, `body`, `field_related`.
