# Region Properties Resolver: 1:1 element-property lookup for create-component / create-scene

**Date:** 2026-05-09
**Status:** Draft

## Problem

When importing an existing website, `create-component` and `create-scene` guess properties (colors, padding, layout) from screenshots and `design_hint.markup` instead of reading them from the rendered source. Result: thin markup/CSS, verify mismatches.

`extract-reference` already produces a curated `DesignReference` (sections, landmarks, forms — semantic structure). What's missing is a deterministic **detail layer**: every visible element with its computed properties.

## Goal

Add a code resolver `region_properties` to core. When `create-component` or `create-scene` runs against a URL-typed design reference, the resolver:

1. Walks the rendered DOM with Playwright (deterministic — not LLM inference).
2. Caches the full property tree at `{reference_folder}/.element-tree/source.json`.
3. Locates the subtree for the current task's region by role / heading / label / bbox heuristic.
4. Returns a `RegionProperties` object — schema-validated.

The downstream task receives `region_properties` as an optional param. A core rule extends the schemas of both consumer tasks and tells the AI: *when present, treat `style` values as authoritative*. Markup and CSS are derived 1:1 from the bag instead of guessed.

## What stays untouched

- **`extract-reference`** — no body change, no schema change. Stays AI-driven.
- **`extract.json`** on disk — same shape as today. AI still synthesizes the curated DesignReference from screenshots.
- **`Component`, `DesignReference`, `SceneFile`** — schemas unchanged.
- **All workflows** — no step list changes.

## Two parallel paths (separate producers, combined at consumer)

```
                       Source (URL)
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
 AI runs Playwright                       Walker runs in TS resolver
 + screenshots,                           via Playwright API (separate
 synthesizes the                          process or shared session),
 curated DesignReference                  deterministic
        │                                       │
        ▼                                       ▼
   extract.json                          .element-tree/source.json
   (semantic: sections,                  (deterministic: every visible
   landmarks, forms,                     element + computed style + bbox)
   breakpoints)                                 │
        │                                       │
        │                                  resolver locates region
        │                                  by role/heading/label/bbox
        │                                       │
        │                                       ▼
        │                                  RegionProperties
        │                                  (root_id + subtree slice)
        │                                       │
        └────────────────┬──────────────────────┘
                         ▼
            create-component / create-scene
            - reference (extract.json) — table of contents
            - region_properties (resolver) — 1:1 style truth
```

The two artifacts have **different producers** (AI vs. code) and **different cadences** (extract.json once per source; element-tree.json once per source then reused) but **converge at the consumer** through the regular schema-driven param-resolution flow.

## Files

```
.agents/skills/designbook/design/
  schemas.yml                                    # add RegionProperties + PropertyNode types
  resources/
    element-walker.js                            # walker (jsdom-testable + playwright-driver)
  rules/
    region-properties.md                         # extends create-component/create-scene with the param;
                                                 # body tells the AI to treat the bag as authoritative

packages/storybook-addon-designbook/src/resolvers/
  region-properties.ts                           # the code resolver
  __tests__/region-properties.test.ts

packages/storybook-addon-designbook/src/__tests__/
  element-walker.test.ts                         # walker unit tests

packages/storybook-addon-designbook/src/resolvers/index.ts   # register the new resolver

tests/fixtures/element-walker/
  basic-page.html                                # walker fixture
```

## Components

### 1. Walker (`element-walker.js`)

Two surfaces in one ESM module:

- **`walkDocument(doc, options): CapturedSource`** — pure, takes a DOM, returns a `CapturedSource`. Tested under jsdom in vitest.
- **default export `(page) => Promise<void>`** — playwright-cli `run-code`-compatible async function. Handles client-side rendering and post-load redirects (URL-stability + networkidle loop, configurable budget, default 30 s) before invoking `walkDocument`. Writes JSON to `process.env.GRAPHIFY_OUT`.

