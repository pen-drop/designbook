---
when:
  steps: [resolve-reference]
  reference.type: url
---

# URL Reference Resolution

When the scene reference is `type: url` and the URL is a website (not an image file), screenshot the URL at each breakpoint via Playwright — producing reference images that match the Storybook screenshots.

## Instructions

1. Read breakpoints from `design-tokens.yml` (same as the screenshot task).

2. For each breakpoint, capture the reference URL:

```bash
mkdir -p "designbook/screenshots/${storyId}/reference"
npx playwright screenshot --full-page --viewport-size "${width},1600" --wait-for-timeout 3000 "${referenceUrl}" "designbook/screenshots/${storyId}/reference/${breakpoint}.png"
```

3. Also capture at the default viewport:

```bash
npx playwright screenshot --full-page --viewport-size "2560,1600" --wait-for-timeout 3000 "${referenceUrl}" "designbook/screenshots/${storyId}/reference/default.png"
```

4. If `reference.screens` exists, use the per-breakpoint URL for each breakpoint instead of the single `reference.url`.

## Per-Breakpoint URLs

When the reference has a `screens` mapping:

```yaml
reference:
  type: url
  screens:
    xl: https://example.com/desktop
    sm: https://example.com/mobile
```

Screenshot each URL at its corresponding breakpoint viewport width.
