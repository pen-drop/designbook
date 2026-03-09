# Designbook

**Framework-agnostic**, AI-powered design environment for structured product planning and component development — built on Storybook.

Designbook is independent of your component library, CSS framework, and backend. The entire workflow system, data model, scene rendering, and design documentation work the same regardless of tech stack. Swap out any layer without changing your design process.

### Pluggable Layers

| Layer | Configurable via | Current default | Alternatives |
|-------|-----------------|-----------------|-------------|
| **Component** | `frameworks.component` | Drupal SDC (Twig) | React, Vue, Web Components, ... |
| **CSS** | `frameworks.css` | DaisyUI/Tailwind | Bootstrap, vanilla CSS, ... |
| **Backend** | `backend` | Drupal | WordPress, headless CMS, none |

Skills and workflows resolve dynamically: `@designbook-components-$DESIGNBOOK_FRAMEWORK_COMPONENT` loads the right skill for your stack.

## Architecture

```
Editor (AI Workflows)  →  designbook/ (YAML/Markdown)  →  Storybook (Display)
     /debo-*                  data, specs, scenes              renders everything
```

**Core principle:** AI workflows write files, Storybook reads and renders them. No web forms — all input is conversational via AI commands.

### Component Types

| Type | Has Markup? | Location | Purpose |
|------|-------------|----------|---------|
| **UI Components** | ✅ HTML/Twig | `components/` | Reusable building blocks (cards, buttons, navigation) |
| **View Modes** | — JSONata | `designbook/view-modes/` | Maps entity data → UI components |
| **Scenes** | — YAML | `designbook/sections/*/` | Full page compositions using layout inheritance |

### Rendering Pipeline

```
scenes.yml → shell layout → view-mode .jsonata → entity data → UI components → HTML
```

## Tech Stack (Core)

- **Storybook 9** with `@storybook/html-vite` — framework-agnostic rendering
- **Custom addon** (`storybook-addon-designbook`) — scene renderer, entity resolution, design documentation
- **Vite** with custom plugins for scene transformation

### Current Reference Implementation

- **Drupal SDC** + Twig via `storybook-addon-sdc`
- **Tailwind CSS v4** + DaisyUI v5
- See `packages/integrations/test-integration-drupal/` (PetMatch demo)

## Workflows

All workflows run in the editor as `/debo-*` slash commands:

| Phase | Workflow | Output |
|-------|----------|--------|
| **1. Vision** | `/debo-product-vision` | `product-overview.md` |
| **2. Sections** | `/debo-product-sections` | `sections/*/spec.section.yml` |
| **3. Design System** | `/debo-design-tokens` | `design-tokens.yml` |
| **4. Data Model** | `/debo-data-model` | `data-model.yml` |
| **5. Sample Data** | `/debo-sample-data` | `sections/*/data.yml` |
| **6. Shell** | `/debo-design-shell` | shell components + `shell.scenes.yml` |
| **7. Screens** | `/debo-design-screen` | UI components → view modes → `*.scenes.yml` |
| **8. Components** | `/debo-design-component` | Individual UI components |
| **9. CSS** | `//debo-css-generate` | CSS tokens from design tokens |

Each workflow loads skills just-in-time via `@skillname/SKILL.md` convention. Framework-specific skills are resolved dynamically: `@designbook-components-$DESIGNBOOK_FRAMEWORK_COMPONENT`.

## Project Structure

```
designbook/
├── packages/
│   ├── storybook-addon-designbook/   # Core addon (scene renderer, entity resolver)
│   └── integrations/
│       └── test-integration-drupal/  # Reference implementation (PetMatch)
├── .agent/
│   ├── workflows/                    # /debo-* workflow definitions
│   └── skills/                       # Reusable skills with resources
├── promptfoo/                        # AI workflow evaluation suite
│   ├── fixtures/                     # Test fixtures per workflow
│   └── reports/                      # Evaluation reports
└── designbook.config.yml             # Project configuration
```

## Development

```bash
pnpm run dev          # Addon watcher + Storybook (parallel)
pnpm run lint         # ESLint + Prettier
```

### Testing Workflows

```bash
npx promptfoo eval -c promptfoo/promptfooconfig.yaml --filter-pattern "design-screen"
```

## Configuration

`designbook.config.yml`:

```yaml
dist: ./designbook
backend: drupal
frameworks:
  component: sdc
  css: daisyui
```

## License

Private project
