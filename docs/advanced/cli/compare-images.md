# compare-images

Deterministic pixel-diff (odiff) of a reference PNG versus a captured screenshot.

```text
Usage: storybook-addon-designbook compare-images [options]

Deterministic pixel-diff (odiff) of a reference vs a captured screenshot.

Options:
  --reference <path>  Reference screenshot (the comparison base)
  --actual <path>     Captured Storybook screenshot
  --diff <path>       Output diff image path
  --threshold <n>     Per-pixel color threshold 0..1 (default 0.1)
  -h, --help          display help for command
```

```bash
npx storybook-addon-designbook compare-images \
  --reference designbook/reference/hero.png \
  --actual /tmp/actual.png \
  --diff /tmp/diff.png
```

Default `--threshold` is `0.1`. There are no subcommands. The design-verify workflow uses this after capture. For a live story smoke test without writing PNGs, use [storybook check](/advanced/cli/storybook).