The two surfaces let us unit-test the mapping logic (jsdom) and integration-test the capture (playwright-cli) separately.

#### CapturedSource shape

```ts
type CapturedSource = {
  source_kind: 'url-dom' | string;       // future adapters: 'figma', 'screenshot-vision'
  source_ref: string;                    // URL, Figma file ID + frame, screenshot path
  captured_at: string;                   // ISO-8601
  viewport?: { width: number; height: number };
  adapter_version: string;               // e.g. 'url-playwright/0.1.0'
  nodes: PropertyNode[];
};

type PropertyNode = {
  id: string;                            // deterministic hash from dom_path + bbox
  parent_id?: string;
  child_ids: string[];                   // reading / visual order
  label: string;                         // heading text, layer name, ARIA label, ...
  kind: 'section' | 'container' | 'text' | 'image' | 'icon' | 'button' | 'input' | 'link'
        | 'list' | 'list-item' | 'form' | 'media';
  role?: 'banner' | 'navigation' | 'main' | 'contentinfo' | 'search' | 'form' | 'complementary' | 'region';
  heading_context?: string;              // nearest preceding heading — strongest source-agnostic anchor
  bbox: { x: number; y: number; width: number; height: number };
  text?: string;
  href?: string;
  src?: string;
  alt?: string;
  style: {
    layout?: 'flex-row' | 'flex-col' | 'grid' | 'stack' | 'absolute' | 'none';
    main_axis_align?: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
    cross_axis_align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
    gap?: string;
    padding: string;                     // normalized "<top> <right> <bottom> <left>" or shorthand
    margin: string;
    border?: string;
    border_radius?: string;
    background: string;                  // resolved hex (or url() ref); never rgb(…)
    foreground: string;                  // resolved hex
    font_family?: string;
    font_size?: string;
    font_weight?: string;
    line_height?: string;
    letter_spacing?: string;
    text_transform?: 'uppercase' | 'lowercase' | 'capitalize';
  };
  source: {
    locator: string;                     // adapter-specific: dom_path | figma_node_id | bbox_hash
    raw?: object;                        // adapter-specific extras, opaque to consumers
  };
};
```

The walker is **source-agnostic**: a future Figma walker (`walkFigmaFile`) or screenshot-vision walker plugs into the same `CapturedSource` shape; only the producer differs.

#### Client-side rendering and redirects

SPAs (Angular, React, Vue, …) ship near-empty initial HTML and assemble the DOM in JS after `load`. Many sites also redirect post-load (HTTP 30x is followed by `goto` automatically; JS redirects, OAuth round-trips, and SPA route guards are not). The default export waits for **URL stability + network idle** before invoking `walkDocument`:

1. Probe `page.waitForLoadState('load')` then `page.waitForLoadState('networkidle', { timeout: 5_000 })` — both `.catch(() => {})` so nothing throws.
2. Sample `page.url()`. URL changed since last sample? Mark a new "last-change" timestamp and loop — the page just navigated; nothing it rendered before was the final state.
3. URL stable for ~1.5 s **and** networkidle resolved → wait one more `500 ms` animation buffer and return.
4. Total wall-clock budget capped at `GRAPHIFY_WAIT_MS` (default 30 000 ms). On timeout: walk whatever is current — best-effort.

Covers HTTP 30x, JS redirects, auth/OAuth detours, SPA route guards, long-polling sites uniformly.

The pure `walkDocument` function never sees this logic — the wait belongs in the Playwright surface, the walker stays jsdom-testable.

### 2. Resolver (`region-properties.ts`)

Implements `ParamResolver` from `packages/storybook-addon-designbook/src/resolvers/types.ts`. Conceptual flow:

