---
when:
  steps: [resolve-reference]
  reference.type: image
---

# Image Reference Resolution

When the scene reference is `type: image`, fetch the image directly — no screenshotting needed.

## Instructions

For each `type: image` entry in the scene's `reference` array:

1. Fetch the image from the entry's `url`:

   - If the URL is a remote URL (http/https) → use `WebFetch` to download it
   - If the URL is a local file path → use `Read` to access it

2. Save to:

```bash
mkdir -p "designbook/screenshots/${storyId}/reference"
```

Save as `designbook/screenshots/${storyId}/reference/${entry.breakpoint}.png`.

Each entry is resolved independently — different breakpoints may reference different images.
