import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { resolveSkillsRoot } from '../config.js';
import { resolveWorkflowFile, listWorkflowDefinitions } from '../cli/workflow-discovery.js';

function tmp(prefix: string): string {
  return mkdtempSync(resolve(tmpdir(), prefix));
}

/**
 * Mirror the debo-test workspace layout: the skills tree lives at the workspace
 * root under `.agents/skills/**` (with `.claude/skills` a symlink into it), while
 * the CLI is invoked from a deep theme dir that has its own config but no local
 * `.agents`. `resolveSkillsRoot` must walk up from the theme dir to the workspace
 * root — otherwise it returns a non-existent `<theme>/.claude` and the workflow
 * resolver falls back to `$HOME/.agents` (the M1 blocker).
 */
function mkWorkspace(): { workspaceRoot: string; themeDir: string; workflowFile: string } {
  const workspaceRoot = tmp('debo-m1-');
  const realWorkflows = join(workspaceRoot, '.agents', 'skills', 'designbook', 'design', 'workflows');
  mkdirSync(realWorkflows, { recursive: true });
  const workflowFile = join(realWorkflows, 'design-shell.md');
  writeFileSync(workflowFile, '---\nstages: {}\n---\n# design-shell\n');

  mkdirSync(join(workspaceRoot, '.claude'), { recursive: true });
  symlinkSync(join('..', '.agents', 'skills'), join(workspaceRoot, '.claude', 'skills'));

  const themeDir = join(workspaceRoot, 'web', 'themes', 'custom', 'test_integration_drupal');
  mkdirSync(themeDir, { recursive: true });

  return { workspaceRoot, themeDir, workflowFile };
}

describe('resolveSkillsRoot: walk-up from a subdirectory', () => {
  it('finds the workspace-root skills root when invoked from a deep theme dir', () => {
    const { workspaceRoot, themeDir } = mkWorkspace();
    expect(resolveSkillsRoot(themeDir)).toBe(join(workspaceRoot, '.claude'));
  });

  it('still resolves configDir itself when it holds the skills root', () => {
    const { workspaceRoot } = mkWorkspace();
    expect(resolveSkillsRoot(workspaceRoot)).toBe(join(workspaceRoot, '.claude'));
  });

  it('resolves a workflow through the walked-up skills root from the theme dir', () => {
    const { themeDir, workflowFile } = mkWorkspace();
    const agentsDir = resolveSkillsRoot(themeDir);
    // The resolver may return the file via the `.claude/skills` symlink — compare
    // by real path so the symlinked and canonical routes count as the same file.
    expect(realpathSync(resolveWorkflowFile('design-shell', agentsDir))).toBe(realpathSync(workflowFile));
    expect(listWorkflowDefinitions(agentsDir)).toContain('design-shell');
  });
});
