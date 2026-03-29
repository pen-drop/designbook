# Development Rules

See `agents.md` for all project rules, skill references, and linting instructions.

## Skills

Skill-Quelldateien liegen in `.agents/skills/` — das ist der kanonische Ort. `.claude/skills/` ist ein Symlink darauf und darf nicht separat editiert werden.

## Code Quality

Run `pnpm check` before committing. It runs typecheck → lint → test (fail-fast).
Fix formatting issues with `pnpm --filter storybook-addon-designbook lint:fix`.
