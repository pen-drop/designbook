// @gaia-schema-version 1
// Canonical GAIA conductor config — committed, ENGINE-ONLY. Identity comes from
// your user-global machine context (~/.config/conductor/conductor.config.machine.js:
// { machine_id, user_id }); machine_id is composed here as
// `${user_id}-${machine_id}-${project}`. `project` is the only per-repo value and
// is baked in below.
//
// NO CONNECTION HERE (GAIA-230): this file must NOT declare `site` or the auth
// `plugins` — loadConductorConfig ignores both, and the connection resolver
// accepts any `.gaia/conductor.config.js` that declares a top-level `site` as a
// legacy connection source, which stops the walk-up before it can reach the
// global `~/.gaia/gaia.config.js`. In a worktree (which carries no project
// `gaia.config.js`) that left the `session`/`pm` auth profiles unresolvable.
// Connection + credentials therefore come solely from `~/.gaia/gaia.config.js`
// plus `~/.gaia/machine.config.js`.
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

// The user-global machine context: the identity half, shared by every project on
// this machine. Never committed.
async function loadMachine() {
  try {
    return (await import("file:///home/cw/.gaia/machine.config.js")).default ?? {};
  } catch {}
  return {};
}

// OPTIONAL per-project override — create conductor.config.local.js beside this
// file to override the conductor identity. It is loaded only if present and is NOT created by
// `gaia conductor init`.
async function loadLocal() {
  try { return (await import('./conductor.config.local.js')).default ?? {}; } catch {}
  return {};
}

const machine = await loadMachine();
const local = await loadLocal();
const project = 'designbook';
const composedConductorId =
  machine.user_id && machine.machine_id
    ? `${machine.user_id}-${machine.machine_id}-${project}`
    : undefined;

export default {
  schema_version: 1,
  addons: [{ use: '@gaia-ai/addon-herdr' }],
  gaia: { project: 'designbook' },

  conductor_id: local.conductor_id ?? composedConductorId,
  hooks: { after_create: 'pnpm install' },
  remote: { plugin: '@gaia-ai/addon-remote-drupal' },
  // No hard-wired diff pane for review: the review diff surface is hunk
  // (GAIA-55) — agent-driven + opt-in in the human's interactive pane, not an
  // executor-forced git-diff pane. Clicking a changed file in that hunk pane
  // opens it editable in a spiceedit overlay (see conductor/README.md).
  executor: { plugin: '@gaia-ai/addon-herdr' },
  // Agent catalog and routing are machine-owned under
  // ~/.gaia/machine.config.js. Project configs contain engine wiring only.
  workspace: {
    plugin: '@gaia-ai/addon-herdr',
    export: 'herdrWorkspace',
  },
};
