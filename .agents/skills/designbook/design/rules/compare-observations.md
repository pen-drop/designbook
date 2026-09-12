---
name: compare-published-observations
trigger:
  steps: [compare-observations]
---

# Compare the bound observation pair

Resolve `comparison.reference_query` and `comparison.actual_query` through
`reference query --request <query-file>`. Each query must return exactly one
capture and its corresponding observed structure. Use the exact returned capture
paths. Native source and actual node identities may differ; their declared
subject/view/state correspondence determines the pair.

Compare observed hierarchy, dimensions, content and available properties against
the planner's supplied acceptance criteria. Required unavailable evidence, a
missing story or an error-page capture blocks this check. A file existing alone
cannot establish that the intended subject was captured.

Measure the two images using `compare-images --reference <reference-path>
--actual <actual-path> --diff <comparison.diff_path>`. Keep the returned
`diff_percent`, dimensions and deterministic `severity`. Set `passed` only when
both cells are valid and the deviation is within `comparison.threshold`; report
structural dimension drift explicitly. Preserve every finding and both native
cell identities in the comparison artifact.

The two capture revisions remain read-only. Additional evidence requires a new
capture workflow and a new comparison plan. Diff output belongs outside either
published directory.
