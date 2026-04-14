## 1. Engine: `workflow done --data` and Schema Validation

- [x] 1.1 Add `--data <json>` flag to `workflow done` command — parse JSON, distribute keys to declared result entries, validate each against merged schema
- [x] 1.2 Implement implicit file collection in `workflow done` — for each result with `path:`, check if file exists at resolved path; if so, auto-register and validate
- [x] 1.3 Auto-fill results with `default:` from merged schema when not explicitly provided via `--data` or prior `workflow result`
- [x] 1.4 Return `validation_errors` in RESPONSE JSON when `--data` validation fails (task stays in-progress)
- [x] 1.5 Error on unknown keys in `--data` that don't match any declared result key

## 2. Engine: Schema-Driven Serialization

- [x] 2.1 Implement `flattenToMarkdown(schema, data)` — walk schema properties in declaration order, use `title` fields as headings per convention (first required string → h1, others → h2, arrays → lists, nested objects → h3/h4)
- [x] 2.2 Implement template renderer — `{{ prop }}`, `{{#each array}}...{{/each}}`, `{{#if prop}}...{{/if}}`, `{{ . }}` for current item
- [x] 2.3 Wire serialization into `workflow done --data` — for results with `path:`: `.md` → flattenToMarkdown (or template if declared), `.yml`/`.yaml` → yaml.dump, `.json` → JSON.stringify with 2-space indent
- [x] 2.4 Add tests for markdown flattening: simple strings, arrays, nested objects, null omission, title fallback to key-as-title-case
- [x] 2.5 Add tests for template rendering: interpolation, each, if, null conditional omission

## 3. Engine: Schema Composition at Resolution Time

- [x] 3.1 Parse `extends:`, `provides:` (object), and `constrains:` from rule/blueprint frontmatter during `resolveTaskFilesRich`
- [x] 3.2 Implement deep-merge for `extends:` — error on duplicate property names across multiple sources
- [x] 3.3 Implement merge for `provides:` (object values only) — last writer wins for same property
- [x] 3.4 Implement merge for `constrains:` — intersect `enum` values across multiple sources
- [x] 3.5 Resolve `$ref` references within `extends:`/`provides:`/`constrains:` at merge time
- [x] 3.6 Enforce merge order: base schema → blueprint extends → rule extends → blueprint provides → rule provides → rule constrains
- [x] 3.7 Validate that blueprints do NOT use `constrains:` (error at resolution time)
- [x] 3.8 Persist `merged_schema` in `stage_loaded` entry within tasks.yml
- [x] 3.9 Return `merged_schema` in `workflow instructions` response
- [x] 3.10 Ignore string-valued `provides:` during schema merge (dynamic signal for AI only)

## 4. Merge Intake+Create: Vision

- [x] 4.1 Rewrite `vision/tasks/create-vision.md` — absorb intake reads/dialog, full result schema:
  ```yaml
  ---
  when:
    steps: [create-vision]
  reads:
    - path: $DESIGNBOOK_DATA/vision.md
      optional: true
  result:
    vision:
      path: $DESIGNBOOK_DATA/vision.md
      type: object
      required: [product_name, description]
      properties:
        product_name: { type: string, title: Product Name }
        description: { type: string, title: Description }
        problems:
          type: array
          title: Problems & Solutions
          default: []
          items:
            type: object
            properties:
              title: { type: string }
              solution: { type: string }
        features:
          type: array
          title: Key Features
          default: []
          items: { type: string }
        design_reference:
          type: object
          title: Design Reference
          default: null
          properties:
            type: { type: string }
            url: { type: string }
            label: { type: string }
        references:
          type: array
          title: References
          default: []
          items:
            type: object
            properties:
              type: { type: string }
              url: { type: string }
              label: { type: string }
  ---
  ```
- [x] 4.2 Delete `vision/tasks/intake--vision.md`
- [x] 4.3 Simplify `vision/workflows/vision.md`:
  ```yaml
  ---
  title: Define Product Vision
  description: Define your product vision through a guided conversation
  stages:
    create-vision:
      steps: [create-vision]
  engine: direct
  ---
  ```
- [x] 4.4 Delete `vision/rules/vision-format.md` (format now in schema title fields)

