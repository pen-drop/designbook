# Tasks: DaisyUI → Plain Tailwind

## Package & Config

- [x] Remove `daisyui` from `package.json` dependencies
- [x] Set `DESIGNBOOK_FRAMEWORK_CSS: tailwind` in `designbook.config.yml`

## CSS Pipeline

- [x] `css/app.src.css` — remove `@import "./plugins/_daisyui.config.src.css"` and `@import "./themes/dark.src.css"`, remove all `ui_suite_daisyui` `@source` entries
- [x] `css/tokens/color.src.css` — replace `@plugin "daisyui/theme"` block with `@theme {}` containing Eier palette from `design-tokens.yml`
- [x] Delete `css/plugins/_daisyui.config.src.css`
- [x] Delete `css/themes/dark.src.css`

## Twig — header.twig

- [x] Replace inner `<div class="navbar ...">` / `navbar-start` / `navbar-end` with `flex items-center h-16` / `flex flex-1 items-center` / `flex items-center gap-2`

## Twig — navigation.twig

- [x] Desktop nav links: replace `btn btn-ghost btn-sm font-body` with plain Tailwind hover/focus classes
- [x] Hamburger button: replace `btn btn-ghost` with plain Tailwind `p-2 rounded-md` classes
- [x] Dropdown wrapper: replace `dropdown dropdown-end lg:hidden` with `relative lg:hidden group/nav` + `tabindex="-1"`
- [x] Dropdown menu: replace `menu menu-sm dropdown-content rounded-box ...` with absolute-positioned `hidden group-focus-within/nav:flex flex-col` list
- [x] Dropdown items `<li><a>`: replace DaisyUI menu-item styles with plain Tailwind block link
- [x] Footer links: replace `link link-hover` with `hover:underline underline-offset-2`

## Twig — button.twig

- [x] Replace `btn btn-primary` with explicit `inline-flex` Tailwind classes
- [x] Replace `btn btn-outline btn-primary` with explicit border + hover classes
- [x] Add `ghost` variant: replace `btn btn-ghost` with `inline-flex ... text-primary hover:bg-primary/10`
