# Rules and Conventions

## Design Principles

1. **Consistent naming**: Directory name = file base name. Always kebab-case. `button/button.*`, `navigation/navigation.*`
2. **Variants over duplication**: When components share the same props and slots, use a single component with variants and per-variant Twig includes (`[name]--[variant].twig`) instead of creating separate components
3. **Three files minimum, one concern each**: Metadata (`.component.yml`), stories (`.story.yml`), and template (`.twig`) are always separate
4. **Categorized**: Every component has a `group:` key (`Action`, `Data Display`, `Navigation`, `Layout`, `Shell`) for Storybook sidebar organization
5. **Idempotent**: Running multiple times with same input produces same result
6. **Validated**: Component YAML is validated against the Drupal SDC schema
7. **Safe**: Asks for confirmation before overwriting existing components
8. **Standard**: Follows Drupal SDC and SDC Storybook conventions
9. **Shell = UI**: Shell components (header, footer, page) are full UI components with real HTML, not structural slot-only wrappers. They compose other UI components via slots
10. **Generic naming — no business logic**: UI components are **visually descriptive**, never domain-specific. Use `card` not `article-card`, `layout` not `article-teaser-grid`, `employee` not `contact-person`.

## Placeholder Images in Stories

Story files must use **placeholder service URLs** for images, never local file paths.

**Use:**
```yaml
# In story slots
- type: image
  uri: https://placehold.co/600x400
```

**Never use:**
```yaml
# ❌ WRONG — local file paths don't exist in Storybook
- type: image
  uri: /images/sample/photo.jpg
```

In `data.yml` sample data, image fields should contain **dummy `<img>` tags**:
```json
{
  "field_media_image": "<img src='https://placehold.co/600x400' alt='Sample image' />"
}
```

## Error Handling

- **Missing required parameter**: Report which parameter is missing
- **Invalid status value**: List valid options (`stable`, `experimental`, `deprecated`)
- **Invalid group value**: List valid options (`Action`, `Data Display`, `Navigation`, `Layout`, `Shell`)
- **Component already exists**: Ask for confirmation before overwriting
- **Directory creation fails**: Report filesystem error
- **File write fails**: Report which file failed and why
- **Schema validation fails**: Show errors and fix before continuing
- **No section files (shell)**: Warn but continue with empty navigation
