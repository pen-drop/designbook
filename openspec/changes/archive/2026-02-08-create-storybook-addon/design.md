## Context

Designbook currently exists as a set of React components and configurations tightly coupled within the `daisy_cms_daisyui` repository. This limits its reusability across other projects and frameworks. The goal is to extract the core Designbook functionality into a framework-agnostic Storybook addon.

## Goals / Non-Goals

**Goals:**
- Create a reusable Storybook addon package (`storybook-addon-designbook`).
- Decouple Designbook UI and logic from the specific Drupal implementation.
- Support easy installation via `npm`.
- Ensure the addon works with any framework supported by Storybook.

**Non-Goals:**
- Refactoring the Drupal components themselves (they remain in the consumer project).
- Changing the core Designbook data format (Markdown).

## Decisions

### 1. Addon Structure
- **Choice**: Use the `storybook-addon-kit` or similar scaffold to create a standard addon structure.
- **Rationale**: Provides best practices and build configuration out of the box.

### 2. Component Migration & Styling
- **Choice**: Use Tailwind CSS with the `prefix` option (`debo-`) within the addon.
- **Rationale**: Prevents CSS conflicts with the consumer project's styles, ensuring the addon UI remains consistent regardless of the host environment.

### 3. Data Loading
- **Choice**: Bundle the Vite plugin middleware within the addon or as a companion plugin.
- **Rationale**: The addon needs server-side access to read/write Markdown files. Storybook's server channel or a Vite plugin is the standard way to handle this.

## Risks / Trade-offs

- **Risk**: CSS conflicts with host project.
  - **Mitigation**: Strict namespacing with Tailwind prefix.
- **Risk**: Version compatibility with different Storybook versions.
  - **Mitigation**: Define clear peer dependencies.

## Migration Plan

1.  Initialize addon package.
2.  Move React components from `designbook/.storybook/source` to `addon/src`.
3.  Implement Vite plugin for file system access in the addon.
4.  Test addon in a separate example project.
5.  Replace local implementation in `designbook` with the installed addon.
