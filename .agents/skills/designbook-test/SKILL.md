---
name: designbook-test
description: Visual regression testing — screenshots Storybook scenes via Playwright and compares against Stitch design. Attach to any scene workflow as a validation stage.
---

# Designbook Test

Screenshots a Storybook scene via Playwright, fetches the Stitch reference, and does a visual diff.

## Config

Reads `storybook_url` from `designbook.config.yml`:

```yaml
storybook_url: "http://localhost:6009"
```

## Playwright CLI

Use the Playwright CLI for screenshots — one command, no scripts:

```bash
npx playwright screenshot --full-page --viewport-size "2560,1600" --wait-for-timeout 3000 \
  "$DESIGNBOOK_STORYBOOK_URL/iframe.html?id=<story-id>&viewMode=story" /tmp/screenshot.png
```

## Story URL

The Storybook story ID determines the iframe URL. Get it from the index:

```bash
curl -s "$DESIGNBOOK_STORYBOOK_URL/index.json" | jq -r '.entries | to_entries[] | select(.value.tags[]? == "scene") | .key'
```

The iframe URL pattern is: `$DESIGNBOOK_STORYBOOK_URL/iframe.html?id=<story-id>&viewMode=story`

## Task Files

- [tasks/visual-diff.md](tasks/visual-diff.md) — Screenshot + compare against Stitch
