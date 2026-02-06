## Context

Currently, the product vision workflow exists only in the Design OS React application (`source/design-os/`), which is a separate tool requiring context switching. Our Storybook environment uses HTML/Vite framework with MDX support for documentation. The project uses Tailwind CSS v4, DaisyUI v5, and has a light/dark theme system via `data-theme` attribute.

Storybook is configured to load MDX files from `.storybook/onboarding/*.mdx` and supports React components within MDX. The main Storybook config uses `@storybook/html-vite` framework, and the project has a separate Vite config at the root for building Drupal components.

The Design OS workflow follows a structured, conversational approach: gather initial input, ask clarifying questions, present draft for refinement, and confirm completion. This workflow logic should be preserved while adapting to the MDX format.

## Goals / Non-Goals

**Goals:**
- Enable the product vision workflow directly within Storybook as an MDX page
- Create reusable React components that can be embedded in MDX files
- Maintain the structured, step-by-step workflow logic from Design OS
- Ensure seamless integration with Storybook's theme system and MDX rendering
- Establish patterns for future workflow migrations (product roadmap, data model, etc.)
- Provide independent build configuration for React components separate from Storybook's main config

**Non-Goals:**
- Full migration of all Design OS workflows in this change (only product vision)
- Replacing Storybook's main configuration (separate Vite config for React components)
- Creating a full React application (components are embedded in MDX, not standalone)
- Direct data input/editing in Storybook (Storybook is read-only display; input via AI commands)
- Replicating Design OS's routing system (MDX pages are static documentation)

## Decisions

### Decision 1: Separate Vite Configuration for React Components

**Choice:** Create an independent Vite configuration at `.storybook/source/vite.config.js` separate from Storybook's main configuration.

**Rationale:**
- React components need their own build process for development and potential standalone testing
- Keeps React component development independent from Storybook's build pipeline
- Allows different Vite plugins and settings optimized for React/JSX/TSX
- Prevents conflicts with Storybook's HTML/Vite configuration
- Enables future standalone component library builds if needed

**Alternatives Considered:**
- Using Storybook's Vite config: Rejected because Storybook uses `@storybook/html-vite` which may not have optimal React support
- No build config: Rejected because React/JSX files need transpilation and bundling

### Decision 2: MDX-Based Workflow with Embedded React Components

**Choice:** Implement the workflow as an MDX page that imports and embeds React components, rather than a full React application.

**Rationale:**
- MDX provides a natural documentation format that fits Storybook's structure
- Allows mixing markdown documentation with interactive React components
- Maintains Storybook's documentation-first approach
- Easier to maintain and update workflow text/content
- React components handle interactivity while MDX handles narrative flow

**Alternatives Considered:**
- Full React page component: Rejected because it loses the documentation/guidance aspect and doesn't fit Storybook's MDX pattern
- Pure markdown with no interactivity: Rejected because the workflow needs interactive forms and step indicators

### Decision 3: Props-Based Component Design

**Choice:** All React components accept data exclusively via props, with no direct file imports or external data dependencies.

**Rationale:**
- Components remain reusable and testable in isolation
- MDX files control data flow and can pass different data to components
- Prevents tight coupling between components and data sources
- Aligns with React best practices for component composition
- Makes components easier to adapt for different use cases

**Alternatives Considered:**
- Components importing data directly: Rejected because it reduces reusability and makes testing harder
- Global state management: Rejected as overkill for workflow documentation components

### Decision 4: Component Structure Mirroring Design OS

**Choice:** Extract and adapt React components from Design OS (`source/design-os/src/components/`) to `.storybook/source/components/`, maintaining similar structure but adapting for Storybook context.

**Rationale:**
- Leverages existing, proven component designs from Design OS
- Maintains consistency with Design OS workflow patterns
- Reduces design and development effort
- Ensures workflow experience matches Design OS expectations
- Components can be adapted (e.g., replace Design OS design tokens with Tailwind/DaisyUI)

**Alternatives Considered:**
- Building components from scratch: Rejected because it duplicates effort and may diverge from Design OS patterns
- Directly copying without adaptation: Rejected because Storybook context requires different styling and integration approach

### Decision 5: Tailwind/DaisyUI for Component Styling

**Choice:** Use Tailwind CSS v4 utility classes and DaisyUI v5 components for all React component styling, supporting light/dark themes via `dark:` variants.

**Rationale:**
- Consistent with project's existing design system
- DaisyUI provides ready-made components (cards, buttons) that match project style
- Tailwind's dark mode support aligns with Storybook's theme system
- No need for additional CSS frameworks or custom styling solutions
- Maintains design consistency across Drupal components and React workflow components

**Alternatives Considered:**
- Using Design OS's stone/lime palette directly: Rejected because it would create inconsistency with project's design system
- Custom CSS: Rejected because Tailwind/DaisyUI already provide what's needed

### Decision 7: CSS Isolation via Tailwind Prefix (`debo:`)

**Choice:** Use Tailwind CSS v4's `prefix()` feature to prevent CSS class collisions between the original Storybook/Drupal components and the new Designbook React components. The React component CSS at `.storybook/source/` uses a prefixed Tailwind import:

```css
@import "tailwindcss" prefix(debo);
```

This prefixes all Tailwind utility classes with `debo:` (e.g., `debo:bg-blue-500`, `debo:text-white`, `debo:flex`). React components in `.storybook/source/` use these prefixed classes exclusively. The prefix `debo` is derived from **De**sign**bo**ok.