```ts
export const regionPropertiesResolver: ParamResolver = {
  name: 'region_properties',
  async resolve(_input, config, context) {
    const url = context.params['vision.design_reference.url'];
    const type = context.params['vision.design_reference.type'];
    if (!url || type !== 'url') {
      return { resolved: true, value: undefined, input: '' };
    }

    const refDir = referenceFolder(url, context.config);
    const sourcePath = path.join(refDir, '.element-tree', 'source.json');

    // Capture if missing (idempotent, cache-key = URL hash + adapter version)
    if (!await exists(sourcePath)) {
      await runWalker(url, sourcePath);
    }

    // Read CapturedSource and locate region root
    const captured: CapturedSource = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
    const hint = buildRegionHint(context.params); // component.id / scene_path / extract.sections[]
    const region = locateRegion(captured, hint);  // role → heading → label → bbox

    return { resolved: true, value: region, input: url };
  },
};
```

`locateRegion` is pure TypeScript — testable without Playwright. `runWalker` shells out via `npx playwright-cli` (or uses `playwright` directly; decision in implementation).

`ResolverResult.value` is currently typed `string | unknown[]`. The resolver may need a small type widening to allow object values (or returning the JSON-stringified form). Open question in the plan.

#### RegionProperties output shape

```ts
type RegionProperties = {
  matched_via: 'role' | 'heading' | 'label' | 'bbox' | 'none';
  root_id?: string;            // missing when matched_via === 'none'
  nodes: PropertyNode[];       // subtree, parent_id encodes hierarchy; empty when matched_via === 'none'
};
```

When `matched_via === 'none'`, the resolver still returns successfully with `nodes: []`. The rule body tells the AI: *empty bag → fall back to extract.json + design hints*.

#### Region matching

In order of preference, accept the first hit:

1. **Role match** — current task's region maps to a known semantic role:
   - "header" / "site_header" → `role: banner`
   - "footer" / "site_footer" → `role: contentinfo`
   - "main" / "content" → `role: main`
   - any nav region → `role: navigation`
   - any form region → `role: form`
2. **Heading match** — node whose `heading_context` or `label` contains the section title from `extract.json.sections[]` (case-insensitive substring). Most robust source-agnostic anchor.
3. **Label match** — fuzzy comparison `label ~= component.id` or `label ~= section_id` (lowercase, `-`/`_` → space).
4. **Bbox / reading-order fallback** — if `extract.json.sections[i]` carries a reading-order index, walk top-level body children in document order.

Tie-break: earliest in reading order (lowest `bbox.y`, then lowest `bbox.x`).

### 3. Rule (`region-properties.md`)

Extends the schemas of `create-component` and `create-scene` to include the optional `region_properties` param. The body explains how the AI should consume it.

```yaml
---
name: designbook:design:region-properties
trigger:
  steps: [create-component, create-scene]
extends:
  region_properties:
    $ref: ../schemas.yml#/RegionProperties
    description: |
      Authoritative element properties for the region this task covers. Optional —
      present only when vision.design_reference.type === "url" and the resolver
      found a matching subtree.
    resolve: region_properties
    from: vision.design_reference.url
---

# Region Properties

When `region_properties` is present and `region_properties.matched_via !== "none"`:

- The `nodes[]` describe the actual rendered subtree of the region this task covers.
- The `style` values are ground truth. Use them 1:1 in markup and CSS.
- Do not guess values that are present in the bag — only fall back to design tokens
  and `design_hint` for properties not in `style`.

When `region_properties` is missing or `matched_via === "none"`, run with the
previous behavior: derive from `reference` (extract.json) + `design_hint`.
```

### 4. Schemas (`designbook/design/schemas.yml`)

Add `RegionProperties` and `PropertyNode` as new top-level types. Both populated with teaching signals (`description`, `enum`, `examples`) per `schema-files.md` SCHEMA-02. No changes to existing types (`DesignReference`, `Component`, etc.).

### 5. Resolver registration (`resolvers/index.ts`)

Add `regionPropertiesResolver` to the registry export so the engine resolves `resolve: region_properties` declarations.

