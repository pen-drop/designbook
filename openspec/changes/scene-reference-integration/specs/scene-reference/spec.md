## ADDED Requirements

### Requirement: Scene reference field

Each scene entry in `*.scenes.yml` MAY include a `reference` field linking it to a design source. The reference schema SHALL be:

```yaml
reference:
  type: "stitch" | "image" | "figma"
  url: "<resource identifier>"
  title: "<human-readable label>"
```

#### Scenario: Scene with Stitch reference
- **WHEN** a scene declares `reference.type: "stitch"`
- **THEN** `reference.url` SHALL contain the Stitch screen resource name (e.g. `projects/xxx/screens/yyy`) and `reference.title` SHALL contain the screen title

#### Scenario: Scene with image reference
- **WHEN** a scene declares `reference.type: "image"`
- **THEN** `reference.url` SHALL contain a URL or local path to the reference image

#### Scenario: Scene without reference
- **WHEN** a scene has no `reference` field
- **THEN** visual diff tests SHALL fall back to manual screen matching (current behavior)

---

### Requirement: Intake asks for reference when design source is configured

The `debo-design-screen` intake stage SHALL check `guidelines.yml` for a `design_file` or `mcp` entry. If present, the intake SHALL load available design screens and ask the user to select a reference for each scene.

#### Scenario: Guidelines has MCP design source
- **WHEN** `guidelines.yml` declares `mcp.server` and `design_file`
- **THEN** intake SHALL call the MCP server to list available screens and present them to the user per scene

#### Scenario: Guidelines has no design source
- **WHEN** `guidelines.yml` has no `design_file` or `mcp` entry
- **THEN** intake SHALL skip the reference question and proceed without setting references

#### Scenario: User declines to set reference
- **WHEN** the user is asked for a reference and responds with "skip" or "none"
- **THEN** the scene SHALL be created without a `reference` field

---

### Requirement: Visual diff reads reference from scene

The `debo-test` visual-diff task SHALL read the `reference` field from the target scene's `*.scenes.yml` file to resolve the design reference automatically.

#### Scenario: Visual diff with scene reference
- **WHEN** `debo-test` targets a scene that has a `reference` field
- **THEN** the test SHALL resolve the reference by type (Stitch → MCP screenshot download, image → fetch URL) without requiring manual params

#### Scenario: Visual diff without scene reference
- **WHEN** `debo-test` targets a scene without a `reference` field
- **THEN** the test SHALL fall back to searching `guidelines.yml` for design sources or prompting for manual input
