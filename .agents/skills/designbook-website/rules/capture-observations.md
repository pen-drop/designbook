---
name: website-capture-observations
trigger:
  steps: [observe-website]
filter:
  extensions: [website]
---

# Observe the selected website source

Use available browser tools to inspect the selected URL and exact native CSS
locators. Execute the selected states and viewport dimensions, confirming the
intended subject content before capturing each screenshot. Existing extraction
and browser capture CLI tools are source-access accelerators; their raw dumps are
staging inputs, not the shared extract. Translate actual nodes, measured values,
asset identities and observed interactions into the shared schema. Preserve native
CSS locators on observed nodes. Download required image and non-system font files
into the declared capture asset outputs. Record unavailable required observations
explicitly; a nonzero selector count alone does not establish subject identity.
