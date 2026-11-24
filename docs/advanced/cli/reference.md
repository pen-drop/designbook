# reference

Save, capture, validate, and query a capture revision.

```text
Usage: storybook-addon-designbook reference [options] [command]

Save, capture, validate and query a capture revision through the CLI.

Options:
  -h, --help                  display help for command

Commands:
  validate [options]          Validate a published capture revision and its
                              bounded observation queries.
  capture-location [options]  Resolve the revision directory for a fixed
                              capture. The revision digest covers the selected
                              scope and prelude, so the whole capture block is
                              required — not just the source.
  publish [options]           Seal a finished capture revision: fingerprint
                              every file and write the self-contained
                              publication binding. No observation validation —
                              the human decides the screenshots are right.
  prepare [options]           Validate planned scope and emit its immutable
                              fingerprint.
  query [options]             Read the fixed package after checking its intake
                              fingerprint.
  save [options]              Browser pass: write the source dump to the
                              revision and print the catalogue JSON.
  capture-image [options]     Capture one PNG into the revision directory.
  capture-file [options]      Download one source asset into the revision
                              directory as served.
  prelude [options]           Validate a prelude module and print the { path,
                              digest } pair for a capture block. Run before
                              workflow capture-location: the revision digest
                              covers the prelude.
  inspect [options]           Read an unpublished revision during intake: does a
                              locator resolve, what hangs under it, which images
                              and fonts its subtree carries.
  image [options]             Read PNG dimensions from a revision-relative path.
                              No pixel payload.
  approval-write [options]    Write or update approval.yml beside a published
                              revision. Fingerprint is sealed from
                              publication.json files.
  approval-check [options]    Check approval.yml against the publication files
                              seal and whether approval.scope covers the need
                              scope.
  help [command]              display help for command
```

`extract-reference` is the skill that drives this family. First command: `intake extract-reference`.

## query

```text
Usage: storybook-addon-designbook reference query [options]

Read the fixed package after checking its intake fingerprint.

Options:
  --request <json>   JSON file containing reference/package/subjects/states and
                     either views or explicitly mapped breakpoints
  --contract <json>  JSON file with effective referenceSchema, extractSchema and
                     definitions from the planning catalogue
```

`publish` does not validate observations; the human decides screenshots are right. `approval-write` / `approval-check` seal that decision. Run `prelude` before `capture-location` because the revision digest covers the prelude.

Each child has additional options; run `npx storybook-addon-designbook reference <child> --help` for flags. Do not invent a `config-verify` command here.
