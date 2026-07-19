// Canonical GAIA conductor config — committed. Connection + identity come from
// your user-global machine context (~/.config/conductor/conductor.config.machine.js:
// { machine_id, user_id, base_url, client_id, client_secret }); machine_id is
// composed here as `${user_id}-${machine_id}-${project}`. `project` is the only
// per-repo value and is baked in below. The client_secret is read from the
// machine context (gitignored, user-only) — never committed here.
//
// IMPORT-FREE (GAIA-78): the plugin slots + plugins[] are `{ plugin, with }`
// descriptors naming the REAL published package (`@gaia-ai/plugin-*`,
// `@dropsh/plugin-*`), not `import`ed constructors. loadConductorConfig
// resolves each name ESLint-style (config dir → cwd → conductor install), so
// config load never depends on a `node_modules/@gaia-ai` symlink beside this
// file. Each plugin package default-exports its factory, so the resolver's
// auto-pick needs no `export:` here — only the `@gaia-ai/gaia/plugins` host
// barrel (many exports) still names one via `export: 'drupalRemote'`.

// The user-global machine context: identity + connection (incl. secret), shared
// by every project on this machine. Never committed.
async function loadMachine() {
  try {
    return (await import(`${process.env.HOME}/.config/conductor/conductor.config.machine.js`)).default ?? {};
  } catch {}
  return {};
}

// OPTIONAL per-project override — create conductor.config.local.js beside this
// file to override any field (machine_id, base_url, model, …). It is loaded only
// if present and is NOT created by `gaia conductor init`.
async function loadLocal() {
  try { return (await import('./conductor.config.local.js')).default ?? {}; } catch {}
  return {};
}

const machine = await loadMachine();
const local = await loadLocal();
const project = local.project ?? 'designbook';
const baseUrl = local.base_url ?? machine.base_url;
const clientId = local.oauth?.client_id ?? machine.client_id ?? 'gaia-agent';
const clientSecret = local.oauth?.client_secret ?? machine.client_secret;
const composedMachineId =
  machine.user_id && machine.machine_id
    ? `${machine.user_id}-${machine.machine_id}-${project}`
    : undefined;

export default {
  site: { base_url: baseUrl, jsonapi_prefix: local.jsonapi_prefix ?? '/jsonapi' },
  project,
  machine_id: local.machine_id ?? composedMachineId,
  states: ['spec', 'diagnose', 'coding', 'review'],
  max_parallel: 5,
  remote: { plugin: '@gaia-ai/gaia/plugins', export: 'drupalRemote' },
  // No hard-wired diff pane for review: the review diff surface is hunk
  // (GAIA-55) — agent-driven + opt-in in the human's interactive pane, not an
  // executor-forced git-diff pane. Clicking a changed file in that hunk pane
  // opens it editable in a spiceedit overlay (see conductor/README.md).
  executor: { plugin: '@gaia-ai/plugin-herdr' },
  // Agent selection by static ticket assessment (GAIA-144): `agent` may be an
  // array of `{ agent, priority?(ticket) }` candidates. The conductor calls each
  // priority(ticket) at dispatch (ticket carries sideloaded `labels` +
  // `environments`), sorts highest-first, and runs the top one; a candidate with
  // no `priority` scores -Infinity. A label routes to its agent; claude is the
  // default (baseline priority 0) for everything else.
  agent: [
    {
      agent: { plugin: '@gaia-ai/plugin-codex' },
      priority: (ticket) =>
        ticket.labels?.includes('codex') ? 100 : Number.NEGATIVE_INFINITY,
    },
    {
      agent: { plugin: '@gaia-ai/plugin-kimi' },
      priority: (ticket) =>
        ticket.labels?.includes('kimi') ? 100 : Number.NEGATIVE_INFINITY,
    },
    {
      agent: { plugin: '@gaia-ai/plugin-opencode', with: { model: 'kimi-for-coding/k3' } },
      priority: (ticket) =>
        ticket.labels?.includes('kimi-opencode') ? 100 : Number.NEGATIVE_INFINITY,
    },
    {
      agent: {
        plugin: '@gaia-ai/plugin-claude',
        with: { model: local.model ?? 'claude-fable-5' },
      },
      priority: (ticket) =>
        ticket.labels?.includes('fable') ? 100 : Number.NEGATIVE_INFINITY,
    },
    {
      agent: {
        plugin: '@gaia-ai/plugin-claude',
        with: { model: local.model ?? 'claude-opus-4-8' },
      },
      priority: () => 0,
    },
  ],
  workspace: {
    plugin: '@gaia-ai/plugin-herdr',
    export: 'herdrWorkspace',
    with: {
      // designbook is a pnpm monorepo, not a DDEV project — a fresh worktree only
      // needs deps installed; the herdr-workspace plugin removes the worktree on done.
      hooks: { after_create: 'pnpm install' },
    },
  },
  // oauth2 is a real dep of the host (npm installs it alongside @gaia-ai/gaia).
  // NOTE: plugins[] is consumed by DROPSH, which reloads this config with its OWN
  // resolver (`export ?? 'default'`, no sole-function auto-pick) on every
  // `gaia dropsh …` command. @dropsh/plugin-oauth2 has no default export, so
  // these entries MUST name `export: 'oauth2Plugin'` — unlike the four conductor
  // slots above, which the conductor resolves and auto-picks.
  plugins: [
    {
      plugin: '@dropsh/plugin-oauth2',
      export: 'oauth2Plugin',
      with: {
        id: 'session',
        default: true,
        type: 'oauth2_client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        token_url: `${baseUrl}/oauth/token`,
        scope: 'gaia:session',
      },
    },
    {
      plugin: '@dropsh/plugin-oauth2',
      export: 'oauth2Plugin',
      with: {
        id: 'pm',
        type: 'oauth2_client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        token_url: `${baseUrl}/oauth/token`,
        scope: 'gaia:project_manager',
      },
    },
  ],
};
