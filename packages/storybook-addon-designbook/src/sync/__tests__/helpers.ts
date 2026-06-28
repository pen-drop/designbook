/**
 * Test helpers for evaluating JSONata expressions from skill blueprints.
 *
 * JSONata block naming convention:
 *   A fenced ```jsonata code block that immediately follows a heading
 *   `### to_drupal` (or another named heading like `### $fieldToStorage`)
 *   is the named block. The block name is the heading text stripped of
 *   leading `#` and whitespace.
 *
 *   Example in a blueprint .md file:
 *
 *   ### to_drupal
 *   ```jsonata
 *   ( ... expression body ... )
 *   ```
 */
import jsonata from 'jsonata';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Evaluate a JSONata expression string against the given input.
 * Uses the same `jsonata` package the addon already depends on.
 */
export async function runJsonata(expr: string, input: unknown): Promise<unknown> {
  const compiled = jsonata(expr);
  return compiled.evaluate(input as jsonata.Expression);
}

/**
 * Load a named JSONata block from a blueprint markdown file.
 *
 * Convention: the block is a fenced ```jsonata code fence that
 * appears immediately after a level-3 heading matching `blockName`
 * (case-insensitive, ignoring leading `###` and surrounding whitespace).
 *
 * @param blueprintRelPath - path relative to `.agents/skills/`, e.g.
 *   `'designbook-drupal/data-model/blueprints/field-types.md'`
 * @param blockName - heading name to look for, e.g. `'to_drupal'`
 * @returns the raw JSONata source string between the fences
 * @throws if the blueprint file or named block is not found
 */
export function loadJsonata(blueprintRelPath: string, blockName: string): string {
  // Resolve from worktree root → .agents/skills/
  // __dirname is packages/storybook-addon-designbook/src/sync/__tests__
  // worktree root is 5 levels up: __tests__ → sync → src → storybook-addon-designbook → packages → (worktree root)
  const repoRoot = path.resolve(__dirname, '..', '..', '..', '..', '..');
  const fullPath = path.join(repoRoot, '.agents', 'skills', blueprintRelPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(
      `Blueprint not found: ${fullPath}\n` +
        `(blueprintRelPath="${blueprintRelPath}" resolved from repoRoot="${repoRoot}")`,
    );
  }

  const source = fs.readFileSync(fullPath, 'utf-8');

  // Match: heading `### <blockName>` (case-insensitive) followed by ```jsonata fence
  const headingPattern = new RegExp(`###\\s+${escapeRegex(blockName)}\\s*\\n+\`\`\`jsonata\\n([\\s\\S]*?)\`\`\``, 'i');
  const match = source.match(headingPattern);

  if (!match) {
    throw new Error(
      `JSONata block "### ${blockName}" not found in ${fullPath}.\n` +
        `Blueprint must contain a heading "### ${blockName}" followed immediately by a \`\`\`jsonata fence.`,
    );
  }

  // match[1] is the capture group; guaranteed by the pattern above.

  return match[1]!;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
