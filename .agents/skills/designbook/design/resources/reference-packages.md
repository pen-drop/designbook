# Reference packages during intake

The planner owns reference interpretation and concrete implementation decisions.
Finish the typed `reference_extract` output before preparing a consuming task's
reference query. `_debo extract` produces raw `observations.json` and
`captured.json`; the enriched `extract.json` is a separate planner-authored result.

For each consuming task, fix `package` (`component`, `composition` or `tokens`),
exact subject IDs, states and breakpoints. Each request selects the Cartesian
state × breakpoint matrix for every subject. Use separate consuming tasks when
subjects require different matrices. Subject IDs and selectors come from the
visible intake inventory and reference metadata.

For primitive components such as buttons and inputs, explicitly bind the task
to the recorded subject that supplies its treatment. Record the primitive's
concrete markup, style, content and behavior decisions in that subject's
`component` material and in the task work order. A name similarity is not a
binding. When a primitive needs its own independently scoped subject, establish
that identity, selector and captures during intake before freezing the plan.

Every selected sample includes its full structure, layout, typography, content
and interaction data, plus the requested package's concrete decisions. Ancestor
layout dependencies use exact parent IDs. Asset dependencies reference exact
`images[].url` identities; fonts use exact `fonts[].family` names. Each image's
`reference_path` locates its downloaded file beside the reference, separately
from its rendered public `local_path`. Every non-system font, including Google
fonts, has downloaded binaries for offline execution. Shared dependencies are
returned once.

## Prepare the fixed request

Write a JSON request with an absolute reference folder:

```json
{
  "reference": "/workspace/designbook/references/reference-id",
  "package": "component",
  "subjects": ["scene-header"],
  "states": ["rest", "open"],
  "breakpoints": ["sm", "xl"]
}
```

Write the effective schema contract from the discovered `extract-reference`
block: `referenceSchema` is the `reference` output schema, `extractSchema` is
its `reference_extract` output schema, and `definitions` contains their resolved
schema definitions. Preserve the effective integration-composed schemas.

```bash
_debo reference prepare --request request.json --contract contract.json
```

The CLI validates schemas, exact identities, required package decisions, selected
capture matrix, parent dependencies and local files. It returns the same fixed
request plus its `fingerprint`. Save that result in the consuming task's planned
reference requirement. Resolve every reported finding before finalizing the plan;
missing decision-critical material is a planning failure.

## Inspect a frozen package

```bash
_debo reference query --request frozen-request.json --contract contract.json
```

The response contains selected subjects and complete samples, deduplicated
parents/fonts/assets, screenshot paths, fingerprints and compact check results.
It excludes unrelated subjects and package kinds. A changed scope, effective
schema or referenced file fails the fingerprint check. Queries are read-only and
use no browser or network. The workflow step runtime resolves the saved request;
the executor consumes its package without selecting new scope or interpreting
the whole extract. Visual fidelity remains an intake and design-verification
responsibility; static checks establish completeness and identity, not appearance.
