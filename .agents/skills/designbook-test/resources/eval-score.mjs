#!/usr/bin/env node
// eval-score.mjs — the ONE eval scorer for design + sync cases. All eval-
// execution lives here (skill layer), NOT in the addon CLI. Shells the pure
// `workflow summary --json`, then applies the case metric + assertions.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execSync, execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { load as parseYaml } from 'js-yaml';
import jsonata from 'jsonata';

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : def;
}

const summaryCmd = arg('summary-cmd', 'npx storybook-addon-designbook workflow summary');
const workflow = arg('workflow');
const caseFile = arg('case');
const dataDir = arg('data-dir', '.designbook'); // only read for sync cases
const drushCmd = arg('drush-cmd', 'ddev drush');

const caseDoc = parseYaml(readFileSync(caseFile, 'utf-8')) ?? {};
const quote = value => `'${String(value).replace(/'/g, `'\\''`)}'`;
const summary = JSON.parse(execSync(`${summaryCmd} ${quote(workflow)} --json`, { encoding: 'utf-8' }));

// assertions — ported from scoring/composite.ts, faithful `output` shape.
const ASSERTION_TIMEOUT_MS = 1000;
function evalAssertions(assertions, output) {
  let passed = 0, total = 0;
  const failures = [];
  for (const a of assertions) {
    if (a.type !== 'javascript') continue;
    total += 1;
    const ctx = vm.createContext({ output }, { codeGeneration: { strings: false, wasm: false } });
    try {
      let script;
      try { script = new vm.Script(a.value); }
      catch { script = new vm.Script(`(() => { ${a.value} })()`); }
      if (script.runInContext(ctx, { timeout: ASSERTION_TIMEOUT_MS })) passed += 1;
      else failures.push(a.value);
    } catch {
      failures.push(a.value);
    }
  }
  return { passed, total, failures };
}
const themeDir = arg('theme-dir', process.cwd());
const completedWorkflows = {}, pendingWorkflows = {};
for (const folder of ['changes', 'archive']) {
  const root = `${dataDir}/workflows/${folder}`;
  if (!existsSync(root)) continue;
  for (const name of readdirSync(root)) {
    const file = `${root}/${name}/tasks.yml`;
    if (!existsSync(file)) continue;
    const doc = parseYaml(readFileSync(file, 'utf8'));
    (doc.state.status === 'completed' ? completedWorkflows : pendingWorkflows)[doc.definition.id] = doc;
  }
}
const gitFiles = args => execFileSync('git', args, { cwd: themeDir, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const newFiles = gitFiles(['ls-files', '--others', '--exclude-standard']);
const modifiedFiles = gitFiles(['diff', '--name-only']);
const fileContents = {};
for (const file of [...new Set([...newFiles, ...modifiedFiles])]) {
  try {
    const content = readFileSync(`${themeDir}/${file}`, 'utf8');
    fileContents[file] = /\.(ya?ml|json)$/.test(file) ? parseYaml(content) : content;
  } catch { /* Binary or removed artifact. */ }
}
const before = arg('definition-before');
const document = parseYaml(readFileSync(workflow, 'utf8'));
const definitionUnchanged = before ? JSON.stringify(document.definition) === JSON.stringify(parseYaml(readFileSync(before, 'utf8'))) : false;
const assertOutput = { ...summary, completedWorkflows, pendingWorkflows, newFiles, modifiedFiles, fileContents, definitionUnchanged, text: arg('transcript', '') };
const assertions = evalAssertions(caseDoc.assert ?? [], assertOutput);

// sync cases: merge validate_pass_rate + cim_ok (tasks.yml) + existence_rate (drush)
let metricInput = summary;
const expected = caseDoc.expected_config ?? [];
if (expected.length > 0) {
  const tasks = parseYaml(readFileSync(workflow, 'utf-8')) ?? {};
  const units = Object.values(tasks.state.tasks).flatMap((t) => {
    const e = t.results?.['config-file'];
    return e ? [e] : [];
  });
  const validate_pass_rate = units.length > 0 ? units.filter((e) => e.valid === true).length / units.length : 0;
  let cim_ok = false;
  for (const t of Object.values(tasks.state.tasks)) {
    for (const e of Object.values(t.results ?? {})) {
      if (e && typeof e.value === 'object' && e.value !== null && 'cim_ok' in e.value) cim_ok = e.value.cim_ok === true;
    }
  }
  const configExists = (name) => {
    try {
      execSync(`${drushCmd} config:get '${name}' --format=json`, { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  };
  const existence_rate = expected.filter(configExists).length / expected.length;
  metricInput = { ...summary, validate_pass_rate, cim_ok, existence_rate };
}

const expr = caseDoc.metric ?? 'flowRate';
const metric = await jsonata(expr).evaluate(metricInput);
console.log(JSON.stringify({ ...metricInput, assertions, metric: typeof metric === 'number' ? metric : null }));
