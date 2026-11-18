// @bakers-schema-version 1
// The project's bakers.build configuration — committed and identical for
// everyone. A conductor is this machine (machine.config.js) + this project +
// the variant (project.<name>.config.js). Connections are private files.
//
// Each addon in `addons` fills its slots through its preset: herdr supplies
// the executor and the worktree. The server comes from the connection,
// by default @bakers-build/addon-remote-drupal.

/** @type {import('@bakers-build/core').ProjectConfig} */
export default {
  schema_version: 1,
  project: { name: "designbook" },
  // The run budget (max_parallel) is set on the machine in the backend.
  // Transcripts upload only where the server's run-log storage allows it.
  // Set to false to keep this conductor's transcripts local even then.
  // Metrics are unaffected either way.
  capture_logs: true,
  addons: ['@bakers-build/addon-herdr'],
  hooks: { after_create: 'pnpm install' },
};
