# Preview in Storybook

Start Storybook through the Designbook CLI and inspect the artifact the workflow wrote. The `sb` skill is a passthrough to these commands.

**You need:** a project with `designbook.config.yml`, generated stories or CSS, and Node available so `npx storybook-addon-designbook` can run.

1. Ask the agent to start Storybook, or run the CLI yourself.

**AI prompt**

```text
Start Designbook Storybook with npx storybook-addon-designbook storybook start.
Then run storybook status and tell me the URL.
```

**Shell**

```bash
npx storybook-addon-designbook storybook start
npx storybook-addon-designbook storybook status
```

`storybook start` starts the dev server as a daemon and exits when ready. `--port` is auto-detected when omitted. `--force` stops a previous daemon first.

2. Open the URL from `storybook status`. Find the story that matches the workflow result: a token visualization, a component, or a screen scene.

3. If the story looks stale, check daemon logs and restart:

```bash
npx storybook-addon-designbook storybook logs
npx storybook-addon-designbook storybook restart
```

`storybook check <story-url>` validates a story (staleness preflight, console-error scan, font check, optional behavior probe). Use it when a visual check needs a machine gate, not for first viewing.

**Done when:** `storybook status` reports a running daemon and you can see the workflow artifact in the Storybook UI.

Stop with `npx storybook-addon-designbook storybook stop`. Options for every child command: [storybook CLI](/advanced/cli/storybook).
