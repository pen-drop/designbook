---
when:
  steps: [resolve-reference]
  reference.type: image
---

# Image Reference Resolution

When the scene reference is `type: image`, fetch the image directly — no screenshotting needed.

## Instructions

1. Fetch the image from `reference.url`:

   - If the URL is a remote URL (http/https) → use `WebFetch` to download it
   - If the URL is a local file path → use `Read` to access it

2. Save to:

```bash
mkdir -p "designbook/screenshots/${storyId}/reference"
```

Save as `designbook/screenshots/${storyId}/reference/default.png`.

3. A single image reference applies to all breakpoints — there is no per-breakpoint variant for image references.
