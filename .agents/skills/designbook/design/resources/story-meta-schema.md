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
            lastDiff:
              type: number
              nullable: true
              description: Last computed diff percentage from compare-screenshots. Null if never compared.
            lastResult:
              type: string
              nullable: true
              enum: [pass, fail, null]
              description: Last comparison result. Null if never compared.
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
                  lastDiff:
                    type: number
                    nullable: true
                    description: Last computed diff percentage for this region.
                  lastResult:
                    type: string
                    nullable: true
                    enum: [pass, fail, null]
                    description: Last comparison result for this region.
      checks:
        type: object
        description: >
          Per-check results. Keys are `breakpoint--region` (e.g. `sm--header`, `xl--markup`).
          Written by compare tasks via `_debo story check`.
        additionalProperties:
          type: object
          properties:
            status:
              type: string
              enum: [open, done]
              description: >
                Check lifecycle status. `open` = created by compare, issues pending.
                `done` = resolved by verify after polish.
            result:
              type: string
              nullable: true
              enum: [pass, fail, null]
              description: Check verdict. Set by verify. Null while status is open.
            diff:
              type: number
              nullable: true
              description: Diff percentage (screenshot checks).
            issues:
              type: array
              description: Structured issues found during comparison.
              items:
                type: object
                properties:
                  source:
                    type: string
                    enum: [screenshots, extraction]
                    description: Where the issue was detected.
                  severity:
                    type: string
                    enum: [critical, major]
                    description: Issue severity. Only critical and major are persisted.
                  description:
                    type: string
                    description: Human-readable summary.
                  label:
                    type: string
                    nullable: true
                    description: Element label from extraction spec (extraction issues only).
                  category:
                    type: string
                    nullable: true
                    enum: [typography, layout, media, interactive, decoration]
                    description: Element category.
                  property:
                    type: string
                    nullable: true
                    description: CSS property name or null.
                  expected:
                    type: string
                    nullable: true
                    description: Expected value.
                  actual:
                    type: string
                    nullable: true
                    description: Actual value.
                  status:
                    type: string
                    enum: [open, done]
                    description: Issue lifecycle status.
                  result:
                    type: string
                    nullable: true
                    enum: [pass, fail, null]
                    description: Issue resolution result. Set by verify.
      summary:
        type: object
        description: Aggregated summary. Recomputed automatically by `_debo story check`.
        properties:
          total:
            type: integer
          pass:
            type: integer
          fail:
            type: integer
          unchecked:
            type: integer
          maxDiff:
            type: number
            nullable: true
          avgDiff:
            type: number
            nullable: true
          threshold:
            type: number
```

### Issue Lifecycle

```
compare (screenshots/extraction)  →  writes check (status: open) + issues (status: open)
polish                             →  fixes code, updates issues (status: done)
recapture                          →  re-captures screenshots
verify                             →  re-evaluates, writes result per issue (pass/fail), closes check (done)
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
          lastDiff: 2.1
          lastResult: pass
        footer:
          selector: "footer"
          lastDiff: 1.5
          lastResult: pass
    xl:
      threshold: 5
      regions:
        header:
          selector: "header"
          lastDiff: null
          lastResult: null
        footer:
          selector: "footer"
          lastDiff: null
          lastResult: null
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
          lastDiff: 2.1
          lastResult: pass
    xl:
      threshold: 5
      regions:
        full:
          selector: ""
          lastDiff: null
          lastResult: null
```

## Path Convention

All story artifacts live under `designbook/stories/{storyId}/`:

```
designbook/stories/{storyId}/
  meta.yml                                  ← this file (checks + issues)
  screenshots/
    reference/{breakpoint}--{region}.png    ← baseline (committed)
    current/{breakpoint}--{region}.png      ← latest capture (gitignored)
  extractions/
    {breakpoint}--spec.yml                  ← AI-generated extraction plan (gitignored)
    {breakpoint}--reference.json            ← computed styles from reference URL (gitignored)
    {breakpoint}--storybook.json            ← computed styles from Storybook URL (gitignored)
```

Screenshots always use `{breakpoint}--{region}.png`. For screen scenes, the region is `full` (e.g. `sm--full.png`). For shell scenes, regions match element selectors (e.g. `sm--header.png`, `sm--footer.png`).

Extraction files use `{breakpoint}--{name}` naming, matching the screenshot convention. Only present when `source.hasMarkup` is true.
