# verify

Design-verify scoring. This family computes a deterministic score from a compare result. Visual capture and pixel-diff are separate commands.

```text
Usage: storybook-addon-designbook verify [options] [command]

Design-verify scoring

Options:
  -h, --help       display help for command

Commands:
  score [options]  Compute the deterministic verify score from a compare result
                   and write it to a file
  help [command]   display help for command
```

## verify score

```text
Usage: storybook-addon-designbook verify score [options]

Compute the deterministic verify score from a compare result and write it to a
file

Options:
  --result <path>  compare-observations result JSON (issues + compare_artifacts)
  --output <path>  score file to write
```

```bash
npx storybook-addon-designbook verify score --result path/to/compare.json --output path/to/score.json
```

The `design-verify` workflow produces the compare-observations JSON that `--result` consumes. Do not confuse this with **sync-verify**, which reconciles a backend render against Storybook and is a different skill.

Pixel-diff of two PNGs is [compare-images](/advanced/cli/compare-images). Capture of a screenshot matrix is [capture](/advanced/cli/capture).
