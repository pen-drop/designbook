## 1. CLI — workflow rules subcommand

- [ ] 1.1 Add `workflow rules --stage <stage>` subcommand to `packages/storybook-addon-designbook/src/cli.ts`
- [ ] 1.2 Implement recursive glob scan of `.agents/skills/**/rules/**/*.md` from `DESIGNBOOK_ROOT`
- [ ] 1.3 Implement YAML frontmatter parsing for each candidate file
- [ ] 1.4 Implement `when.stages` array-contains filter
- [ ] 1.5 Implement `when.<config-key>` equality filter using resolved config env map
- [ ] 1.6 Implement recursive `${VAR}` / `$VAR` substitution in matched file content
- [ ] 1.7 Append `workflow.rules[<stage>]` strings from `designbook.config.yml`
- [ ] 1.8 Output matched content as `---`-separated markdown blocks to stdout
- [ ] 1.9 Emit stderr warning for files with unparseable frontmatter (exit 0)
- [ ] 1.10 Error and exit 1 when `--stage` flag is missing

## 2. Skill updates

- [ ] 2.1 Rewrite Rule 2 in `.agents/skills/designbook-workflow/rules/workflow-execution.md` to use `$DESIGNBOOK_CMD workflow rules --stage <id>:dialog`
- [ ] 2.2 Add task-stage rule loading step in Rule 5b of `workflow-execution.md` using `workflow rules --stage <stage-name>`
- [ ] 2.3 Document `workflow rules` command in `.agents/skills/designbook-workflow/resources/cli-reference.md`
