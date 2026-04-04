## Context

The `css-generate` workflow transforms `design-tokens.yml` into CSS custom properties via JSONata expressions. Each group in `css-mapping.md` becomes one `.jsonata` → one `.src.css` file. Currently, the `typography` group only emits `--font-heading`, `--font-body`, `--font-mono` (fontFamily). The `jsonata-template.md` blueprint explicitly skips composite typography tokens (`$type: typography`).

Components use arbitrary Tailwind utilities (`text-sm`, `text-lg`, `font-bold`) instead of token-based values, causing visual divergence from the design reference. The tokens workflow (`intake--tokens.md` Step 3) only asks about font families, not sizes/weights/line-heights.

## Goals / Non-Goals

**Goals:**
- Typography scale tokens in `design-tokens.yml` with semantic roles (display, headline, title, body, label)
- `css-generate` emits CSS custom properties for the full type scale (`--text-*`)
- Components can reference typography tokens via `var()` or Tailwind utilities
- `tokens:intake` guides the user through defining or extracting a type scale

**Non-Goals:**
- Migrating existing components to use typography tokens (downstream task)
- Responsive typography (clamp-based fluid scaling) — future enhancement
- Changing the `typography` fontFamily group — it stays as-is

## Decisions

### 1. Token schema: composite `$type: typography` tokens

**Decision:** Use DTCG composite typography tokens under `semantic.typography-scale.*` with `$type: typography`.

```yaml
semantic:
  typography-scale:
    display-lg:
      $type: typography
      $value:
        fontSize: "3.5rem"
        fontWeight: "700"
        lineHeight: "1.1"
        fontFamily: "{semantic.typography.heading}"
    headline-md:
      $type: typography
      $value:
        fontSize: "1.75rem"
        fontWeight: "600"
        lineHeight: "1.3"
        fontFamily: "{semantic.typography.heading}"
    body-md:
      $type: typography
      $value:
        fontSize: "1rem"
        fontWeight: "400"
        lineHeight: "1.6"
        fontFamily: "{semantic.typography.body}"
```

**Why over individual tokens:** DTCG composite tokens group related values semantically. This matches how typography roles work — size, weight, and line-height are always used together. The JSONata expression expands them into individual CSS properties.

**Alternative considered:** Separate groups (`font-size`, `font-weight`, `line-height`). Rejected because it breaks the semantic coupling — a role's size/weight/line-height must stay together.

### 2. CSS output: expand composites into individual properties

**Decision:** The `typography-scale` group expands each composite token into three CSS custom properties:

```css
@theme {
  --text-display-lg: 3.5rem;
  --text-display-lg--weight: 700;
  --text-display-lg--line-height: 1.1;
  --text-headline-md: 1.75rem;
  --text-headline-md--weight: 600;
  --text-headline-md--line-height: 1.3;
}
```

**Why `--text-*`:** Standard Tailwind v4 namespace — `--text-*` auto-generates `text-*` utilities for font-size. The `--weight` and `--line-height` suffixes are non-standard but can be referenced via `var()`.

**Why not `--font-size-*`:** Tailwind v4 uses `--text-*` for font-size utilities, not `--font-size-*`.

### 3. New group in css-mapping, not modifying existing typography group

**Decision:** Add a separate `typography-scale` group rather than modifying the existing `typography` (fontFamily) group.

```yaml
typography-scale: { prefix: text, wrap: "@theme", path: "semantic.typography-scale", expand: "typography" }
```

The `expand: "typography"` flag tells the jsonata-template to expand composite tokens into individual properties instead of emitting a single value.

**Why separate:** The existing `typography` group works correctly for fontFamily. Mixing two token types ($type: fontFamily and $type: typography) in one group would complicate the JSONata expression unnecessarily.

### 4. Component rule location: core skill, not integration

**Decision:** Place the typography-token rule in `designbook/design/rules/` (core) rather than `designbook-drupal/`. Typography token usage is framework-agnostic — all backends should use `var(--text-*)`.

The rule applies at `create-component` step alongside `guidelines-context.md`.

### 5. Google Fonts download task in core skill, gated by extension

**Decision:** Place the Google Fonts download task inside the core `designbook` skill under `css-generate/fonts/google/`, gated by `when: extensions: google-fonts`.

Location:
```
.agents/skills/designbook/css-generate/fonts/google/
  tasks/download-fonts.md     # when: extensions: google-fonts
  rules/...                   # when: extensions: google-fonts
```

The task is a separate step in `css-generate` that:
1. Reads `semantic.typography` fontFamily tokens from `design-tokens.yml`
2. Derives font weights from `semantic.typography-scale` tokens
3. Fetches Google Fonts CSS from the API
4. Saves to `css/tokens/google-fonts.src.css`

**Why core skill with extension gate:** Google Fonts is the default case but not universal. Placing it in the core skill under `css-generate/fonts/google/` keeps the font provider hierarchy extensible (future: `fonts/adobe/`, `fonts/self-hosted/`). The `when: extensions: google-fonts` condition makes it opt-in without requiring a separate skill.

**Why dedicated task, not JSONata group:** Font downloading is an I/O operation (HTTP fetch), not a token-to-CSS transformation. It doesn't fit the JSONata expression pattern. A separate task step makes the operation explicit and controllable.

**Why before generate-css:** The downloaded CSS must appear first in the cascade. The `download-fonts` step runs before `generate-jsonata` and `generate-css`.

## Risks / Trade-offs

- **[Risk] Existing components won't use new tokens automatically** → Mitigation: This change only creates the infrastructure. Component migration is a separate downstream task. The rule prevents NEW components from using arbitrary classes.
- **[Risk] JSONata expansion adds complexity to template** → Mitigation: The `expand: "typography"` flag makes it opt-in. Existing groups are unaffected.
- **[Risk] Token naming may not match all Tailwind conventions** → Mitigation: `--text-*` is the standard Tailwind v4 font-size namespace. Weight and line-height use non-standard suffixes but work with `var()`.
