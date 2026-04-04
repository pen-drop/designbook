## Why

Building a design system from a design reference (Stitch, web, Figma) currently requires manually starting each workflow in sequence — vision, guidelines, tokens, css-generate, shell, sections, screens — with each intake asking questions that could be auto-derived from the reference. This friction makes the tool slow for the most common use case: "here's my design, build the system."

## What Changes

- **New `import` workflow** in the core designbook skill that orchestrates a full design system import from a design reference
- **Intake stage** resolves the design reference (via extension rules: Stitch MCP, devtools, etc.), lets the user select screens, and generates a task list — each task is a sub-workflow call with pre-filled params
- **Execute stage** runs each sub-workflow in sequence (vision → guidelines → tokens → css-generate → shell → design-screen per screen), passing reference-derived data as defaults to each sub-workflow's intake
- **Reference-agnostic design** — the import workflow defines WHAT to do; extension rules (stitch, devtools, figma) define HOW to extract data from the specific reference type
- **New intake task** (`intake--import.md`) that gathers reference data and builds the sub-workflow task list

## Capabilities

### New Capabilities
- `import-workflow`: Core import workflow definition, intake task, and sub-workflow orchestration via execute stage

### Modified Capabilities
- `workflow-execution`: Workflow execution rules need to support sub-workflow calls as tasks (running a full workflow as a task within a parent workflow)

## Impact

- **Core skill** (`designbook/import/`): New workflow directory with workflow definition and intake task
- **Workflow execution** (`resources/workflow-execution.md`): May need guidance for sub-workflow task pattern
- **Extension skills**: No changes — existing Stitch/devtools rules already provide the data extraction; they activate via `extensions:` config as today
- **Existing workflows**: No changes — they receive pre-filled params but run normally
