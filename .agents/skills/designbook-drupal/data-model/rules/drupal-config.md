---
trigger:
  domain: data-model
filter:
  backend: drupal
---

# Rule: Drupal Config Export Invariants

Invariants for the full set of `DrupalConfigEntity` records emitted by a
`to_drupal` expression. These constraints cannot be expressed in the merged
result schema (`DrupalConfigEntity` validates individual items, not
cross-item relationships) and are therefore stated here as hard rules.

## field.storage deduplication

`field.storage.<et>.<field>` is a site-wide singleton — it is shared across
every bundle that attaches the field. The full emitted config set MUST contain
at most one `field.storage.*` record per `<et>.<field>` key, regardless of
how many bundles declare that field.

- If bundle `article` and bundle `page` both declare `field_body`, only one
  `field.storage.node.field_body` record may appear in the combined output.
- Deduplication is the responsibility of the export stage that collects
  results from multiple bundles. A single-bundle `to_drupal` expression emits
  one storage record per field by definition; the collector must not re-emit
  the same storage record when processing a second bundle.
- The dedup key is `config_name` — two records with the same `config_name`
  are duplicates. The first-encountered record wins; subsequent duplicates
  are discarded.

## Dependency completeness

Every `DrupalConfigEntity` record must declare all its upstream dependencies
in `data.dependencies`. Incomplete dependency maps cause Drupal config import
to fail or to install in the wrong order.

- A `field.field.*` record MUST declare its parent `field.storage.*` record
  in `data.dependencies.config`.
- A config record that depends on a Drupal module (e.g. `text`, `link`,
  `image`) MUST list that module in `data.dependencies.module`.
- Core-provided modules (dependency resolved to `'core'`) do NOT appear in
  `data.dependencies.module` — omit the `module` key in that case rather
  than emitting `{"module": ["core"]}`.
- A `node.type.*` record with no module or config dependencies MUST emit
  `data.dependencies` as an empty object `{}`, never omit the key.

## config_name format

Every `config_name` value MUST match the pattern `^[a-z0-9_]+(\.[a-z0-9_]+)+$`
(dot-separated lowercase/digit/underscore segments). This mirrors the Drupal
config/sync filename convention (the `.yml` extension is excluded).
