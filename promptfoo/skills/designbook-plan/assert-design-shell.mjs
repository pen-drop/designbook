import fs from 'node:fs';
import path from 'node:path';

const BASELINE = new Set(['card', 'disclosure', 'plain']);

/**
 * Executor gate (loose): the sealed plan's tasks are done and the workspace holds
 * the produced shell result — new component(s) beyond the fixture baseline and a
 * scene file. The full visual `validate` browser pass is best-effort, not required.
 */
export default function assertDesignShell(_output, context) {
  const ws = path.resolve(context.vars.workspace);
  const theme = path.join(ws, 'web/themes/custom/test_integration_drupal');
  const dataDir = path.join(theme, 'designbook');

  let newComponents = [];
  try {
    newComponents = fs
      .readdirSync(path.join(theme, 'components'), { withFileTypes: true })
      .filter((e) => e.isDirectory() && !BASELINE.has(e.name))
      .filter((e) => fs.existsSync(path.join(theme, 'components', e.name, `${e.name}.component.yml`)))
      .map((e) => e.name);
  } catch {
    newComponents = [];
  }

  const walk = (dir) => {
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
  };
  const hasScene = [...walk(path.join(theme, 'sections')), ...walk(path.join(dataDir, 'scenes'))].some((f) =>
    /\.scenes?\.ya?ml$/.test(f),
  );

  let doneTasks = 0;
  let totalTasks = 0;
  try {
    const md = fs.readFileSync(path.join(dataDir, 'plans', 'design-shell.plan.md'), 'utf8');
    doneTasks = (md.match(/^- \[x\] /gim) || []).length;
    totalTasks = (md.match(/^- \[[ xX]\] /gm) || []).length;
  } catch {
    /* no plan */
  }

  const componentsOk = newComponents.length >= 1;
  const tasksOk = doneTasks >= 1;
  const pass = componentsOk && tasksOk && hasScene;
  return {
    pass,
    score: (componentsOk ? 0.4 : 0) + (hasScene ? 0.3 : 0) + (tasksOk ? 0.3 : 0),
    reason: `new-components=[${newComponents.join(',')}] scene=${hasScene} tasks-done=${doneTasks}/${totalTasks}`,
  };
}
