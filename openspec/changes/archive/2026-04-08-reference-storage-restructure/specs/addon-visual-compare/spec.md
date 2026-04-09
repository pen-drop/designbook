## MODIFIED Requirements

### Requirement: VisualCompareTool reads meta.yml for breakpoint discovery

**Previous**: `discoverBreakpoints()` probed each known breakpoint (sm, md, lg, xl, 2xl) by fetching the image URL individually, then parsed `report.md` for diff data.

**New**: `discoverBreakpoints()` fetches `designbook/stories/{storyId}/meta.yml` via `/__designbook/load`. The response contains all breakpoint names, thresholds, and last results in a single request.

#### Scenario: meta.yml exists with breakpoints

- **GIVEN** `meta.yml` has `reference.breakpoints: { sm: { threshold: 3, lastDiff: 2.1, lastResult: pass }, xl: { threshold: 5, lastDiff: null, lastResult: null } }`
- **WHEN** `discoverBreakpoints(storyId)` is called
- **THEN** it returns two entries: `[{ name: 'sm', threshold: 3, diffPercent: 2.1, pass: true }, { name: 'xl', threshold: 5, diffPercent: null, pass: null }]`
- **AND** no individual image probing occurs

#### Scenario: meta.yml does not exist

- **GIVEN** no `meta.yml` exists for the story
- **WHEN** `discoverBreakpoints(storyId)` is called
- **THEN** it returns an empty array
- **AND** the dropdown shows "No references found"

#### Scenario: meta.yml exists but response is not YAML

- **GIVEN** the endpoint returns a non-YAML response (e.g., JSON error body)
- **WHEN** `discoverBreakpoints(storyId)` is called
- **THEN** it returns an empty array (graceful degradation)

### Requirement: Reference overlay image path

**Previous**: `withVisualCompare` loaded reference images from `/__designbook/load?path=screenshots/{storyId}/reference/{breakpoint}.png`

**New**: Path changes to `/__designbook/load?path=stories/{storyId}/screenshots/reference/{breakpoint}.png`

#### Scenario: Overlay renders reference at new path

- **GIVEN** visual compare is active with breakpoint `sm`
- **WHEN** the decorator creates the overlay image element
- **THEN** `img.src` is `/__designbook/load?path=stories/{storyId}/screenshots/reference/sm.png`

## REMOVED Requirements

### Requirement: Report.md parsing

**Reason**: Diff percentages and pass/fail results are now stored in `meta.yml`. The `parseReport()` function and report.md fetching are no longer needed.

**Migration**: `BreakpointInfo.diffPercent`, `threshold`, and `pass` are populated from `meta.yml` → `reference.breakpoints.{bp}`.

### Requirement: Individual breakpoint image probing

**Reason**: `meta.yml` declares which breakpoints have references. No need to probe each image URL with a GET request.

**Migration**: `discoverBreakpoints()` is rewritten to fetch and parse `meta.yml`.
