---
when:
  steps: [resolve-reference]
  reference.type: url
---

# URL Reference Resolution

When the scene reference is `type: url` and the URL is a website (not an image file), screenshot the URL at each breakpoint via Playwright — producing reference images that match the Storybook screenshots.

## Instructions

For each `type: url` entry in the scene's `reference` array:

1. Read `design-tokens.yml` to resolve the entry's `breakpoint` to a pixel width.

2. Capture the reference URL at that breakpoint:

```bash
mkdir -p "designbook/screenshots/${storyId}/reference"
npx playwright screenshot --full-page --viewport-size "${width},1600" --wait-for-timeout 3000 "${entry.url}" "designbook/screenshots/${storyId}/reference/${entry.breakpoint}.png"
```

Each entry is resolved independently — different entries may have different URLs.

## Example

```yaml
reference:
  - type: url
    url: https://example.com/desktop
    breakpoint: xl
    threshold: 3
  - type: url
    url: https://example.com/mobile
    breakpoint: sm
    threshold: 5
```

Screenshot each URL at its corresponding breakpoint viewport width.
