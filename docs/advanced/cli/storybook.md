# storybook

Storybook process management. The `sb` skill is a passthrough to this family.

```text
Usage: storybook-addon-designbook storybook [options] [command]

Storybook process management

Options:
  -h, --help                   display help for command

Commands:
  start [options]              Start Storybook dev server and exit when ready
                               (Storybook continues as daemon)
  stop                         Stop a Storybook process started by storybook
                               start
  status                       Check if a Storybook daemon is running
  logs [options]               Print Storybook daemon log output
  restart [options]            Restart the Storybook daemon (stop + start)
  check [options] <story-url>  Validate a story: staleness preflight,
                               console-error scan, font check, behavior smoke.
  help [command]               display help for command
```

## start / restart

```text
Usage: storybook-addon-designbook storybook start [options]

Start Storybook dev server and exit when ready (Storybook continues as daemon)

Options:
  --port <port>  Port to start Storybook on (auto-detected when omitted)
  --force        Stop any running Storybook before starting
```

```bash
npx storybook-addon-designbook storybook start
npx storybook-addon-designbook storybook start --force
npx storybook-addon-designbook storybook restart
```

There is no static `DESIGNBOOK_URL` in config. Read the live URL back from `storybook status`.

## status, stop, logs

```bash
npx storybook-addon-designbook storybook status
npx storybook-addon-designbook storybook logs
npx storybook-addon-designbook storybook stop
```

`status` has no options besides `-h`. `logs` accepts `-f, --follow` to tail with polling.

## check

```text
Usage: storybook-addon-designbook storybook check [options] <story-url>

Options:
  --files <list>     Comma-separated component files whose mtime gates staleness
  --fonts <list>     Comma-separated expected font families
  --behavior <json>  Behavior probe JSON:
                     {"trigger":"<sel>","expect":"<sel|sel@attr=val>"}
```

`<story-url>` is required. Use after [preview](/get-started/preview) when you need a machine gate on a story.
