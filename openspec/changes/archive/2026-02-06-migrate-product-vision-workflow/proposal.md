## Why

We want to enable the Design OS product vision workflow directly within our Storybook environment. Currently, the product vision workflow exists only in the Design OS React application (`source/design-os/`), which requires a separate tool and context switch. By migrating this workflow to Storybook MDX format with embedded React components, we can provide structured product planning capabilities directly within our component documentation environment, making it accessible and integrated with our existing workflow.

## What Changes

- **New MDX documentation**: Create an interactive product vision workflow page in `.storybook/onboarding/product-vision.mdx` that guides users through defining their product vision
- **React components**: Build reusable React components in `.storybook/source/components/` for interactive workflow elements (forms, step indicators, product overview cards)
- **Workflow logic**: Adapt the conversational, multi-step product vision process from Design OS into an MDX-based format with embedded React components
- **Integration**: Ensure the workflow integrates seamlessly with Storybook's MDX rendering and theme system
- **Documentation structure**: Establish patterns for future workflow migrations (product roadmap, data model, etc.)

## Capabilities

### New Capabilities
- `product-vision-workflow`: Interactive MDX-based workflow that guides users through defining a product vision (name, description, problems/solutions, key features) with embedded React components for forms and step indicators
- `product-vision-react-components`: Reusable React component library in `.storybook/source/components/` for workflow UI elements (ProductForm, StepIndicator, ProductOverviewCard) that can be embedded in MDX files

### Modified Capabilities
<!-- No existing capabilities are being modified -->

## Impact

- **Storybook configuration**: May need updates to `.storybook/main.js` to ensure React components in MDX are properly supported
- **New directories**: 
  - `.storybook/source/` - React component source code
  - `.storybook/source/components/` - Workflow UI components
- **MDX files**: 
  - `.storybook/onboarding/product-vision.mdx` - Main workflow documentation
- **Dependencies**: May require additional Storybook addons or configuration for React component support in MDX
- **Design OS reference**: `source/design-os/` serves as the reference implementation and source of truth for workflow logic
