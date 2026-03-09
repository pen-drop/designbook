# Promptfoo Error Log

## 2026-03-09 — debo-design-screen (Run 1)

**Category:** assertion-too-strict
**Provider:** gemini-3-pro
**Error:** Rubric required .component.yml contents ($schema, provider, thirdPartySettings) visible in conversation output. Agent creates files but doesn't echo full contents. Also incorrectly required snake_case for component filenames (kebab-case is correct).
**Resolution:** Removed unverifiable content checks from rubric. Added storybook build assertion as structural validator instead.
