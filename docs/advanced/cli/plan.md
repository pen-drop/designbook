# plan

Build and execute a saved Markdown workflow plan.

```text
Usage: storybook-addon-designbook plan [options] [command]

Build and execute a saved MD workflow plan

Options:
  -h, --help                     display help for command

Commands:
  build [options] <workflow>     Assemble, validate and seal the MD plan from an
                                 agent-authored task list
  done [options] <path>
  seal <path>                    Compute and write the plan digest, freezing the
                                 definition for execution
  validate <path>                Report obligations whose required task is
                                 absent from the plan (AC-5)
  steps <path>                   List steps and per-task checkbox state; reads
                                 the plan only
  instructions [options] <path>  Emit a step: its referenced context (resolved
                                 from the registry) and task contracts
  summary <path>                 Report done/total task counts and any
                                 incomplete tasks
  help [command]                 display help for command
```

## plan build

```text
Usage: storybook-addon-designbook plan build [options] <workflow>

Options:
  --tasks <path>       JSON task list: { workflow, selectors?, tasks: [{ step,
                       task, title?, params }] }
  --output <path>      Write the plan here instead of the computed plans_dir
                       target
  --ephemeral          Seal under plans/.ephemeral/ instead of a durable
                       per-initiative folder
  --name <text>        Concrete initiative name — required to persist a plan
                       (ignored with --ephemeral, overridden by --output)
  --config-dir <path>  Workspace dir to resolve skills root and sources from
  --config <path>      Draft configuration JSON (skips designbook.config.yml
                       lookup)
```

`--name` is required to persist. `--ephemeral` ignores `--name`. `--output` overrides both locations.

## Other children

```text
plan done [options] <path>
  --task <name>       Task name to complete
  --title <title>     Disambiguate when several tasks share the name
  --data-file <path>  JSON result object

plan seal <path>
plan validate <path>
plan steps <path>
plan instructions [options] <path>
  --step <name>  Step to read
plan summary <path>
```

`execute-workflow` drives `plan steps`, `plan instructions`, and `plan done`. Persist versus execute are separate mode decisions (`ephemeral` | `persist` | `ask`) in the core builder. The path `plan build` returns is the only path to keep; do not reconstruct it.
