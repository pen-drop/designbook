---
when:
  extensions: google-fonts
  steps: [prepare-fonts]
---

# Google Fonts URL Construction

## Weight Derivation

Font weights SHALL be derived from `semantic.typography-scale` tokens by collecting all unique `fontWeight` values. If no typography-scale tokens exist, default to `wght@400;500;600;700`.

## URL Format

Each font family uses the Google Fonts CSS2 API:

```
https://fonts.googleapis.com/css2?family=<Name>:wght@<w1>;<w2>;<w3>&display=swap
```

- Font name: spaces replaced with `+`
- Weights: sorted numerically, joined with `;`
- Always include `display=swap`

## Output Format

The output file SHALL contain one `@import url(...)` per font family, each on its own line.
