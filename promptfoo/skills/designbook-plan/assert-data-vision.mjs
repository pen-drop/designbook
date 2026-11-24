import fs from 'node:fs';
import path from 'node:path';

/**
 * Loose gate for the data-vision run: only that the expected tasks exist (done)
 * in the MD plans and the workspace holds the produced results (vision.yml,
 * data-model.yml). No definition/integrity harness.
 */
export default function assertDataVision(_output, context) {
  const ws = path.resolve(context.vars.workspace);
  const dataDir = path.join(ws, 'web/themes/custom/test_integration_drupal/designbook');
  const has = (f) => fs.existsSync(path.join(dataDir, f));
  const plansDir = path.join(dataDir, 'plans');
  let planTasksDone = false;
  try {
    const plans = fs.readdirSync(plansDir).filter((f) => f.endsWith('.md'));
    planTasksDone = plans.length > 0 && plans.every((f) => /- \[x\]/i.test(fs.readFileSync(path.join(plansDir, f), 'utf8')));
  } catch {
    planTasksDone = false;
  }
  const visionOk = has('vision.yml');
  const dmOk = has('data-model.yml');
  const pass = visionOk && dmOk && planTasksDone;
  return {
    pass,
    score: (visionOk ? 1 : 0) / 3 + (dmOk ? 1 : 0) / 3 + (planTasksDone ? 1 : 0) / 3,
    reason: `vision.yml=${visionOk} data-model.yml=${dmOk} plan-tasks-done=${planTasksDone}`,
  };
}
