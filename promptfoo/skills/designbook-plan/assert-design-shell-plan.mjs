import fs from 'node:fs';
import path from 'node:path';

/**
 * Planner gate: opus authored a complete, sealed design-shell MD plan.
 * Loose: the plan exists at the canonical path, parses to several steps with
 * checkbox tasks, and carries a non-placeholder digest (sealed).
 */
export default function assertDesignShellPlan(_output, context) {
  const ws = path.resolve(context.vars.workspace);
  const planPath = path.join(
    ws,
    'web/themes/custom/test_integration_drupal/designbook/plans/design-shell.plan.md',
  );
  let md = '';
  try {
    md = fs.readFileSync(planPath, 'utf8');
  } catch {
    return { pass: false, score: 0, reason: `no plan at ${planPath}` };
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
