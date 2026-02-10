# Tasks: Refactor Design Tokens

## 1. Create Design Tokens Skill

- [x] 1.1 Create `.agent/skills/designbook-tokens/SKILL.md` (the "storage" skill).
- [x] 1.2 Implement "Central Storage & Validation":
    - [x] 1.2.1 Accept W3C JSON input.
    - [x] 1.2.2 Validate against W3C schema.
    - [x] 1.2.3 Save to `designbook/design-tokens.json`.
- [x] 1.3 Update `designbook-figma-tokens` (the "source" skill):
    - [x] 1.3.1 Ensure it generates W3C JSON.
    - [x] 1.3.2 Modify it to call `designbook-tokens` (or return data to be passed to it) instead of saving directly.

## 2. Refactor Workflow

- [x] 2.1 Update `.agent/workflows/debo-design-tokens.md`:
    - [x] 2.1.1 Interview user.
    - [x] 2.1.2 Construct W3C JSON.
    - [x] 2.1.3 Call `designbook-tokens` to save.

## 3. Update Storybook Addon

- [x] 3.1 Modify `packages/storybook-addon-designbook/src/components/DeboDesignTokensCard.jsx`:
    - [x] 3.1.1 Implement recursive rendering for W3C Groups.
    - [x] 3.1.2 Implement valid rendering for W3C Tokens (`$type` detection).
- [x] 3.2 Modify `packages/storybook-addon-designbook/src/onboarding/design-system.mdx`:
    - [x] 3.2.1 Change data source to `designbook/design-tokens.json`.
    - [x] 3.2.2 Use `JSON.parse` as parser.

## 4. Verification

- [ ] 4.1 Run `/debo-design-tokens` workflow and verify W3C token generation.
- [ ] 4.2 Open Storybook and verify tokens are displayed correctly in the Design System tab.
