# validate

Validate Designbook artifacts against schemas.

```text
Usage: storybook-addon-designbook validate [options] [command]

Validate Designbook artifacts against schemas

Options:
  -h, --help             display help for command

Commands:
  data                   Validate data/ pool against data-model.yml
  entity-mapping <name>  Validate a .jsonata entity mapping file against sample
                         data
  help [command]         display help for command
```

## validate data

```text
Usage: storybook-addon-designbook validate data [options]

Validate data/ pool against data-model.yml

Options:
  -h, --help  display help for command
```

```bash
npx storybook-addon-designbook validate data
```

Compares the sample-data pool with `data-model.yml`. Run from `designbook.home` so `DESIGNBOOK_DATA` resolves.

## validate entity-mapping

```bash
npx storybook-addon-designbook validate entity-mapping <name>
```

`<name>` is a `.jsonata` entity mapping. The command checks that mapping against sample data for the bundle.

No additional options on either child beyond `-h`. Failures are schema/data mismatches; they are not Storybook visual scores (those are [verify](/advanced/cli/verify) and [compare-images](/advanced/cli/compare-images)).