## 5. Merge Intake+Create: Tokens

- [x] 5.1 Rewrite `tokens/tasks/create-tokens.md` — absorb intake reads/dialog, full result schema:
  ```yaml
  ---
  when:
    steps: [create-tokens]
  reads:
    - path: $DESIGNBOOK_DATA/vision.md
      workflow: /debo-vision
    - path: $STORY_DIR/design-reference.md
      optional: true
    - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      optional: true
  result:
    design-tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
      required: [primitive, semantic]
      properties:
        primitive: { type: object, title: Primitive Tokens }
        semantic: { type: object, title: Semantic Tokens }
        component: { type: object, title: Component Tokens, default: {} }
  ---
  ```
- [x] 5.2 Delete `tokens/tasks/intake--tokens.md`
- [x] 5.3 Simplify `tokens/workflows/tokens.md`:
  ```yaml
  ---
  title: Design Tokens
  description: Choose colors and typography for your product
  stages:
    create-tokens:
      steps: [create-tokens]
  engine: direct
  after:
    - workflow: css-generate
      optional: true
  ---
  ```

## 6. Merge Intake+Create: Data-Model

- [x] 6.1 Rewrite `data-model/tasks/create-data-model.md` — absorb intake reads/dialog, full result schema:
  ```yaml
  ---
  when:
    steps: [create-data-model]
  reads:
    - path: $DESIGNBOOK_DATA/vision.md
      workflow: /debo-vision
    - path: $DESIGNBOOK_DATA/data-model.yml
      optional: true
  result:
    data-model:
      path: $DESIGNBOOK_DATA/data-model.yml
      type: object
      required: [content]
      properties:
        content: { type: object, title: Content Entities }
        config: { type: object, title: Config Entities, default: {} }
  ---
  ```
- [x] 6.2 Delete `data-model/tasks/intake--data-model.md`
- [x] 6.3 Simplify `data-model/workflows/data-model.md`:
  ```yaml
  ---
  title: Define Data Model
  description: Define your data model through a guided conversation
  stages:
    create-data-model:
      steps: [create-data-model]
  engine: direct
  ---
  ```

## 7. Merge Intake+Create: Sample-Data

- [x] 7.1 Rewrite `sample-data/tasks/create-sample-data.md` — absorb intake reads/dialog, full result schema:
  ```yaml
  ---
  when:
    steps: [create-sample-data]
  reads:
    - path: $DESIGNBOOK_DATA/data-model.yml
      workflow: /debo-data-model
    - path: $DESIGNBOOK_DATA/sections/
      optional: true
  params:
    section_id: { type: string }
    entities:
      type: array
      default: []
  result:
    sample-data:
      path: $DESIGNBOOK_DATA/sections/{section_id}/data.yml
      type: object
  ---
  ```
- [x] 7.2 Delete `sample-data/tasks/intake--sample-data.md`
- [x] 7.3 Simplify `sample-data/workflows/sample-data.md`:
  ```yaml
  ---
  title: Create Sample Data
  description: Create sample data and type definitions for a section
  stages:
    create-sample-data:
      steps: [create-sample-data]
  engine: direct
  ---
  ```

## 8. Merge Intake+Create: Shape-Section

- [x] 8.1 Rewrite `sections/tasks/create-section.md` — absorb intake--shape-section reads/dialog, full result schema:
  ```yaml
  ---
  when:
    steps: [create-section]
  reads:
    - path: $DESIGNBOOK_DATA/vision.md
      workflow: /debo-vision
    - path: $DESIGNBOOK_DATA/sections/
      optional: true
  params:
    section_id: { type: string, title: Section ID }
    section_title: { type: string, title: Section Title }
    description: { type: string, title: Description }
    order: { type: integer, title: Order }
  result:
    section-scenes:
      path: $DESIGNBOOK_DATA/sections/{section_id}/{section_id}.section.scenes.yml
      type: object
  ---
  ```
- [x] 8.2 Delete `sections/tasks/intake--shape-section.md`
- [x] 8.3 Simplify `sections/workflows/shape-section.md`:
  ```yaml
  ---
  title: Shape Section
  description: Define a section specification — user flows, UI requirements, and scope
  stages:
    create-section:
      steps: [create-section]
  engine: direct
  ---
  ```

