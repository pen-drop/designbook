import fs from 'node:fs';
import path from 'node:path';

/** Find the single durable plan.md under plans/, excluding the .ephemeral folder. */
function findDurablePlan(plansDir) {
  let entries = [];
  try {
    entries = fs.readdirSync(plansDir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === '.ephemeral') continue;
    const candidate = path.join(plansDir, entry.name, 'plan.md');
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Planner gate: opus authored a complete, sealed design-shell MD plan.
 * Loose: the plan exists in its per-initiative folder, parses to several steps
 * with checkbox tasks, and carries a non-placeholder digest (sealed).
 */
export default function assertDesignShellPlan(_output, context) {
  const ws = path.resolve(context.vars.workspace);
  const plansDir = path.join(
    ws,
    'web/themes/custom/test_integration_drupal/designbook/plans',
  );
  const planPath = findDurablePlan(plansDir);
  let md = '';
  try {
    md = fs.readFileSync(planPath, 'utf8');
  } catch {
    return { pass: false, score: 0, reason: `no plan under ${plansDir}` };
  }
  const steps = (md.match(/^### Step: /gm) || []).length;
  const tasks = (md.match(/^- \[[ xX]\] /gm) || []).length;
  const sealed = /<!--\s*digest:\s*[a-f0-9]{64}\s*-->/.test(md);
  const pass = steps >= 5 && tasks >= 5 && sealed;
  return {
    pass,
    score: (steps >= 5 ? 0.34 : 0) + (tasks >= 5 ? 0.33 : 0) + (sealed ? 0.33 : 0),
    reason: `steps=${steps} tasks=${tasks} sealed=${sealed}`,
  };
}
