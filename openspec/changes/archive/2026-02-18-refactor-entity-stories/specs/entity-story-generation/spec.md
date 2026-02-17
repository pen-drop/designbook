# Entity Story Generation

This specification defines the rules for automatically generating Storybook story files for entity records found in the project's test data.

## 1. File Naming Convention

Generated story files MUST follow this naming pattern:

```
entity-[type]-[bundle].content_[section]_[viewmode]_[index].story.yml
```

-   `[type]`: The entity type (e.g., `node`, `block_content`).
-   `[bundle]`: The entity bundle (e.g., `article`, `hero`).
-   `[section]`: The section ID from the data source path (e.g., `blog`, `home`).
-   `[index]`: The zero-based index of the record in the data array.
-   `[viewmode]`: The view mode of the base story template (e.g., `full`, `teaser`, `card`).

**Example:**
Input data: `sections/blog/data.json` containing `node.article` array by index `0`.
Template: `entity-node-article.teaser.story.yml`.
Generates: `entity-node-article.section-blog-0-teaser.story.yml`.

## 2. Content Generation Rules

The generator scans for all story files matching the pattern `entity-[type]-[bundle].[viewmode].story.yml`. For each corresponding record in `data.json`, it generates a new story file with resolved references.

### 2.1 Ref Resolution (Inline Values)
All occurrences of `{ type: 'ref', ... }` in the template MUST be replaced with the actual value from the source data.

**Example:**
Template:
```yaml
title:
  type: ref
  field: title
```

Generated (for `node.article[0]` where title is "My Article"):
```yaml
title: "My Article"
```

### 2.2 Metadata Removal
The generated file MUST NOT contain the `designbook.entity` metadata block.
The `name` property of the story MUST be set to `content_[section]_[viewmode]_[index]` (using underscores).

### 2.3 Output Content
The generated file serves as a standalone story definition.
-   It MUST NOT contain any `type: ref` nodes.
-   All field values must be fully resolved (inlined) from the source data at generation time.

## 3. Storage Location
Generated files are written to the same directory as the template component:
`$DESIGNBOOK_DIST/components/entity-[type]-[bundle]/`

## 4. Automation Trigger
The generation process is triggered by the `designbook-entity` skill execution. It scans all `sections/*/data.json` files and regenerates all corresponding stories.
