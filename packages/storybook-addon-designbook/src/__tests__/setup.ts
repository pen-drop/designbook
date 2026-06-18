/**
 * Global test setup.
 *
 * The test process is itself a runtime (Claude Code) with the real designbook
 * plugin installed, so skill-resolver's runtime auto-detection would otherwise
 * pull the ambient plugin cache into fixture-based tests. Disable it process-wide
 * here; tests that exercise the resolver pass an explicit injected `env` object,
 * which bypasses `process.env` and is unaffected by this flag.
 */
process.env['DESIGNBOOK_DISABLE_AUTODETECT'] = '1';