**Rationale:**
- Tailwind v4 natively supports the `prefix()` directive on the `@import` statement — zero additional tooling required
- Completely prevents accidental style leakage between Drupal/Twig components (unprefixed Tailwind) and Designbook React components (prefixed `debo:` Tailwind)
- The prefix is scoped to the `.storybook/source/` CSS entry point, so the main project CSS remains unaffected
- Simpler to implement and maintain than Shadow DOM
- Works seamlessly with DaisyUI and dark mode (`debo:dark:bg-gray-800`)
- No runtime overhead — it's purely a build-time class name convention

**Alternatives Considered:**
- Shadow DOM: Rejected because it adds runtime complexity, complicates Storybook's theme system integration (`data-theme` attribute must be duplicated into Shadow roots), and makes debugging harder
- CSS Modules: Rejected because Tailwind utility classes don't work well with CSS Modules, and it would require a fundamentally different styling approach
- No isolation: Rejected because the main project CSS (`app.src.css`) loads Tailwind without prefix and both style sheets coexist in Storybook, which would cause unpredictable class collisions

### Decision 8: Read-Only Storybook — Data Input via AI Commands

**Choice:** Storybook pages do NOT provide write access or data input forms. Instead, Storybook displays references to AI commands (e.g., `/product-vision`). Users run AI commands in their editor to input data conversationally. Results are saved to `designbook/` as Markdown files and displayed in Storybook via a Vite plugin middleware.

**Data Flow:**
1. User opens Storybook → sees reference to AI command
2. User runs `/product-vision` in editor → conversational AI workflow
3. AI saves result to `designbook/product/product-overview.md`
4. User reloads in Storybook → data loaded via `GET /__designbook/load` middleware → displayed in `ProductOverviewCard`

**Rationale:**
- AI commands provide a richer, conversational experience for data input than a web form
- Storybook remains a documentation/display tool — its strength is rendering, not data capture
- File-based storage (`designbook/`) is simple, versionable (git), and portable
- The Vite plugin middleware (`vite-plugin-designbook-save.js`) keeps the architecture clean — Storybook reads, AI writes
- Eliminates the need for complex form state management in Storybook MDX

**Alternatives Considered:**
- Interactive forms in Storybook: Rejected because AI commands provide better UX for structured input, and Storybook is not designed for write operations
- Database storage: Rejected because Markdown files are simpler, human-readable, and git-trackable
- Direct file system access from browser: Rejected for security reasons; Vite middleware provides controlled access

### Decision 6: Agent Browser for Validation

**Choice:** Use Agent Browser tool to validate the workflow implementation, component rendering, interactions, and theme support.

**Rationale:**
- Provides automated validation of the actual Storybook environment
- Can verify rendering, interactions, and theme switching programmatically
- Catches issues that manual testing might miss
- Ensures requirements are met before considering migration complete
- Aligns with the spec requirement for Agent Browser validation

**Alternatives Considered:**
- Manual testing only: Rejected because it's less reliable and doesn't scale
- Unit tests only: Rejected because they don't validate the actual Storybook MDX rendering context

## Risks / Trade-offs

### Risk: React Component Compatibility with Storybook MDX
**Mitigation:** Test component imports and rendering early in development. Storybook's MDX support for React is well-established, but we'll verify with simple components first before building complex forms.

### Risk: Vite Config Conflicts
**Mitigation:** Keep the `.storybook/source/vite.config.js` completely separate from Storybook's config. Use different build outputs and ensure no shared dependencies cause conflicts.

### Risk: Theme System Integration
**Mitigation:** Use Tailwind's `dark:` variants consistently and test theme switching thoroughly. Storybook's theme addon uses `data-theme` attribute which Tailwind supports natively.

### Risk: Workflow Logic Complexity in MDX
**Mitigation:** Keep workflow logic in React components (state management, form handling) rather than trying to implement it in MDX. MDX should primarily provide structure and narrative.

### Risk: Component Reusability
**Mitigation:** Strictly enforce props-based design from the start. No direct imports, no global state. This ensures components remain reusable for future workflows.

### Trade-off: Less Interactive Than Full React App
**Acceptance:** The MDX-based approach is intentionally more documentation-focused. This is acceptable because the goal is guidance and workflow documentation, not a full interactive application.

### Trade-off: Separate Build Configuration
**Acceptance:** Having two Vite configs adds some complexity, but the independence and flexibility are worth it. Future workflows can reuse the same React component build setup.

## Migration Plan

1. **Setup Phase:**
   - Create `.storybook/source/` directory structure
   - Create independent Vite configuration for React components
   - Verify Storybook can import React components from `.storybook/source/`

2. **Component Development:**
   - Extract ProductForm, StepIndicator, ProductOverviewCard from Design OS
   - Adapt components for Tailwind/DaisyUI styling
   - Ensure props-based design (no direct data imports)
   - Test components in isolation

3. **MDX Workflow Creation:**
   - Create `.storybook/onboarding/product-vision.mdx`
   - Implement workflow narrative and structure
   - Embed React components with appropriate props
   - Test workflow rendering in Storybook

4. **Integration & Validation:**
   - Verify theme switching works correctly
   - Test all component interactions
   - Use Agent Browser to validate requirements
   - Fix any issues discovered

5. **Documentation:**
   - Update `agents.md` with migration patterns established
   - Document component usage patterns for future workflows

## Open Questions

- ~~Should product vision data be persisted anywhere?~~ **Resolved:** Data is saved to `designbook/product/product-overview.md` via AI commands and displayed in Storybook.
- Will future workflows (roadmap, data model) use the same AI command → file → Storybook display pattern? (Assumption: Yes, establishing patterns now)
- Do we need component unit tests, or is Agent Browser validation sufficient? (To be determined during implementation)
