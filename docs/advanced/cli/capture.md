# capture

Capture screenshots. Matrix mode reads an extract-reference `meta.yml`.

```text
Usage: storybook-addon-designbook capture [options] [command]

Capture screenshots (matrix mode reads a meta.yml).

Options:
  -h, --help               display help for command

Commands:
  matrix [options] <meta>  Capture the element × state × breakpoint matrix from
                           an extract-reference meta.yml in one browser session.
  help [command]           display help for command
```

## capture matrix

```text
Usage: storybook-addon-designbook capture matrix [options] <meta>

Capture the element × state × breakpoint matrix from an extract-reference
meta.yml in one browser session.

Options:
  --out <dir>       Output directory for PNGs
  --url <url>       Base URL to capture
  --prelude <file>  Prelude module run after navigation on every pass
```

```bash
npx storybook-addon-designbook capture matrix path/to/meta.yml --url http://127.0.0.1:6006 --out /tmp/matrix
```

`<meta>` is required. One browser session covers the element × state × breakpoint matrix. `--prelude` runs after navigation on every pass.

Single-image capture into a revision directory is `reference capture-image`, not this family. Pixel-diff is [compare-images](/advanced/cli/compare-images). Sessions in config (`sessions.<name>`) supply Playwright storage state; commands take `--session <name>` where the child documents it, never a raw cookie path.
