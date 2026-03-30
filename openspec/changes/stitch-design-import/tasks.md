## 1. stitch-tokens Rule

- [x] 1.1 Create `designbook-stitch/rules/stitch-tokens.md` — `when: steps: [tokens:intake], extensions: stitch`
- [x] 1.2 Define font enum → Google Fonts name mapping table in the rule (all 29 Stitch font enums)
- [x] 1.3 Define roundness enum → pixel value mapping table in the rule
- [x] 1.4 Define designTheme field → token path mapping (customColor → color.primary, etc.)
- [x] 1.5 Define instruction flow: get_project → extract designTheme → present proposals → user confirms

## 2. stitch-guidelines Rule

- [x] 2.1 Create `designbook-stitch/rules/stitch-guidelines.md` — `when: steps: [design-guidelines:intake], extensions: stitch`
- [x] 2.2 Define instruction flow: list_screens → select screen → get_screen → fetch htmlCode → analyze
- [x] 2.3 Define HTML analysis instructions: extract Tailwind classes, identify component patterns, layout principles, atmosphere
- [x] 2.4 Define proposal format: map analysis results to guidelines.yml keys (principles, component_patterns, design_reference, mcp)
- [x] 2.5 Define screenshot analysis instructions: fetch screenshot.downloadUrl, use visual analysis for atmosphere description