## Caching

The resolver caches at `{reference_folder}/.element-tree/source.json` keyed by URL hash (the `reference_folder` already encodes the URL via `reference-folder.ts`). Cache hit = filesystem `exists` + adapter version match. Cache miss = walker run. The `.element-tree/` directory is owned exclusively by the resolver — never touched by `extract-reference`.

Existing `reference_folder`-based cache invalidation (URL change → new hash → new directory) covers the resolver automatically.

## Non-goals

- **Changes to `extract-reference` or `extract.json`.** Stays AI-driven, semantic. The resolver runs independently.
- **Figma adapter / screenshot adapter.** The walker shape supports them; only `url-playwright` ships in this iteration.
- **graphify integration.** Earlier proposals included a graphify run on the walker output. Dropped: graphify's value-add (community detection, `semantically_similar_to`, GraphRAG) is not used by this lookup path. Walker output is the data we need; we read it directly.
- **MCP server, eager pre-capture, parallel pre-capture.** All later optimizations.
- **Component-reuse detection** (same button across sections). Possible later via cross-region comparison; not in scope.

## Error behavior

| Case | Behavior |
|---|---|
| graphify CLI dependency | Not used. No setup hint. |
| `vision.design_reference.type !== "url"` | Resolver returns `value: undefined`. Param absent; create-component runs with previous behavior. |
| Playwright not installed | Resolver logs setup hint, returns `value: undefined`. Param absent. |
| URL unreachable | Walker throws; resolver logs, returns `value: undefined`. |
| SPA never reaches networkidle | URL-stability loop completes without networkidle, walker proceeds. Best-effort capture. |
| Page redirects | URL change resets stability window; walker waits for the new page to settle. |
| Region match fails | Resolver returns `{ matched_via: "none", nodes: [] }`. Rule body falls back. |
| `source.json` corrupt | Resolver re-walks (treat as cache miss); on re-walk failure, returns `undefined`. |
| Walker output violates contract | Caught by walker contract test in CI before merge; runtime path defaults to "missing". |

## Testing

- **Walker unit tests** (`element-walker.test.ts`) — vitest + jsdom against `tests/fixtures/element-walker/basic-page.html`. Asserts source-kind, role detection, color normalization (hex, never rgb), kind classification, deterministic IDs, visibility filtering, padding/margin normalization.
- **Resolver unit tests** (`region-properties.test.ts`) — vitest. Mocks the walker (returns a known `CapturedSource`), asserts `locateRegion` for every match strategy (role/heading/label/bbox/none). Asserts `value: undefined` when type ≠ "url".
- **End-to-end smoke test** — manual; runs the design-shell workflow against a stable URL. Asserts `.element-tree/source.json` materializes on the first `create-component` and that subsequent `create-component` calls reuse the cache. Asserts a generated component's CSS reflects walker-captured colors / padding from the source.

## Open questions

- **`ResolverResult.value` type widening.** Currently `string | unknown[]`. Returning `RegionProperties` (an object) requires either widening the type or returning a JSON-stringified value. Decide in implementation; widening is preferred (more resolver patterns will want object returns).
- **Walker invocation: `npx playwright-cli` vs. `playwright` SDK.** The CLI matches the existing project pattern; the SDK is more idiomatic for TS resolvers. Either works; benchmark cold-start time once the resolver is wired.
- **Resolver scope access.** The resolver needs `vision.design_reference.url`, `vision.design_reference.type`, the current `component.id` (or `scene_path`), and `extract.json`'s sections list. Verify the existing `ResolverContext.params` exposes all of this, or extend the context if needed.
- **Token budget on `region_properties.nodes[]` for very deep trees.** Each `PropertyNode` is ~200–400 chars JSON; a 50-node subtree is ~15 KB. Investigate whether the rule body should clip the tree at depth N or summarize repeated styles before handing to the create-component context.
