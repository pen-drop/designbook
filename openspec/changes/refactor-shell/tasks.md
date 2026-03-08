# Tasks: refactor-shell

## 1. Vite Plugin: Shell Screen Discovery
- [ ] Add `shell/*.screen.yml` glob pattern to vite-plugin screen discovery
- [ ] Map shell screens to Storybook title `Designbook/Shell/{name}`
- [ ] Pass `docs` field from screen YAML to CSF `parameters.docs.description.story`
- [ ] Test: `shell/shell.screen.yml` is discovered and renders in Storybook

## 2. Create page/header/footer Components
- [ ] Create `components/page/page.component.yml` with slots: header, content, footer
- [ ] Create `components/page/page.twig` with slot rendering
- [ ] Create `components/header/header.component.yml` with props: logo, nav_items, cta
- [ ] Create `components/header/header.twig`
- [ ] Create `components/footer/footer.component.yml` with props: links, copyright, social
- [ ] Create `components/footer/footer.twig`

## 3. Create Shell Screen
- [ ] Create `designbook/shell/shell.screen.yml` composing page + header + footer
- [ ] Include `docs` field with layout pattern and responsive behavior description
- [ ] Verify screen renders in Storybook

## 4. Update Addon
- [ ] Update `03-design-system.mdx`: remove Application Shell DeboSection, add link to Shell screen
- [ ] Update `DeboExportPage.jsx`: change completion check from `design-shell/shell-spec.md` to `shell/shell.screen.yml`

## 5. Rewrite Workflow
- [ ] Rewrite `.agent/workflows/debo-design-shell.md` to produce `shell.screen.yml` + components
- [ ] Add component existence checks (create page/header/footer if missing)
- [ ] Keep conversational design questions (layout, navigation, responsive)

## 6. Update Promptfoo Tests
- [ ] Update `promptfoo/fixtures/debo-design-shell/` with new structure
- [ ] Update `promptfoo/promptfooconfig.yaml` shell test prompt and rubric
- [ ] Run `npm run lint && cd packages/storybook-addon-designbook && npx vitest run`

## 7. Verify
- [ ] Storybook shows shell screen with header, content, footer
- [ ] Docs tab shows layout description
- [ ] DeboExportPage shows shell as completed
- [ ] Promptfoo test passes
