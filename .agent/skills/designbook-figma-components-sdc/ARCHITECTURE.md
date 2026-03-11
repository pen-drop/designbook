# Pendrop Components - Architecture

## Overview

The Pendrop Components skill uses a modular, pipeline-based architecture where each step is an independent sub-skill that can be executed, tested, and maintained separately.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    PENDROP COMPONENTS SKILL                     │
│                    (.agent/skills/pendrop-components)           │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SKILL.md (Orchestrator)                     │
│  • Triggers on natural language requests                        │
│  • Manages execution flow                                       │
│  • Handles parameters                                           │
│  • Coordinates sub-skills                                       │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │   Execute Steps   │
                    │    in Sequence    │
                    └──────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   STAGE 1    │      │   STAGE 2    │      │   STAGE 3    │
│ Prerequisites│      │    Data      │      │Transformation│
└──────────────┘      │ Preparation  │      │    Setup     │
        │             └──────────────┘      └──────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│    Step 1    │      │    Step 3    │      │    Step 5    │
│  Validate    │      │   Backup     │      │   Verify     │
│  Parameters  │      │    Data      │      │Transformation│
└──────────────┘      └──────────────┘      │    Logic     │
        │                     │              └──────────────┘
        ▼                     ▼                     │
┌──────────────┐      ┌──────────────┐            ▼
│    Step 2    │      │    Step 4    │      ┌──────────────┐
│   Verify     │      │   Filter     │      │    Step 6    │
│    Input     │      │  Component   │      │   Ensure     │
└──────────────┘      └──────────────┘      │   Output     │
                                             │  Directory   │
                                             └──────────────┘

        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   STAGE 4    │      │   STAGE 5    │      │   STAGE 6    │
│  Execution   │      │     Post-    │      │Verification  │
└──────────────┘      │  Processing  │      └──────────────┘
        │             └──────────────┘              │
        ▼                     │                     ▼
┌──────────────┐             ▼              ┌──────────────┐
│    Step 7    │      ┌──────────────┐      │   Step 10    │
│   Execute    │      │    Step 8    │      │   Verify     │
│Transformation│      │   Restore    │      │   Output     │
└──────────────┘      │    Data      │      └──────────────┘
                      └──────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │    Step 9    │
                      │    Split     │
                      │   Manifest   │
                      └──────────────┘
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                          INPUT PHASE                            │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                   .pendrop/input/
              pendrop.data.components.json
                    (Full Figma Data)
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PREPARATION PHASE                          │
└─────────────────────────────────────────────────────────────────┘
                               │
                  ┌────────────┴────────────┐
                  ▼                         ▼
         Backup Created              Filter Applied
    (.json.backup)              (Temporary replacement)
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     TRANSFORMATION PHASE                        │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                  .pendrop/component.pendrop.jsonata
                    (Transformation Logic)
                               │
                               ▼
                    JSONata Transformation
                               │
                               ▼
                  .pendrop/output/
         pendrop.components.manifest.json
                    (Component Data)
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      POST-PROCESSING PHASE                      │
└─────────────────────────────────────────────────────────────────┘
                               │
                  ┌────────────┴────────────┐
                  ▼                         ▼
         Backup Restored              Manifest Split
      (Original data)                  (to YAML)
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         OUTPUT PHASE                            │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
              web/themes/custom/test_integration_drupal/
                    components/[component-name]/
                    [component-name].component.yml
                    (Drupal SDC YAML)
```

## File Structure

```
.agent/skills/pendrop-components/
│
├── SKILL.md                    # Main orchestrator skill
│   ├── Capability definition
│   ├── Trigger patterns
│   ├── Action sequence
│   ├── Parameter handling
│   └── Error handling
│
├── ARCHITECTURE.md             # This file - architecture overview
├── MIGRATION.md                # Migration guide
├── SUMMARY.md                  # Implementation summary
│
└── steps/                      # Individual sub-skills
    ├── README.md               # Pipeline documentation
    │
    ├── validate-parameters.md  # Step 1: Prerequisites
    │   ├── Input: componentName parameter
    │   ├── Process: Validation and normalization
    │   └── Output: validatedComponentName
    │
    ├── verify-input.md         # Step 2: Prerequisites
    │   ├── Input: File path
    │   ├── Process: Existence check
    │   └── Output: Confirmation
    │
    ├── backup-data.md          # Step 3: Data Preparation
    │   ├── Input: Original file
    │   ├── Process: Copy to .backup
    │   └── Output: Backup file
    │
    ├── filter-component.md     # Step 4: Data Preparation
    │   ├── Input: Full data + component name
    │   ├── Process: Filter via Node.js script
    │   └── Output: Filtered data (temporary)
    │
    ├── verify-transformation-logic.md  # Step 5: Transformation Setup
    │   ├── Input: Expected file path
    │   ├── Process: Check + self-healing
    │   └── Output: Valid transformation logic
    │
    ├── ensure-output-directory.md      # Step 6: Transformation Setup
    │   ├── Input: Directory path
    │   ├── Process: mkdir -p
    │   └── Output: Created directory
    │
    ├── execute-transformation.md       # Step 7: Execution
    │   ├── Input: Filtered data + logic
    │   ├── Process: jsonata-w transform
    │   └── Output: Component manifest
    │
    ├── restore-data.md         # Step 8: Post-Processing
    │   ├── Input: Backup file
    │   ├── Process: Move backup to original
    │   └── Output: Restored original data
    │
    ├── split-manifest.md       # Step 9: Post-Processing
    │   ├── Input: Component manifest
    │   ├── Process: Node.js split script
    │   └── Output: Component YAML file
    │
    └── verify-output.md        # Step 10: Verification
        ├── Input: Expected output path
        ├── Process: Existence + structure check
        └── Output: Success confirmation
