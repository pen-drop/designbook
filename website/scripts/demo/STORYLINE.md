# Designbook explainer — storyline (v6)

The film is silent and in English, 60 s long, 1920 × 1080. Approved by cw (DESIGNBOOK-81,
amendments 4–6).

**Frame layout:**
- The chapter title sits top left.
- The Storybook window shows the sidebar on the left and the content on the right.
- The AI chat sits bottom right: 👤 is the user, 🤖 is the agent, and ••• means the agent is working.

**Rules:**
- Every Storybook picture is a real capture from the `drupal-recipe` fixture, taken at the stage the chapter shows.
- In every chapter the view switches first, so the empty page is visible. Only then does the chat start.
- From Data model on, the agent first previews what it would create, taken from the real output. The result appears only after 👤 `Yes.`
- No reference exists at the start.
- Until "Design your screen", the sidebar shows only the DESIGNBOOK entries: Foundation, Design System, Sections and References. The only exception is the moment the extracted reference opens.

## 0–4 s · Opening

| s | Picture |
|---|---|
| 0.0 | The Designbook logo, with "another design tool" below it |
| 1.6–2.1 | "**NOT**" drops in front of it in red: "NOT another design tool" |

## 4–12.5 s · Explain your vision

| s | Picture | Chat |
|---|---|---|
| 4.0 | An empty Designbook. Foundation is selected and the Vision tab is empty ("No vision defined yet") | — |
| 5.0–7.0 | — | 👤 types `We created this famous recipe page in Figma. Make a Drupal page.` and sends it |
| 7.2–8.0 | The real vision (Cooks Delight) appears | ••• |
| 8.6 | — | 🤖 `Can I extract the reference? [Y/n]` |
| 9.4–9.7 | — | 👤 `Y`, then ••• |

## 12.5–19.5 s · Scan your design

Subline: "Designbook extracts your design."

| s | Picture | Chat |
|---|---|---|
| 12.5 | The Figma design of the recipe page, labelled "Design reference · Figma" | ••• |
| 13.0–16.6 | A scan line runs from top to bottom and the camera follows it. The header, recipe head, ingredients, instructions and author each light up briefly | ••• |
| 16.8–17.5 | Storybook shows the extracted reference, with References › … › *recipe · desktop · rest* selected | the chat closes at 17.8 |

## 19.5–28 s · Data model

| s | Picture | Chat |
|---|---|---|
| 19.5 | The **empty** Data Model page | — |
| 20.4–21.7 | — | 👤 `Build the data model based on the reference.` |
| 22.3 | — | 🤖 "From the reference I'd create: node › recipe (title, ingredients, steps, author …) · paragraph › ingredient, recipe_step · taxonomy › author, recipe_category, difficulty. Shall I?" |
| 23.0–23.4 | — | 👤 `Yes.` |
| 23.6–26.4 | The real graph builds node by node, each edge with its node: recipe, ingredient, recipe_step, author, recipe_category, difficulty | ••• |

## 28–35.5 s · Tokens

| s | Picture | Chat |
|---|---|---|
| 28.0 | The **empty** Tokens page | — |
| 28.9–30.1 | — | 👤 `Build the tokens based on the reference.` |
| 30.7 | — | 🤖 "From the reference I'd create: colors neutral, red, orange, green · fonts Montserrat (headings), Roboto (body) · sizes 12–80 px, spacing 8–64 px. Shall I?" |
| 31.4–31.8 | — | 👤 `Yes.` |
| 32.1–34.2 | The real tokens are revealed from top to bottom | ••• |

## 35.5–52 s · Design your screen

The left side is the real sidebar of the finished workspace. The right side is the rendered recipe screen, dimmed at first.

| s | Left (sidebar) | Right (screen) | Chat |
|---|---|---|---|
| 35.5 | Only the DESIGNBOOK entries | The recipe screen, dimmed | — |
| 36.0–37.3 | | | 👤 `Design the recipe screen and show the result.` |
| 38.0 | | | 🤖 "For the recipe screen I'd build: entities recipe, ingredient, recipe step, author · components header, detail page, quantity item, step block, profile card … Shall I?" |
| 38.7–39.1 | | | 👤 `Yes.`, then the chat closes |

**Phase 1: entities with their view mode (green).** The camera moves slowly downwards once. The green frames stay.

| s | Left pops up (real tree position) | Right |
|---|---|---|
| 40.0 | ENTITIES › node › Recipe › **full** | Green frame "Entity · Recipe · full" |
| 41.3 | paragraph › Ingredient › **default** | Green frame "Entity · Ingredient · default" |
| 42.6 | paragraph › Recipe Step › **default** | Green frame "Entity · Recipe Step · default" |
| 43.9 | taxonomy_term › Author › **default** | Green frame "Entity · Author · default" |
| 44.9–45.6 | — | The camera returns to the top in one movement |

**Phase 2: components (orange).** The camera moves slowly downwards once.

| s | Left pops up (real tree position) | Right |
|---|---|---|
| 45.8 | TEST_INTEGRATION_DRUPAL › Shell › Header | Orange frame "Component · Header" (page shell, outside the entities) |
| 47.0 | Layout › Detail page | Orange frame **inside** "Recipe · full" |
| 48.2 | Data Display › Quantity item | Orange frame **inside** "Ingredient · default" |
| 49.4 | Data Display › Step block | Orange frame **inside** "Recipe Step · default" |
| 50.6 | Data Display › Profile card | Orange frame **inside** "Author · default" |
| 51.3–52 | — | The camera returns to the top, the frames fade out and the full screen appears |

A dashed connector links the newest sidebar entry to its frame.

## 52–57 s · Sync to Drupal

| s | Picture | Chat |
|---|---|---|
| 52.0 | The finished recipe screen in Storybook stays. There is no Drupal screen | — |
| 52.3–53.5 | — | 👤 `Sync the recipe screen to Drupal.` |
| 53.9– | — | 🤖 working ••• |

## 57–60 s · End card

- The logo with "**NOT** another design tool."
- 59–60 s is a still frame.
