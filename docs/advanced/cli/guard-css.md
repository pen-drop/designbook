# guard-css

Probe a compiled stylesheet for expected CSS custom properties and font families.

```text
Usage: storybook-addon-designbook guard-css [options]

Verify token vars and fonts resolve in a compiled stylesheet probe

Options:
  --probe <path>  probe HTML file to inspect
  --vars <list>   comma-separated expected --var names (default: "")
  --fonts <list>  comma-separated expected font families (default: "")
  -h, --help      display help for command
```

```bash
npx storybook-addon-designbook guard-css --probe path/to/probe.html --vars --color-brand,--font-sans --fonts Inter
```

Defaults: `--vars` and `--fonts` are empty strings, so an invocation without lists does not assert names. The `css-generate` workflow's `guard-css` task is the usual caller after `compile-css`. Tailwind projects use this after `@theme` emission.

`--probe` is an HTML file the command inspects, not a Storybook URL. Pair with [storybook check](/advanced/cli/storybook) when you also need console-error and font checks on a live story.
