## MODIFIED Requirements

### Requirement: Unified loader produces scene stories only
The Vite plugin `load()` handler SHALL produce only scene story exports for all `*.scenes.yml` files. It SHALL NOT generate an Overview story or inject docs parameters for any file, regardless of filename prefix.

#### Scenario: Scenes file produces named exports only
- **WHEN** the loader processes any `*.scenes.yml` file
- **THEN** the returned CSF module contains only named exports corresponding to individual scenes
- **AND** no `Overview` export is generated
- **AND** no `parameters.docs` is injected into default export

#### Scenario: spec.* prefix is ignored for story generation
- **WHEN** the loader processes `spec.blog.scenes.yml`
- **THEN** it generates scene stories identical to a non-prefixed file
- **AND** the `spec.` prefix does NOT trigger any special branching

## REMOVED Requirements

### Requirement: Overview story generation for spec.* files
**Reason**: Overview HTML stories were a workaround for displaying section metadata. This couples the loader to a naming convention and produces non-scene content in a scenes loader. Section overview information should live in MDX documentation files instead.
**Migration**: Delete any `spec.*` prefix from scene file names if the prefix was used solely for the Overview story. Create a corresponding `.mdx` file if overview documentation is needed.

### Requirement: Unified indexer emits docs entries for spec.* files
**Reason**: Same as above — docs entries for spec.* files are removed along with the Overview story.
**Migration**: No action needed unless custom tooling depends on the `type: 'docs'` index entry for these files.
