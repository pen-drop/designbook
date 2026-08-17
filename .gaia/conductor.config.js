// Canonical GAIA conductor config — committed. Connection + identity come from
// your user-global machine context (~/.config/conductor/conductor.config.machine.js:
// { machine_id, user_id, base_url, client_id, client_secret }); machine_id is
// composed here as `${user_id}-${machine_id}-${project}`. `project` is the only
// per-repo value and is baked in below. The client_secret is read from the
// machine context (gitignored, user-only) — never committed here.
//
// IMPORT-FREE (GAIA-78): the plugin slots + plugins[] are `{ plugin, with }`
// descriptors naming the REAL published package (`@gaia-ai/addon-*`,
// `@dropsh/plugin-*`), not `import`ed constructors. loadConductorConfig
// resolves each name ESLint-style (config dir → cwd → conductor install), so
// config load never depends on a `node_modules/@gaia-ai` symlink beside this
// file.
//
// NO BARREL (GAIA-224): the `@gaia-ai/core/plugins` + `@gaia-ai/gaia/plugins`
// host barrels are deleted and the `@gaia-ai/plugin-*` packages are renamed —
// every impl ships as its own `@gaia-ai/addon-*` package that default-exports
// its factory, so a slot just names the package and needs no `export:`. The one
// exception is a package shipping MORE than one slot: `@gaia-ai/addon-herdr`
// default-exports the EXECUTOR, so the workspace slot names
// `export: 'herdrWorkspace'` (GAIA-139).

// The user-global machine context: identity + connection (incl. secret), shared
// by every project on this machine. Never committed.
async function loadMachine() {
  try {
    return (await import(`${process.env.HOME}/.config/conductor/conductor.config.machine.js`)).default ?? {};
  } catch {}
  return {};
}

// OPTIONAL per-project override — create conductor.config.local.js beside this
// file to override any field this module reads from it (machine_id, base_url,
// model, project, jsonapi_prefix, oauth). It is loaded only if present and is
// NOT created by `gaia conductor init`.
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
  max_parallel: 5,
  remote: { plugin: '@gaia-ai/addon-remote-drupal' },
  // No hard-wired diff pane for review: the review diff surface is hunk
  // (GAIA-55) — agent-driven + opt-in in the human's interactive pane, not an
  // executor-forced git-diff pane. Clicking a changed file in that hunk pane
  // opens it editable in a spiceedit overlay (see conductor/README.md).
  executor: { plugin: '@gaia-ai/addon-herdr' },
  // Agent selection by static ticket assessment (GAIA-144): `agent` may be an
  // ARRAY of `{ agent, priority?(ticket) }` candidates. The conductor calls each
  // priority(ticket) at dispatch (ticket carries sideloaded `labels` +
  // `environments`), sorts highest-first, and runs the top one; a candidate with
  // no `priority` scores -Infinity. Claude is the baseline at priority 0 and
  // stays last, so a ticket carrying no routing label always dispatches.
  agent: [
    {
      // Grok Build (xAI) — wins only on the `grok` label. The addon ships as a
      // dependency of @gaia-ai/gaia, so the descriptor resolves without a
      // separate install; it needs the `grok` CLI on PATH and an authenticated
      // host, and reads no auth file itself. `grok models` reports grok-4.5 as
      // the only available model.
      agent: {
        plugin: '@gaia-ai/addon-grok',
        with: { model: 'grok-4.5' },
      },
      priority: (ticket) =>
        ticket.labels?.includes('grok') ? 100 : -1000,
    },
    {
      agent: {
        plugin: '@gaia-ai/addon-claude',
        with: { model: local.model ?? 'claude-opus-4-8' },
      },
      priority: () => 0,
    },
  ],
  workspace: {
    plugin: '@gaia-ai/addon-herdr',
    export: 'herdrWorkspace',
    with: {
      // designbook is a pnpm monorepo, not a DDEV project — a fresh worktree only
      // needs deps installed; the herdr-workspace plugin removes the worktree on done.
      hooks: { after_create: 'pnpm install' },
    },
  },
};
