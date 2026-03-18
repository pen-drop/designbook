# Design: DaisyUI → Plain Tailwind

## CSS Token Strategy

Color utility names (`bg-primary`, `text-base-content`, `bg-base-100`, etc.) are **unchanged** in all Twig templates. Tailwind v4 auto-generates utility classes for all `--color-*` variables defined in `@theme`. Converting the color token format from `@plugin "daisyui/theme"` to `@theme {}` is sufficient.

## Component Class Replacements

| DaisyUI class | Tailwind replacement |
|---|---|
| `navbar` | `flex items-center h-16` |
| `navbar-start` | `flex flex-1 items-center` |
| `navbar-end` | `flex items-center gap-2` |
| `btn btn-primary` | `inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-content hover:bg-primary/90 active:bg-primary/80 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none` |
| `btn btn-outline btn-primary` | `inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border-2 border-primary text-primary hover:bg-primary hover:text-primary-content transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none` |
| `btn btn-ghost` (hamburger) | `p-2 rounded-md text-base-content hover:bg-base-200 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none` |
| `btn btn-ghost btn-sm` (nav link) | `px-3 py-1.5 text-sm font-medium rounded-md text-base-content hover:bg-base-200 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none` |
| `dropdown dropdown-end` | `relative group/nav` + `tabindex="-1"` |
| `menu menu-sm dropdown-content rounded-box ...` | `hidden group-focus-within/nav:flex flex-col absolute right-0 top-full mt-1 w-52 bg-base-100 border border-base-300 rounded-xl shadow-lg py-1.5 z-10` |
| `li > a` in menu | `block px-3 py-2 text-sm font-body text-base-content hover:bg-base-200 rounded-lg transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none` |
| `link link-hover` | `hover:underline underline-offset-2` |

## Dropdown Without DaisyUI

Use Tailwind's `group-focus-within` with a named group:

```twig
<div class="relative lg:hidden group/nav" tabindex="-1">
  <button type="button" class="p-2 rounded-md ...">hamburger</button>
  <ul class="hidden group-focus-within/nav:flex flex-col absolute right-0 ...">
    <li><a href="...">Item</a></li>
  </ul>
</div>
```

## Eier Color Tokens

The current `color.src.css` has old "eternia" colors. Replace with Eier palette from `design-tokens.yml`:

- primary: `#D97706` (amber)
- secondary: `#C2410C` (terracotta)
- accent: `#4D7C0F` (sage)
- base-100: `#FFFBEB` (warm cream)