## 9. Multi-Stage Intakes: CLI Removal + Result Schema

These intake tasks remain as separate stages (they produce arrays for `each:` expansion or have complex data flows) but lose all CLI commands from their body.

- [x] 9.1 `design/tasks/intake--design-shell.md` — remove CLI commands (`workflow result --key component`, `workflow result --key scene`, `workflow done`) from body. Frontmatter already correct:
  ```yaml
  ---
  when:
    steps: [design-shell:intake]
  result:
    component:
      type: array
      items:
        $ref: ../schemas.yml#/Component
    scene:
      type: array
      items:
        $ref: ../schemas.yml#/Scene
  reads:
    - path: $DESIGNBOOK_DATA/vision.md
    - path: $STORY_DIR/design-reference.md
      optional: true
    - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
  ---
  ```
- [x] 9.2 `design/tasks/intake--design-screen.md` — remove CLI commands (`workflow result --key component`, `workflow result --key scene`, `workflow done`) from body. Frontmatter already correct:
  ```yaml
  ---
  when:
    steps: [design-screen:intake]
  result:
    component:
      type: array
      items:
        $ref: ../schemas.yml#/Component
    scene:
      type: array
      items:
        $ref: ../schemas.yml#/Scene
  reads:
    - path: $DESIGNBOOK_DATA/data-model.yml
    - path: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
    - path: $DESIGNBOOK_DATA/vision.md
    - path: $STORY_DIR/design-reference.md
      optional: true
    - path: $DESIGNBOOK_DATA/sections/[section-id]/[section-id].section.scenes.yml
      workflow: debo-shape-section
  ---
  ```
- [x] 9.3 `design/tasks/intake--design-verify.md` — remove CLI commands (3× `workflow result --key`, `workflow done`) from body. Add `title` and `default` fields to result schema:
  ```yaml
  ---
  when:
    steps: [design-verify:intake]
  params:
    scene: { type: string }
    reference: { type: array, default: [] }
    breakpoints: { type: array, default: [] }
  result:
    scene:
      type: string
      title: Scene
    reference:
      type: array
      title: Design Reference
      default: []
      items:
        $ref: ../schemas.yml#/Reference
    breakpoints:
      type: array
      title: Breakpoints
      default: []
      items: { type: string }
  ---
  ```
- [x] 9.4 `import/tasks/intake--import.md` — no CLI to remove. Add result schema for workflow dispatch array:
  ```yaml
  ---
  when:
    steps: [import:intake]
  reads:
    - path: $DESIGNBOOK_DATA/vision.md
      workflow: vision
  result:
    workflow:
      type: array
      items:
        $ref: ../schemas.yml#/ImportWorkflow
  ---
  ```
- [x] 9.5 `sections/tasks/intake--sections.md` — no CLI to remove. Replace `files: []` with result schema for section array:
  ```yaml
  ---
  when:
    steps: [sections:intake]
  reads:
    - path: $DESIGNBOOK_DATA/vision.md
      workflow: /debo-vision
    - path: $DESIGNBOOK_DATA/sections
      optional: true
  result:
    section:
      type: array
      items:
        $ref: ../schemas.yml#/Section
  ---
  ```

## 10. Design Tasks: CLI Removal

- [x] 10.1 `design/tasks/create-scene--design-shell.md` — remove `workflow result --task $TASK_ID --key shell-scenes` from body. Frontmatter unchanged:
  ```yaml
  ---
  when:
    steps: [design-shell:create-scene]
  params:
    reference: { type: array, default: [] }
  result:
    shell-scenes:
      path: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
      validators: [scene]
  reads:
    - path: $DESIGNBOOK_DIRS_COMPONENTS
      description: Shell components — location resolved by the active framework skill
  ---
  ```
- [x] 10.2 `design/tasks/create-scene--design-screen.md` — remove `workflow result --task $TASK_ID --key section-scenes` from body. Frontmatter unchanged:
  ```yaml
  ---
  when:
    steps: [design-screen:create-scene]
  params:
    section_id: { type: string }
    section_title: { type: string }
    section_description: { type: string }
    scenes: { type: array, default: [] }
    reference: { type: array, default: [] }
  each:
    scene:
      $ref: ../schemas.yml#/Scene
  reads:
    - path: $DESIGNBOOK_DATA/data-model.yml
      workflow: debo-data-model
    - path: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
      workflow: debo-design-shell
  result:
    section-scenes:
      path: $DESIGNBOOK_DATA/sections/{{ section_id }}/{{ section_id }}.section.scenes.yml
      validators: [scene]
  ---
  ```
