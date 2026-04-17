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
              Set by origin-specific provider rules (e.g. provide-stitch-url sets this to true).
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
            regions:
              type: object
              required: true
              description: >
                Per-region configuration. Keys are region names (e.g. "header", "footer", "full").
                Always present — every breakpoint has at least one region.
                Shell scenes use element regions (header, footer). Screen scenes use "full" (full-page).
              additionalProperties:
                type: object
                properties:
                  selector:
                    type: string
                    description: CSS selector to locate the region's DOM element in both reference and Storybook.
                  threshold:
                    type: number
                    description: Override threshold for this region. Defaults to breakpoint threshold.
```

`meta.yml` is pure reference configuration. Runtime state — checks and issues — flows through the workflow scope as data results:

- `setup-compare` writes `meta.yml` (above schema) and emits `checks[]` as a data result.
- `compare-screenshots` emits `issues[]` as a data result, consumed by `verify` via the workflow scope.
- `verify` emits `verified-issues[]` as a data result. No `meta.yml` write.

### Runtime Flow

```
setup-compare   →  writes meta.yml + emits checks[] (data result)
compare         →  emits issues[] (data result)
polish          →  fixes code
recapture       →  re-captures screenshots
verify          →  emits verified-issues[] (data result)
```

## Example

```yaml
# designbook/stories/designbook-design-system-shell/meta.yml — with regions (shell scene)
reference:
  source:
    url: "https://stitch-preview.example.com/screen/abc123"
    origin: stitch
    screenId: "projects/123/screens/abc123"
    hasMarkup: true
  breakpoints:
    sm:
      threshold: 3
      regions:
        header:
          selector: "header"
        footer:
          selector: "footer"
    xl:
      threshold: 5
      regions:
        header:
          selector: "header"
        footer:
          selector: "footer"
```

```yaml
# designbook/stories/designbook-homepage-landing/meta.yml — screen scene (full-page region)
reference:
  source:
    url: "https://stitch-preview.example.com/screen/def456"
    origin: stitch
  breakpoints:
    sm:
      threshold: 3
      regions:
        full:
          selector: ""
    xl:
      threshold: 5
      regions:
        full:
          selector: ""
```

## Path Convention

All story artifacts live under `designbook/stories/{storyId}/`:

```
designbook/stories/{storyId}/
  meta.yml                                  ← this file (reference configuration)
  screenshots/
    {breakpoint}--{region}.png              ← Storybook captures (gitignored)
  extractions/
    {breakpoint}--spec.yml                  ← AI-generated extraction plan (gitignored)
    {breakpoint}--reference.json            ← computed styles from reference URL (gitignored)
    {breakpoint}--storybook.json            ← computed styles from Storybook URL (gitignored)
```

Reference screenshots live under `designbook/references/{hash}/`:

```
designbook/references/{hash}/
  extract.json                              ← extracted design data
  reference-full.png                        ← full-page screenshot
  reference-header.png                      ← region screenshot (optional)
  {breakpoint}--{region}.png                ← breakpoint screenshots
```

The `{hash}` is computed deterministically from the reference URL by the `reference_folder` resolver. Multiple stories sharing the same reference URL share the same hash directory.

Screenshots always use `{breakpoint}--{region}.png`. For screen scenes, the region is `full` (e.g. `sm--full.png`). For shell scenes, regions match element selectors (e.g. `sm--header.png`, `sm--footer.png`).

Extraction files use `{breakpoint}--{name}` naming, matching the screenshot convention. Only present when `source.hasMarkup` is true.
