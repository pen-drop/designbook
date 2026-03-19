## REMOVED Requirements

### Requirement: List config section in data model
**Reason**: The `config.list` section was a query-engine abstraction unnecessary for a preview tool. View entities (`view.*` JSONata files) replace it with a simpler, self-contained pattern.
**Migration**: Remove `config:` from `data-model.yml`. Define listing content directly in `view.<name>.<view_mode>.jsonata` as inline entity refs.

### Requirement: Config replaces views in schema
**Reason**: Removed with the entire `config:` section. No replacement — data-model.yml covers only content entities.
**Migration**: None required.

### Requirement: Config scene node type
**Reason**: `config:` as a scene node type is replaced by `entity: view.<name>`. The `view` entity type convention handles all listing/view use cases with less indirection.
**Migration**:
```yaml
# Before
- config: list.recent_articles
  view_mode: default

# After
- entity: view.recent_articles
  view_mode: default
```
Also rename `list.<name>.<view_mode>.jsonata` → `view.<name>.<view_mode>.jsonata` and rewrite to declare entity refs inline (no `$rows`/`$count`/`$limit` bindings).
