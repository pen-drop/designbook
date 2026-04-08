## 1. Constants & Globals Setup

- [x] 1.1 Add `VISUAL_COMPARE_KEY` constant (`designbook:visual-compare`) and `VISUAL_TOOL_ID` to `constants.ts`
- [x] 1.2 Add initial globals entry in `preview.ts` with default state `{ breakpoint: null, opacity: 50 }`

## 2. Toolbar Dropdown (Manager)

- [x] 2.1 Create `VisualCompareTool` component with dropdown button, breakpoint list, opacity slider, and diff badges
- [x] 2.2 Implement breakpoint discovery — probe known breakpoint names against `/__designbook/load` to find available references
- [x] 2.3 Implement diff report parsing — fetch `report.md` via load endpoint, extract per-breakpoint diff percentage and threshold
- [x] 2.4 Implement viewport switching — update Storybook viewport globals when a breakpoint is selected
- [x] 2.5 Wire globals: write `designbook:visual-compare` state (`breakpoint`, `opacity`) on user interaction

## 3. Reference Overlay (Preview)

- [x] 3.1 Create `withVisualCompare` decorator that reads `designbook:visual-compare` globals
- [x] 3.2 Render reference image as absolutely positioned overlay with opacity from globals, `pointer-events: none`
- [x] 3.3 Construct image URL from current storyId and selected breakpoint via `/__designbook/load` endpoint
- [x] 3.4 Handle 404 gracefully — if reference image fails to load, do not render overlay

## 4. Manager Registration

- [x] 4.1 Register `VisualCompareTool` as `types.TOOL` in `manager.tsx` with scene-only match
- [x] 4.2 Remove the `types.TAB` (Visual tab) registration from `manager.tsx`
- [x] 4.3 Register `withVisualCompare` decorator in `preview.ts`

## 5. Quality

- [x] 5.1 Run `pnpm check` — fix typecheck, lint, and test errors
