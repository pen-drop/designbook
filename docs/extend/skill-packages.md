# Skill packages

A skill package shares project skills across repositories. It is a plain npm package: no build step, no Designbook download or cache. npm installs it, and the lockfile pins its version and integrity.

## Layout

```text
my-skills/
  package.json          # { "name": "@acme/designbook-skills", "version": "1.0.0" }
  skills/
    acme-brand/         # one folder per skill, same layout as .agents/skills/<name>/
      SKILL.md
      rules/ blueprints/ tasks/ ...
```

A package may hold several skills under `skills/`. Each folder name is the skill name.

## Install

Any npm source works:

```bash
npm i -D github:acme/designbook-skills#v1.0.0   # git tag
npm i -D @acme/designbook-skills                # registry
npm i -D https://example.com/skills-1.0.0.tgz   # tarball
```

## Enable

List the package names or paths in `designbook.config.yml`:

```yaml
skills:
  - '@acme/designbook-skills'
  - ./tools/local-skills       # a path: a directory with skills/<name>/
```

`skills` is always a list. Package names resolve through Node resolution from the config directory, so `node_modules` of the config directory or any parent is found. A path starts with `.`, `/` or `~` and resolves against the config directory. An entry that cannot be found stops the CLI with an error naming it.

## Precedence

Skills merge by name. The first source that has a skill wins and replaces that skill as a whole:

1. Project-local `<root>/skills/<name>/`. `<root>` is the first of `.claude`, `.agents` or the directory itself that contains a `skills/` folder, checked from the config directory upward through its parents
2. `skills` entries, in listed order
3. Skills bundled in `storybook-addon-designbook` (core and integrations)

To change a bundled skill, put a skill of the same name earlier in this order. Set `DESIGNBOOK_DEBUG=1` to print each package root on stderr.
