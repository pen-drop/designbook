## Why

To replicate the keytec.de blog detail page design in Designbook, enabling high-fidelity visual previews in Storybook that match the live site's aesthetic and structure. This provides a "precise" plan for component generation.

## What Changes

### UI Components
Ensure the following generic UI components exist in `$DESIGNBOOK_DRUPAL_THEME/components/` (DaisyUI provider):

| Component | Usage in Blog Detail | Variants |
|-----------|----------------------|----------|
| `hero` | Page header with breadcrumb, date, author, big H1, bg color | `blog-detail` |
| `text-block` | Main rich text content | — |
| `figure` | Article images | — |
| `card` | Related articles teasers | `default` |
| `badge` | Tags/Categories | — |
| `date-display`| Publication date | — |
| `layout` | Grid for related articles | `grid-3` |
| `cta-banner` | Bottom "Contact Us" banner | `primary` |

### Entity Component: `entity-node-article`

In `$DESIGNBOOK_DIST/components/entity-node-article/`:

- **View Mode: `full`**
    - **Hero**: `field_media` (bg/image), `title`, `created` (date), `uid` (author).
    - **Content**: `body` (rich text).
    - **Related**: `field_related` rendered as a 3-column grid of `card` components.
    - **CTA**: Static `cta-banner` at bottom.

- **View Mode: `teaser`**
    - **Card**: `field_media`, `title`, `field_teaser_description`, `field_teaser_preheadline`.

### Screen Component: `section-blog`

In `$DESIGNBOOK_DIST/components/section-blog/`:

- **Story: `detail`**
    - Composes: `header` + `entity-node-article` (view_mode: full) + `footer`.
    - **Visual**: Matches `https://keytec.de/de/drupal-ai-content-erstellung-ckeditor-seo-optimierung`.

## Capabilities

- **High-Fidelity Replication**: The `hero` component will support the specific blog detail layout (left-aligned text, meta info).
- **Related Content**: The `entity-node-article` will natively handle "Related Articles" via `field_related` reference, rendering them as cards.

## Impact

- **New Components**: Potentially `hero` variant for blog detail, `cta-banner`.
- **Configuration**: Updates `screen-designs.md` for the blog section.
- **Verification**: `section-blog` stories in Storybook will serve as the truth.
