---
trigger:
  steps: [verify-install]
---

# Verify Storybook

The verify procedure has a fixed shape regardless of backend or CSS framework. Run it
from the resolved `designbook.home` directory.

## Resolve the run directory

Read `designbook.home` from the written `designbook.config.yml`. It is relative to
the config file's directory; resolve it to an absolute path and run every command
below from there.

## Install dependencies

Install JS dependencies in the resolved home directory. Use `pnpm install` when a
`pnpm-lock.yaml` or `pnpm-workspace.yaml` is present in that directory or any parent
up to the project root; otherwise `npm install`.

## Start Storybook

```
npx storybook-addon-designbook storybook start --force
```

The command exits 0 once Storybook is reachable and outputs a JSON object. Parse its
`port` field and construct the URL as `http://localhost:<port>`. When the JSON's
`startup_errors` array is non-empty, print every entry; continue only if the
reachability check below still passes.

## Confirm reachability

```
curl -sf http://localhost:<port>/index.json
```

It must return HTTP 200.

## Outcome

- Any failure → stop, show the exact command output, and escalate to the user. Do not
  retry silently and do not mark the install successful.
- On success → print a summary (backend, install target, config file path, Storybook
  URL). Leave Storybook running and mention it can be stopped with
  `npx storybook-addon-designbook storybook stop`.
