## Context

Designbook uses a framework-agnostic skill architecture where CSS framework skills handle token naming and CSS generation. Currently `designbook-css-daisyui` handles both Tailwind-level concerns (spacing, container, grid) and DaisyUI-specific concerns (color themes, component classes). The layout component (`layout-reference.md`) hardcodes CSS class names like `container-md`, `pb-auto`, `gap-md` without linking them to design tokens.

**Current state:**
- `designbook-css-daisyui` contains spacing naming conventions (xs–xl) that are actually **Tailwind** concerns
- Layout component uses `container-md`, `pb-auto`, `pt-auto` — hardcoded, no token backing
- No formal container or section-spacing token groups exist
- `debo-design-tokens` workflow only covers color + typography

## Goals / Non-Goals

**Goals:**
- Create `designbook-css-tailwind` skill with container, spacing, and section-spacing conventions
- Move spacing naming conventions from DaisyUI to Tailwind skill
- DaisyUI skill loads Tailwind as prerequisite (layered architecture)
- Layout reference uses token-backed values
- `debo-design-tokens` workflow gains steps for container + section-spacing

**Non-Goals:**
- No changes to runtime code (Vite plugin, renderer)
- No new npm packages or build-time tools
- Grid column tokens (grid-1..4 are layout patterns, not token values)
- Shadow/border tokens (deferred — Tailwind defaults sufficient for now)

## Decisions

### 1. Tailwind skill as base layer
**Decision:** Create `designbook-css-tailwind` as prerequisite for `designbook-css-daisyui`.

**Rationale:** Tailwind utilities (spacing, containers) are framework-agnostic — any CSS framework built on Tailwind needs them. DaisyUI adds theme semantics on top. This mirrors how Tailwind itself works: DaisyUI is a Tailwind plugin.

**Alternative:** Keep everything in DaisyUI. Rejected because another framework (e.g., `designbook-css-flowbite`) would need to duplicate spacing/container logic.

### 2. CSS generation via `@theme inline`
**Decision:** Tailwind skill generates `@theme inline` blocks (Tailwind v4) instead of `@plugin` format.

**Rationale:** `@theme inline` is the standard Tailwind v4 mechanism for custom theme values. It generates CSS custom properties that Tailwind utilities resolve automatically.

### 3. Section-spacing as separate token group
**Decision:** `section-spacing` is its own top-level group, not nested under `spacing`.

**Rationale:** Section-spacing maps to `py-*` on layout sections (vertical rhythm) — semantically different from general spacing (`gap-*`, `p-*`). Separate group makes the intent clear in the tokens file.

### 4. Layout reference uses token variable names
**Decision:** `layout-reference.md` documents that `container-md` resolves to `--container-md` and `pb-auto`/`pt-auto` maps to section-spacing tokens.

**Rationale:** This creates a traceable chain: Token → CSS variable → Tailwind utility → Layout component.

## Risks / Trade-offs

- **Tailwind v4 dependency** → The `@theme inline` format is Tailwind v4 specific. Mitigation: Designbook already depends on Tailwind v4.
- **Skill split complexity** → Two skills instead of one for CSS. Mitigation: Clear separation of concerns, DaisyUI just adds `prerequisite: designbook-css-tailwind`.
- **Spacing migration** → Moving naming conventions from DaisyUI to Tailwind is a documentation change only, no code impact.
