---
name: Pendrop Orchestrator
description: Orchestrates the complete end-to-end component generation pipeline, chaining Figma fetch, component generation, story generation, and Twig creation.
---

# Pendrop Orchestrator

This skill orchestrates the complete Pendrop component generation pipeline. It automatically chains together multiple workflows to provide end-to-end component setup from Figma designs to fully functioning Drupal components with stories and templates.

## Capability

### Orchestrate Full Component Generation
**Trigger**: When asked to "generate complete component", "orchestrate component", "set up all components", "process all components", "full component setup", or "end-to-end generation".

**Action**:
1. Determine if single component or batch mode:
   - Single component: `/pendrop-orchestrate-full-component "ComponentName"`
   - All components: `/pendrop-orchestrate-full-component "--all"`
2. The orchestrator automatically chains:
   - **Figma data fetch** - Downloads latest design data
   - **Component YAML generation** - Creates component.yml files
   - **Story YAML generation** - Creates story files for variants
   - **Twig template generation** - Creates Twig templates (optional)
3. Monitor progress and review completion summary.

## When to Use

### Use Orchestrator When:
- Setting up a new component from scratch
- Full project setup (use "--all")
- Syncing all components after major Figma changes
- You need complete end-to-end generation
- Initial project bootstrap
- Batch processing multiple components

### Use Individual Workflows When:
- Debugging specific stages
- Updating only component YAMLs or stories
- Manual refinement of specific files
- You need granular control over one stage
- Iterative development on a single step

## Pipeline Stages

The orchestrator executes these stages in order:

1. **Fetch** (via `/pendrop-fetch-figma`)
   - Downloads component data from Figma
   - Output: `.pendrop/input/pendrop.data.components.json`

2. **Components** (via Pendrop Components skill)
   - Generates component YAML files
   - Output: `web/themes/custom/daisy_cms_daisyui/components/[name]/[name].component.yml`

3. **Stories** (via `/pendrop-generate-stories`)
   - Generates story YAML files for variants
   - Output: `web/themes/custom/daisy_cms_daisyui/components/[name]/[name].[variant].story.yml`

4. **Twig** (via `/pendrop-generate-twig-from-story`)
   - Optionally generates Twig templates
   - Output: `web/themes/custom/daisy_cms_daisyui/components/[name]/[name].twig`

## Context
- **Workflow**: `.agent/workflows/pendrop-orchestrate-full-component.md`
- **Dependencies**: Requires all individual Pendrop skills to be available
- **Output**: Complete component directories with YAML, story, and Twig files

## Troubleshooting
- **Stage Failures**: Check individual workflow outputs. Run workflows separately to isolate issues.
- **Partial Completion**: If a stage fails, the orchestrator may stop. Resume by running remaining workflows manually.
- **MCP Connection**: Ensure `figma_framelink` MCP server is active before orchestration.
- **Missing Dependencies**: Verify all JSONata transformation files exist.

## Related Skills
- **Pendrop Figma Fetch** - Stage 1 of pipeline
- **Pendrop Components** - Stage 2 of pipeline
- **Pendrop Stories** - Stage 3 of pipeline
- **Pendrop Twig Validation** - Post-generation validation
