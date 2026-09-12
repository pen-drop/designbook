import fs from 'node:fs';
import path from 'node:path';

/** Recursively collect files under a dir (empty list if absent). */
function walk(dir) {
  const out = [];
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

/**
 * Loose gate for extract-reference: the expected tasks are done in the MD plan and
 * the workspace holds a captured revision — a DOM dump plus a screenshot. A written
 * `publication.json` is the full success and scores highest, but the loose gate
 * accepts the captured evidence.
 */
export default function assertExtractReference(_output, context) {
  const ws = path.resolve(context.vars.workspace);
  const dataDir = path.join(ws, 'web/themes/custom/test_integration_drupal/designbook');
  const refFiles = walk(path.join(dataDir, 'references'));
  const hasDump = refFiles.some((f) => /extract--.*\.json$/.test(f));
  const hasShot = refFiles.some((f) => /\.png$/.test(f));
  const published = refFiles.some((f) => /publication\.json$/.test(f));

  let planTasksDone = false;
  try {
    const plans = fs.readdirSync(path.join(dataDir, 'plans')).filter((f) => f.endsWith('.md'));
    planTasksDone = plans.length > 0 && plans.some((f) => /- \[x\]/i.test(fs.readFileSync(path.join(dataDir, 'plans', f), 'utf8')));
  } catch {
    planTasksDone = false;
  }

  const pass = planTasksDone && hasDump && hasShot;
  return {
    pass,
    score: (planTasksDone ? 0.34 : 0) + (hasDump ? 0.22 : 0) + (hasShot ? 0.22 : 0) + (published ? 0.22 : 0),
    reason: `plan-tasks-done=${planTasksDone} dump=${hasDump} screenshot=${hasShot} published=${published}`,
  };
}