- [x] 10.3 `design/tasks/map-entity--design-screen.md` — remove `workflow result --task $TASK_ID --key entity-mapping` from body. Frontmatter unchanged:
  ```yaml
  ---
  when:
    steps: [design-screen:map-entity]
  stage: map-entity
  params:
    entity_type: { type: string }
    bundle: { type: string }
    view_mode: { type: string }
  reads:
    - path: $DESIGNBOOK_DATA/data-model.yml
      workflow: debo-data-model
  result:
    entity-mapping:
      path: $DESIGNBOOK_DATA/entity-mapping/{{ entity_type }}.{{ bundle }}.{{ view_mode }}.jsonata
      validators: [entity-mapping]
  ---
  ```
- [x] 10.4 `design/tasks/capture-reference.md` — remove `$TASK_ID` references from body prose. Keep `_debo story` and Playwright commands. Frontmatter unchanged:
  ```yaml
  ---
  name: designbook:design:capture-reference
  title: "Capture Reference: {scene} ({breakpoint}/{region})"
  when:
    steps: [capture]
    type: screenshot
  priority: 10
  params:
    scene: ~
    storyId: ~
    breakpoint: ~
    region: ~
  result:
    screenshot:
      path: $DESIGNBOOK_DATA/stories/{storyId}/screenshots/reference/{breakpoint}--{region}.png
  each:
    checks:
      $ref: ../schemas.yml#/Check
  reads:
    - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      optional: true
  ---
  ```
- [x] 10.5 `design/tasks/capture-storybook.md` — remove `$TASK_ID` references from body prose. Frontmatter unchanged:
  ```yaml
  ---
  name: designbook:design:capture-storybook
  title: "Capture Storybook: {scene} ({breakpoint}/{region})"
  when:
    steps: [recapture]
    type: screenshot
  priority: 20
  params:
    scene: { type: string }
    storyId: { type: string }
    breakpoint: { type: string }
    region: { type: string }
  result:
    screenshot:
      path: designbook/stories/{storyId}/screenshots/current/{breakpoint}--{region}.png
  each:
    checks:
      $ref: ../schemas.yml#/Check
  reads:
    - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      optional: true
  ---
  ```
- [x] 10.6 `design/tasks/compare-screenshots.md` — remove `_debo workflow result --task $TASK_ID --key issues --json` from body. Frontmatter unchanged:
  ```yaml
  ---
  name: designbook:design:compare-screenshots
  title: "Compare Screenshots: {scene} ({breakpoint}/{region})"
  when:
    steps: [compare]
  params:
    scene: { type: string }
    storyId: { type: string }
    breakpoint: { type: string }
    region: { type: string }
  each:
    checks:
      $ref: ../schemas.yml#/Check
  result:
    issues:
      type: array
      items:
        $ref: ../schemas.yml#/Issue
  reads:
    - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      optional: true
  ---
  ```
- [x] 10.7 `design/tasks/setup-compare.md` — remove `_debo workflow result --task $TASK_ID --key checks --json` and `_debo workflow done` from body. Frontmatter unchanged:
  ```yaml
  ---
  when:
    steps: [setup-compare]
  params:
    scene: { type: string }
    reference: { type: array, default: [] }
    breakpoints: { type: array, default: [] }
  result:
    checks:
      type: array
      items:
        $ref: ../schemas.yml#/Check
  reads:
    - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      optional: true
  ---
  ```
- [x] 10.8 `design/tasks/triage.md` — remove `_debo workflow result --task $TASK_ID --key issues --json` from body. Add `result:` to frontmatter (currently missing):
  ```yaml
  ---
  name: designbook:design:triage--design-verify
  title: "Triage: {scene}"
  when:
    steps: [triage]
  priority: 10
  params:
    scene: { type: string }
    storyId: { type: string }
    issues:
      type: array
  result:
    issues:
      type: array
      items:
        $ref: ../schemas.yml#/Issue
  ---
  ```
