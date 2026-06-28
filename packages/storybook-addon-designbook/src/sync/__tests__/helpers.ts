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
  return compiled.evaluate(input as Record<string, unknown>);
}

/**
 * Compose multiple JSONata source strings into a single evaluable program.
 *
 * Wraps the concatenated sources in a single `( ... )` block so that
 * a prelude of `$name := function(...){ ... };` assignments is in scope
 * for the body expression that follows.
 *
 * @param sources - one or more raw JSONata source strings (no wrapping parens required)
 * @returns a single JSONata expression string ready for evaluation
 */
export function composeJsonata(...sources: string[]): string {
  return '(' + sources.join('\n') + '\n)';
}

/**
 * Load the `field-types.md` prelude, compose it with a named block from another
 * blueprint, and evaluate the result against the given input.
 *
 * This is the canonical way to evaluate entity-type `to_drupal` expressions in tests:
 * the prelude brings `$fieldToStorage`, `$fieldToInstance`, and their helpers into scope.
 *
 * @param bodyBlueprintRelPath - blueprint path relative to `.agents/skills/`
 * @param bodyBlockName - named block heading within that blueprint (e.g. `'to_drupal'`)
 * @param input - JSONata input value
 */
export async function runComposed(
  bodyBlueprintRelPath: string,
  bodyBlockName: string,
  input: unknown,
): Promise<unknown> {
  const prelude = loadJsonata('designbook-drupal/data-model/blueprints/field-types.md', 'prelude');
  const body = loadJsonata(bodyBlueprintRelPath, bodyBlockName);
  return runJsonata(composeJsonata(prelude, body), input);
}

/**
 * Load a named JSONata block from a blueprint markdown file.
 *
 * Convention: the block is a fenced ```jsonata code fence that
 * appears immediately after a level-3 heading matching `blockName`
 * (case-insensitive, ignoring leading `###` and surrounding whitespace),
 * with at most one blank line between the heading and the fence.
 *
 * @param blueprintRelPath - path relative to `.agents/skills/`, e.g.
 *   `'designbook-drupal/data-model/blueprints/field-types.md'`
 * @param blockName - heading name to look for, e.g. `'to_drupal'`
 * @returns the raw JSONata source string between the fences
 * @throws if the blueprint file or named block is not found
 */
export function loadJsonata(blueprintRelPath: string, blockName: string): string {
  // Walk up ancestor directories from __dirname until we find a dir containing `.agents`.
  // This is more robust than a fixed depth count and works regardless of how deep
  // __dirname sits within the monorepo (local runs, CI, nested worktrees, etc.).
  const agentsRoot = findAncestorWithDir(__dirname, '.agents');
  if (!agentsRoot) {
    throw new Error(`Could not locate the ".agents" directory by walking up from: ${__dirname}`);
  }
  const fullPath = path.join(agentsRoot, '.agents', 'skills', blueprintRelPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(
      `Blueprint not found: ${fullPath}\n` +
        `(blueprintRelPath="${blueprintRelPath}" resolved from agentsRoot="${agentsRoot}")`,
    );
  }

  const source = fs.readFileSync(fullPath, 'utf-8');

  // Match: heading `### <blockName>` (case-insensitive) followed by at most one
  // blank line, then immediately a ```jsonata fence.  The `\n{1,2}` constraint
  // enforces the "immediately after the heading" convention documented above and
  // prevents false-matching a fence that is separated from the heading by prose.
  const headingPattern = new RegExp(
    `###\\s+${escapeRegex(blockName)}\\s*\\n{1,2}\`\`\`jsonata\\n([\\s\\S]*?)\`\`\``,
    'i',
  );
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

/**
 * Walk up the directory tree from `startDir` until we find a directory that
 * contains a child named `markerDir`.  Returns the containing directory, or
 * `null` if the filesystem root is reached without finding it.
 */
function findAncestorWithDir(startDir: string, markerDir: string): string | null {
  let current = startDir;
  while (true) {
    if (fs.existsSync(path.join(current, markerDir))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      // Filesystem root reached
      return null;
    }
    current = parent;
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
