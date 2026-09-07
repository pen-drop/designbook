# Reference packages during intake

The planner owns reference interpretation and concrete implementation decisions.
Finish the typed `reference_extract` output before preparing a consuming task's
reference query. `_debo extract` produces raw `observations.json` and
`captured.json`; the enriched `extract.json` is a separate planner-authored result.

For each consuming task, fix `package` (`component`, `composition`, `tokens` or `assets`),
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

Each state/breakpoint sample separates raw `observations` from independently
complete package objects. The executor receives only the requested package,
intact, with exact sample identities. Source DOM and broad style measurements
remain in `observations` on disk for the planner.

| Package | Complete executor material |
| --- | --- |
| `component` | Planned target structure, layout, typography, content and interaction decisions. |
| `composition` | Target component hierarchy, slots and composition layout, excluding child components' internal DOM. |
| `tokens` | Exact token names and values. |
| `assets` | Dependency manifest for local images and font files; no structure or parent layout. |

The package schema declares the allowed fields. Unknown package fields fail
validation rather than being silently discarded. Target structure uses explicit
node identities, elements, attributes/props and ordered children; missing nodes,
cycles, unreachable nodes and multiple placements block preparation. Raw source
nodes are evidence for these decisions, not target structure.

Every package owns `dependencies`: `parent_ids` names necessary ancestor layouts,
`asset_ids` binds exact `images[].url` identities, and `font_families` binds exact
`fonts[].family` names. Asset provisioning uses empty `parent_ids`. Each image's
`reference_path` locates its downloaded file beside the reference, separately
from its rendered public `local_path`. Every non-system font, including Google
fonts, has downloaded binaries for offline execution. Shared dependencies are
returned once; dependencies used only by other package kinds stay out of scope.

Each authored package or dependency has a 65,536-byte JSON limit. Oversized
material and detected raw observation payloads fail with the affected subject
or dependency. Resolve these findings by keeping evidence in observations and
planning smaller concrete subjects/packages. The CLI never truncates decisions
or substitutes a summary. The final assembled worker prompt has a separate
budget because several individually valid packages can still be too broad
when combined. These limits measure bytes, not model tokens.

## Validate intake before freezing

After enriching the analysis and writing its local evidence, validate the entire
visible intake inventory with the effective schema contract described below:

```bash
_debo reference validate --reference /workspace/designbook/references/reference-id --contract contract.json
```

Every metadata subject and declared state × breakpoint cell must have matching
analysis and at least one concrete package kind. Every package kind present is
checked using the same preparation logic as consuming tasks, including parent
layouts, downloaded assets and fonts, and baseline PNGs. Different cells may
provide different package kinds. Missing or undeclared subjects/cells, selector
drift and incomplete evidence block the handoff. Success returns compact counts
and validated frozen scopes, not the full extract.

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

The response contains selected subject identities and complete requested-kind packages, deduplicated
parents/fonts/assets, screenshot paths, fingerprints and compact check results.
It excludes unrelated subjects and package kinds. A changed scope, effective
schema or referenced file fails the fingerprint check. Queries are read-only and
use no browser or network. The workflow step runtime resolves the saved request;
the executor consumes its package without selecting new scope or interpreting
the whole extract. Visual fidelity remains an intake and design-verification
responsibility; static checks establish completeness and identity, not appearance.