- [x] 10.9 `design/tasks/configure-meta.md` — remove `_debo workflow result --task $TASK_ID --key meta` heredoc pattern from body. Frontmatter unchanged:
  ```yaml
  ---
  name: designbook:design:configure-meta
  title: Configure Meta
  when:
    steps: [configure-meta]
  each: story
  params:
    storyId: { type: string }
  result:
    meta:
      path: designbook/stories/{storyId}/meta.yml
  reads:
    - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      optional: true
  ---
  ```
- [x] 10.10 `design/tasks/outtake--design.md` — remove `_debo workflow create` CLI from body. Sub-workflow dispatch is driven by workflow definition, task prose describes WHAT to dispatch. Frontmatter unchanged:
  ```yaml
  ---
  name: designbook:design:outtake--verify-scenes
  title: "Outtake: Verify Scenes"
  when:
    steps: [design-screen:outtake, design-shell:outtake, design-verify:outtake]
  priority: 50
  params:
    scene: { type: string }
    reference: { type: array, default: [] }
    storyId: { type: string }
    issues:
      type: array
  ---
  ```
- [x] 10.11 `import/tasks/run-workflow.md` — remove `_debo workflow create`, `_debo workflow instructions`, `workflow done` from body. Frontmatter unchanged:
  ```yaml
  ---
  when:
    steps: [run-workflow]
  params:
    workflow: { type: string }
    params: { type: object, default: {} }
  each:
    workflow:
      $ref: ../schemas.yml#/ImportWorkflow
  ---
  ```
- [x] 10.12 `designbook-drupal/components/tasks/create-component.md` — remove 4× `workflow result --task $TASK_ID --key` and `workflow validate` from body. Frontmatter unchanged:
  ```yaml
  ---
  when:
    steps: [create-component]
    frameworks.component: sdc
  params:
    component: { type: string }
    slots: { type: array, default: [] }
    props: { type: array, default: [] }
    group: { type: string }
    variants: { type: array, default: [] }
  result:
    component-yml:
      path: ${DESIGNBOOK_HOME}/components/{{ component }}/{{ component }}.component.yml
      $ref: designbook-drupal/components/schemas.yml#/ComponentYml
    component-twig:
      path: ${DESIGNBOOK_HOME}/components/{{ component }}/{{ component }}.twig
    component-story:
      path: ${DESIGNBOOK_HOME}/components/{{ component }}/{{ component }}.default.story.yml
      $ref: designbook-drupal/components/schemas.yml#/StoryYml
    app-css:
      path: ${DESIGNBOOK_CSS_APP}
  each:
    component:
      $ref: designbook/design/schemas.yml#/Component
  reads:
    - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      workflow: debo-design-tokens
  ---
  ```

## 11. Rule `when.steps` Updates

Only rules referencing removed intake steps need updates. Steps that remain (`design-shell:intake`, `design-screen:intake`, `design-verify:intake`, `design-component:intake`, `import:intake`, `sections:intake`, `css-generate:intake`) are NOT changed.

Removed intake steps: `vision:intake`, `tokens:intake`, `data-model:intake`, `sample-data:intake`, `shape-section:intake`.

- [x] 11.1 `designbook/tokens/rules/renderer-hints.md` — update from `[tokens:intake, create-tokens]` to:
  ```yaml
  ---
  when:
    steps: [create-tokens]
  ---
  ```
- [x] 11.2 `designbook/data-model/rules/image-style-config.md` — update from `[data-model:intake, create-data-model]` to:
  ```yaml
  ---
  when:
    steps: [create-data-model]
  ---
  ```
- [x] 11.3 `designbook/data-model/rules/sample-template-mapping.md` — update from `[data-model:intake, create-data-model]` to:
  ```yaml
  ---
  when:
    steps: [create-data-model]
  ---
  ```
- [x] 11.4 `designbook/design/rules/extract-reference.md` — update from `[design-shell:intake, design-screen:intake, tokens:intake]` to:
  ```yaml
  ---
  name: designbook:design:extract-reference
  when:
    steps: [design-shell:intake, design-screen:intake, create-tokens]
  ---
  ```
