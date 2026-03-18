# Field-to-Component Mapping

| Field Type | Suggested Component | Props/Slots |
|------------|-------------------|-------------|
| `string` (title) | `heading` | slots: `{text: title}`, props: `{level: "h1"}` |
| `text` / `text_long` | `text-block` | slots: `{content: field_body}` |
| `reference` (media.image) | `figure` | props: `{src: field_media.url, alt: field_media.alt}` |
| `reference` (taxonomy) | `badge` | slots: `{label: field_category.name}` |
| `datetime` | `date-display` | props: `{date: field_date}` |
| `link` | `button` or `link` | props: `{url: field_link.url}`, slots: `{label: field_link.title}` |
| `boolean` | (conditional) | Use `field_flag ? {...} : null` pattern |
| `integer` / `float` | `stat` or inline | props: `{value: field_count}` |
