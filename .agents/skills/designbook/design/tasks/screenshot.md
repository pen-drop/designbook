---
params:
  scene: ~
files: []
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
  - path: $DESIGNBOOK_DATA/design-system/guidelines.yml
    optional: true
---

# Screenshot

Captures Storybook screenshots at all configured breakpoints using Playwright.

## Step 1: Resolve Breakpoints

Read `design-tokens.yml` and extract the `breakpoints` token group (e.g. `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`).

If `guidelines.yml` has `visual_diff.breakpoints`, filter to only those breakpoints.

If no breakpoints are defined, use only the default viewport (2560x1600).

## Step 2: Resolve Storybook URL

```bash
_debo resolve-url --scene ${scene}
```

This outputs JSON with `storyId` and `url` (the Storybook iframe URL).

## Step 3: Capture Screenshots

For each breakpoint, run Playwright CLI to capture a full-page screenshot:

```bash
npx playwright screenshot --full-page --viewport-size "${width},1600" --wait-for-timeout 3000 "${url}" "designbook/screenshots/${storyId}/storybook/${breakpoint}.png"
```

Also capture the default viewport:

```bash
npx playwright screenshot --full-page --viewport-size "2560,1600" --wait-for-timeout 3000 "${url}" "designbook/screenshots/${storyId}/storybook/default.png"
```

Create the output directory before capturing:

```bash
mkdir -p "designbook/screenshots/${storyId}/storybook"
```

## Step 4: Read Matched Rules

Read any matched rules for this step (e.g. `devtools-context` from designbook-devtools). Follow the rule instructions to collect extra context (computed styles, DOM, a11y) alongside the screenshots.

## Output

Report which screenshots were captured:

| Breakpoint | Path |
|-----------|------|
| sm        | `designbook/screenshots/{storyId}/storybook/sm.png` |
| xl        | `designbook/screenshots/{storyId}/storybook/xl.png` |
| default   | `designbook/screenshots/{storyId}/storybook/default.png` |

Read each screenshot with the `Read` tool to visually verify the capture.
