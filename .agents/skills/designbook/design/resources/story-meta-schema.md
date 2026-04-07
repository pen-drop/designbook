# Story Meta Schema

JSON Schema defining the `meta.yml` file at `designbook/stories/{storyId}/meta.yml`.

```yaml
type: object
properties:
  reference:
    type: object
    description: Visual reference configuration for this story.
    required: [source, breakpoints]
    properties:
      source:
        type: object
        required: [url]
        properties:
          url:
            type: string
            description: URL to screenshot as reference. Always present — all origins resolve to a URL.
          origin:
            type: string
            description: Where the URL came from (e.g. "stitch", "figma", "manual"). Informational only.
          screenId:
            type: string
            description: Origin-specific identifier for re-resolving (e.g. Stitch screen resource name).
          hasMarkup:
            type: boolean
            description: >
              True if the reference URL serves inspectable HTML (CSS properties, fonts, DOM).
              Set by origin-specific rules (e.g. resolve-stitch-url sets this to true).
              When true, compare-markup task runs alongside compare-screenshots.
              When false or absent, only pixel comparison is performed.
      breakpoints:
        type: object
        description: >
          Per-breakpoint configuration. Keys are breakpoint names from design-tokens.yml (e.g. sm, md, lg, xl).
          Only breakpoints listed here are captured and compared.
        additionalProperties:
          type: object
          properties:
            threshold:
              type: number
              default: 3
              description: Diff threshold in percent. Differences below this value are PASS. Default 3%.
            lastDiff:
              type: number
              nullable: true
              description: Last computed diff percentage from compare-screenshots. Null if never compared.
            lastResult:
              type: string
              nullable: true
              enum: [pass, fail, null]
              description: Last comparison result. Null if never compared.
```

## Example

```yaml
# designbook/stories/designbook-design-system-shell/meta.yml
reference:
  source:
    url: "https://stitch-preview.example.com/screen/abc123"
    origin: stitch
    screenId: "projects/123/screens/abc123"
    hasMarkup: true
  breakpoints:
    sm:
      threshold: 3
      lastDiff: 2.1
      lastResult: pass
    xl:
      threshold: 5
      lastDiff: null
      lastResult: null
```

## Path Convention

All story artifacts live under `designbook/stories/{storyId}/`:

```
designbook/stories/{storyId}/
  meta.yml                        ← this file
  screenshots/
    reference/{breakpoint}.png    ← baseline (committed)
    current/{breakpoint}.png      ← latest capture (gitignored)
    diff/{breakpoint}.png         ← pixel diff output (gitignored)
```
