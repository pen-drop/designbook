# Designbook explainer — storyline (v5)

The film is silent and in English, 60 s long, 1920 × 1080. Approved by cw on 2026-10-13
(DESIGNBOOK-81, amendments 4 and 5).

**Frame layout:**
- The chapter title sits top left.
- A Storybook window shows the sidebar on the left and the content on the right.
- The AI chat widget sits bottom right: 👤 is the user, 🤖 is the agent.

**Rules:**
- Every Storybook picture is a real capture from the `drupal-recipe` fixture, taken at the stage the chapter shows. The only exception is the Drupal page.
- In every chapter the view switches first, so the empty page is visible. Only then does the chat continue, followed by the result.
- From Data model on, the agent first previews what it would create (taken from the real output). The result appears only after 👤 `Yes.`
- No reference exists at the start. It first appears once it has been extracted.

## 0–4 s · Opening

- The Designbook logo with "another design tool".
- At 1.6 s, "**NOT**" drops in front of it.

## 4–12.5 s · Explain your vision

- **Storybook:** an empty Designbook with no reference. The sidebar shows only Foundation, Design System and Sections, and the Vision tab is empty.
- **Chat:**
  1. 👤 `We created this famous recipe page in Figma. Make a Drupal page.` → send
  2. The real vision appears.
  3. 🤖 `Can I extract the reference? [Y/n]`
  4. 👤 `Y`

## 12.5–19.5 s · Scan your design

- The line under the title reads "Designbook extracts your design."
- A scan line passes calmly over the Figma design. The header, recipe head, ingredients, instructions and author light up in turn.
- The reference then opens in Storybook. References › *recipe · desktop · rest* appears in the sidebar for the first time.
- **Chat:** the agent is working (•••).

## 19.5–28 s · Data model

1. The view switches to the **empty** Data Model page. The sidebar shows only the DESIGNBOOK entries.
2. 👤 `Build the data model based on the reference.`
3. 🤖 previews: "From the reference I'd create: node › recipe (title, ingredients, steps, author …) · paragraph › ingredient, recipe_step · taxonomy › author, recipe_category, difficulty. Shall I?"
4. 👤 `Yes.`
5. The graph builds node by node.

## 28–35.5 s · Tokens

1. The view switches to the **empty** Tokens page. The sidebar shows only the DESIGNBOOK entries.
2. 👤 `Build the tokens based on the reference.`
3. 🤖 previews: "From the reference I'd create: colors (neutral, red, orange, green) · fonts Montserrat (headings), Roboto (body) · sizes 12–80 px, spacing 8–64 px. Shall I?"
4. 👤 `Yes.`
5. The tokens are revealed from top to bottom.

## 35.5–52 s · Design your screen

1. 👤 `Design the recipe screen and show the result.`
2. 🤖 previews: "For the recipe screen I'd build: entities recipe, ingredient, recipe step, author · components header, detail page, quantity item, step block, profile card … Shall I?"
3. 👤 `Yes.`

The left side is the real Storybook sidebar of the finished workspace. Every entry appears at its real tree position, and its group expands with it. At the same moment, its area on the right is marked with an outline, a label and a connector line.

- **Phase 1, entities (green):** Recipe, Ingredient, Recipe Step and Author appear under ENTITIES, while the camera moves slowly from top to bottom once.
- The camera then returns to the top in one calm movement.
- **Phase 2, components (orange):** Header, Detail page, Quantity item, Step block and Profile card appear under TEST_INTEGRATION_DRUPAL, again with one slow downward camera pass.
- **Calm motion:** soft fades and about 1.2 s per entry.
- At the end, the whole screen is revealed.

## 52–57 s · Sync to Drupal

- 👤 `Sync the recipe screen to Drupal.`
- A Drupal Canvas mockup follows. The **ILLUSTRATION** tag is visible on every frame of it.

## 57–60 s · End card

- The logo with "**NOT** another design tool."
- The last second is static.
