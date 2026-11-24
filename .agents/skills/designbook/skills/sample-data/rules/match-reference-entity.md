---
trigger:
  domain: sample-data
---

# Generate Sample Data From the Published Reference Record

When a component/entity story is compared with a captured record, its sample
must carry that record's observed field values. Otherwise the comparison measures
content drift as well as appearance drift.

Use the record identity, rendered values and assets from the bound published
revision. Apply the [reference intake](../../../design/rules/reference-prerequisite.md)
when the identity or required observations are missing. Source record inspection
and rendered-DOM capture belong to that separate reference preparation.

Convert the captured values into the project's sample-data shape for the selected
`{ entity_type, bundle }`, retaining fields that its mapping renders. Resolve
embedded/inline images into the project's inline-image sample shape using the
captured asset and metadata. Preserve observed empty values; an empty title does
not invalidate the selected record.

Where stored values and rendered observations differ because of formatting or
display transforms, match the rendered observations in the bound revision.
Completion: the sample's identity, visible values and image metadata match that
revision; later source changes require a new reference revision.

## Checks

| ID | Severity | What to verify | Where |
|---|---|---|---|
| MATCH-REF-01 | error | Sample values match the bound revision's rendered observations for the selected record | sample-data record |
| MATCH-REF-02 | warning | Observed empty identifying fields are preserved for the selected record | sample-data record |
| MATCH-REF-03 | warning | Embedded/inline images use the project's inline-image sample shape and captured metadata | sample-data record |