```

## Dependencies Between Steps

```
Step 1 (Validate Parameters)
    ↓ (validatedComponentName)
Step 2 (Verify Input) ← depends on Step 1
    ↓ (input file confirmed)
Step 3 (Backup Data) ← depends on Step 2
    ↓ (backup created)
Step 4 (Filter Component) ← depends on Steps 1, 2, 3
    ↓ (filtered data)
Step 5 (Verify Transformation Logic) ← depends on Step 4
    ↓ (transformation logic confirmed)
Step 6 (Ensure Output Directory) ← depends on Step 5
    ↓ (directory ready)
Step 7 (Execute Transformation) ← depends on Steps 4, 5, 6
    ↓ (manifest generated)
Step 8 (Restore Data) ← depends on Steps 3, 7
    ↓ (original data restored)
Step 9 (Split Manifest) ← depends on Steps 7, 8
    ↓ (YAML file created)
Step 10 (Verify Output) ← depends on Steps 1, 9
    ↓ (success confirmed)
```

## Error Handling Flow

```
Any Step Encounters Error
    ↓
Check Error Type
    ↓
    ├── Recoverable Error
    │   ↓
    │   Apply Recovery Logic
    │   ↓
    │   Retry Step
    │   ↓
    │   Success? → Continue to Next Step
    │   Fail? → Report Error & Stop
    │
    └── Non-Recoverable Error
        ↓
        Report Error Details
        ↓
        Provide Actionable Guidance
        ↓
        Stop Pipeline
        ↓
        Clean Up Temporary Files (if safe)
```

## Self-Healing Mechanism (Step 5)

```
Check: Does .pendrop/component.pendrop.jsonata exist?
    ↓
    NO → Trigger Self-Healing
         ↓
         1. Analyze Input Structure
            npx jsonata-w inspect --summary
         ↓
         2. Read Configuration Requirements
            Read workflow documentation
         ↓
         3. Read Target Schema & Examples
            .pendrop/schema/
            .pendrop/validate/components/
         ↓
         4. Synthesize Transformation Logic
            Generate valid JSONata
         ↓
         5. Add Configuration Block
            @config { input, output }
         ↓
         6. Write File
            .pendrop/component.pendrop.jsonata
         ↓
         7. Verify Syntax
            Parse and validate
         ↓
    YES → Continue to Next Step
```

## Integration Points

### Inputs from External Systems
- **Figma API**: Component data via MCP (Framelink)
  - Consumed by: Step 2 (Verify Input)
  
### Outputs to External Systems
- **Drupal SDC**: Component YAML files
  - Produced by: Step 9 (Split Manifest)
  - Location: `web/themes/custom/test_integration_drupal/components/`

### Integration with Other Skills
- **Pendrop Orchestrator**: Calls this skill for batch processing
- **Pendrop Stories**: Depends on components being generated first
- **Pendrop Twig**: Uses component structure for template generation

## Scalability Considerations

### Current: Sequential Execution
All steps execute in sequence, one after another.

### Future: Parallel Execution (Potential)
Some steps could be parallelized:
- Steps 5 & 6 (independent)
- Multiple component processing (if batch mode)

### Future: Caching (Potential)
Cache results of expensive operations:
- Figma data (Step 2)
- Transformation logic verification (Step 5)
- Skip unchanged components

### Future: Incremental Updates (Potential)
Only process changed components:
- Compare Figma data timestamps
- Skip if output is newer than input
- Force flag to override

## Design Principles

1. **Single Responsibility**: Each step has one clear purpose
2. **Fail Fast**: Stop on first error, don't propagate bad data
3. **Self-Healing**: Automatically recover from missing files when safe
4. **Idempotent**: Running multiple times produces same result
5. **Traceable**: Clear logging of each step's execution
6. **Recoverable**: Backup critical data before modification
7. **Validated**: Verify inputs and outputs at each step
8. **Documented**: Each step has comprehensive documentation

## Success Metrics

- ✅ All 10 steps execute successfully
- ✅ Component YAML file is generated
- ✅ YAML is valid Drupal SDC format
- ✅ Original Figma data is preserved
- ✅ No temporary files left behind
- ✅ Clear error messages on failure
- ✅ Actionable guidance provided
