---
when:
  frameworks.css: daisyui
  stages: [create-component]
---

# DaisyUI Styling Rules

All styling MUST use Tailwind CSS utility classes and DaisyUI component classes exclusively. No custom CSS is allowed.

## Allowed

- **Tailwind utility classes**: `text-lg`, `p-4`, `flex`, `gap-2`, `rounded-lg`, `bg-base-200`, etc.
- **DaisyUI component classes**: `btn`, `card`, `badge`, `navbar`, `hero`, `menu`, etc.
- **DaisyUI modifier classes**: `btn-primary`, `btn-sm`, `card-compact`, `badge-accent`, etc.
- **Tailwind responsive prefixes**: `md:text-xl`, `lg:grid-cols-3`, etc.
- **Tailwind state prefixes**: `hover:bg-base-300`, `focus:ring`, etc.

## Not Allowed

- Custom CSS files for component styling
- Inline `style` attributes
- CSS custom properties (`var(--my-color)`) in component markup
- `<style>` blocks in Twig templates
- Any hand-written CSS for layout, spacing, colors, or typography

## Why?

DaisyUI + Tailwind provides a complete design system through utility classes. All design tokens are mapped to Tailwind/DaisyUI theme values (via the generated CSS token files), making custom CSS unnecessary. This ensures:
- Consistent design language across all components
- Automatic dark mode support via DaisyUI themes
- No CSS specificity conflicts
- Smaller bundle sizes through Tailwind's purge mechanism
