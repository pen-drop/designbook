---
trigger:
  domain: sample-data
---

# Generate Sample Data From the Live Reference Record

When a component/entity story is diffed pixel-for-pixel against a live reference
render of one specific record (a capture pinned to a `reference_url` and a
concrete record id), the sample-data record backing that story MUST carry that
same record's real field values — otherwise the diff measures content drift, not
appearance drift.

**Generate the record from the actual backend/reference source. Do not
hand-author it.** Hand-authoring is error-prone and drifts from the real record
as the reference source evolves.

## Step 1 — identify the reference record

Take the record id from the reference mapping that pinned this bundle to a
specific live record. If no id has been pinned yet, query the backend for a
candidate — without filtering on a "friendly" identifying field (e.g. a title):
many otherwise-valid records have that field empty, and filtering on it silently
excludes valid candidates.

## Step 2 — dump its real field values

Use the backend's own data-inspection tooling (not a hand-guess) to load the
record and emit its field values into the sample-data record shape the project's
sample-data format expects. Resolve any embedded/inline image reference into the
project's inline-image sample shape (see the project's inline-image rule, if one
exists) rather than leaving it as a raw reference id.

Write the output into the project's sample-data record for that
`{ entity_type, bundle }`, trimming any field the bundle's mapping does not
actually render.

## Step 3 — confirm against the live rendered DOM

Open the reference URL and confirm the dumped values against what actually
renders at the pinned locator: text/HTML content, image, any secondary metadata
(caption, copyright, byline), and link labels. The live rendered DOM is the
source of truth — if the backend dump and the live render disagree (a text-format
filter, a display-time transform, a derived image style), match the live render,
not the raw stored value.

## Checks

| ID | Severity | What to verify | Where |
|---|---|---|---|
| MATCH-REF-01 | error | The sample-data record is generated from the actual reference record (via the backend's own inspection tooling), not hand-invented, and its values match the live rendered DOM at the pinned locator | sample-data record |
| MATCH-REF-02 | warning | Reference-record selection does not filter on a "friendly" identifying field being populated | sample-data record |
| MATCH-REF-03 | warning | Embedded/inline image references are dumped in the project's inline-image sample shape, not left as a raw reference id | sample-data record |