- [x] 11.5 `designbook/vision/rules/vision-context.md` — remove `tokens:intake`, `sample-data:intake`, `shape-section:intake`, add `create-tokens`. Update from `[tokens:intake, design-component:intake, design-screen:intake, design-shell:intake, sample-data:intake, sections:intake, shape-section:intake, create-component, create-section, design-screen:create-scene, design-shell:create-scene, create-sample-data, capture, recapture, compare, polish]` to:
  ```yaml
  ---
  when:
    steps: [create-tokens, design-component:intake, design-screen:intake, design-shell:intake, sections:intake, create-component, create-section, design-screen:create-scene, design-shell:create-scene, create-sample-data, capture, recapture, compare, polish]
  ---
  ```
- [x] 11.6 `designbook-drupal/data-model/rules/drupal-views.md` — update from `[data-model:intake, create-data-model]` to:
  ```yaml
  ---
  when:
    backend: drupal
    steps: [create-data-model]
  ---
  ```
- [x] 11.7 `designbook-drupal/data-model/rules/canvas.md` — update from `[data-model:intake, create-data-model]` to:
  ```yaml
  ---
  when:
    extensions: canvas
    steps: [create-data-model]
  ---
  ```
- [x] 11.8 `designbook-drupal/data-model/rules/layout-builder.md` — update from `[data-model:intake, create-data-model]` to:
  ```yaml
  ---
  when:
    extensions: layout_builder
    steps: [create-data-model]
  ---
  ```
- [x] 11.9 `designbook-drupal/data-model/rules/media-image-styles.md` — update from `[data-model:intake, create-data-model]` to:
  ```yaml
  ---
  when:
    backend: drupal
    steps: [create-data-model]
  ---
  ```
- [x] 11.10 `designbook-stitch/rules/stitch-tokens.md` — update from `[tokens:intake]` to:
  ```yaml
  ---
  when:
    steps: [create-tokens]
    extensions: stitch
  ---
  ```

## 12. Rules: Add Declarative Schema Extensions

- [x] 12.1 `designbook/tokens/rules/renderer-hints.md` — add `constrains:` for renderer dimension pattern:
  ```yaml
  ---
  when:
    steps: [create-tokens]
  constrains:
    design-tokens:
      properties:
        semantic:
          properties:
            spacing:
              additionalProperties:
                properties:
                  $extensions:
                    properties:
                      designbook:
                        properties:
                          renderer: { pattern: "^(margin|padding|gap)" }
  ---
  ```
- [x] 12.2 `designbook/data-model/rules/image-style-config.md` — add `constrains:` for image_style bundle structure
- [x] 12.3 `designbook/data-model/rules/sample-template-mapping.md` — add `provides:` with sample_template defaults
- [x] 12.4 `designbook-stitch/rules/stitch-tokens.md` — add `provides:` with imported token values
- [x] 12.5 `designbook-stitch/rules/provide-stitch-url.md` — frontmatter already has `provides: reference.url` (string signal). No change needed — already correct:
  ```yaml
  ---
  provides: reference.url
  when:
    steps: [design-verify:intake, design-screen:intake, design-shell:intake]
    extensions: stitch
  ---
  ```

## 13. Execution Rules Update

- [x] 13.1 Update `designbook/resources/workflow-execution.md` — add generic done protocol section:
  1. **File results** (result keys with `path:`): Write file to declared path via Write tool. Engine auto-detects at `done` time.
  2. **Data results** (result keys without `path:`): Pass all as single JSON via `_debo workflow done --task <id> --data '<json>'`
  3. **No results**: `_debo workflow done --task <id>`
  4. **External file results** (Playwright): `_debo workflow result --task <id> --key <key> --external`, then `_debo workflow done --task <id>`
  5. **Mixed**: File results auto-collected + data results via `--data`
- [x] 13.2 Remove any per-task CLI examples from execution rules that reference specific `workflow result --key` patterns

## 14. Verification

- [x] 14.1 Run `./scripts/setup-workspace.sh drupal-petshop` from repo root, then `pnpm run dev` inside workspace to verify skill files load correctly
- [x] 14.2 Run `pnpm check` to verify Part 2 TypeScript changes pass typecheck, lint, and tests
