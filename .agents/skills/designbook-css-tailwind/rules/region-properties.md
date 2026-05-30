---
trigger:
  steps: [create-component]
filter:
  frameworks.style: tailwind
---

# Region Properties — Tailwind output

When materializing `region_properties.style` into output, use Tailwind
utility classes via `class="..."` and component-scoped `@apply` rules in
`${DESIGNBOOK_CSS_APP}`.

- Class names reference tokens: `bg-<token>`, `text-<token>`, `py-<token>`,
  `max-w-<token>`. Arbitrary-value classes (`bg-[#xyz]`) are a last resort
  when no token has a sensible name.
- Pixel-precise dimensional anchors derived from `bbox` (e.g. `min-h-[60px]`)
  are an allowed exception when no responsive token fits.
- Component-scoped rules in `${DESIGNBOOK_CSS_APP}` use `@apply <utility…>;`
  and CSS variables (`var(--color-<token>)`) for values not expressible as
  a single utility class (e.g. multi-stop gradients).
