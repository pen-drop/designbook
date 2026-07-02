#!/usr/bin/env node
// eval-score.mjs — the ONE eval scorer for design + sync cases. All eval-
// execution lives here (skill layer), NOT in the addon CLI. Shells the pure
// `workflow summary --json`, then applies the case metric + assertions.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
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
const summary = JSON.parse(execSync(`${summaryCmd} --workflow ${workflow} --json`, { encoding: 'utf-8' }));

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
      if (vm.runInContext(a.value, ctx, { timeout: ASSERTION_TIMEOUT_MS })) passed += 1;
      else failures.push(a.value);
    } catch {
      failures.push(a.value);
    }
  }
  return { passed, total, failures };
}
const assertOutput = {
  flowRate: summary.flowRate,
  successRate: summary.successRate,
  comparePassed: summary.comparePassed,
  metrics: summary.metrics,
};
const assertions = evalAssertions(caseDoc.assert ?? [], assertOutput);

// sync cases: merge validate_pass_rate + cim_ok (tasks.yml) + existence_rate (drush)
let metricInput = summary;
const expected = caseDoc.expected_config ?? [];
if (expected.length > 0) {
  const tasks = parseYaml(readFileSync(`${dataDir}/workflows/archive/${workflow}/tasks.yml`, 'utf-8')) ?? {};
  const units = (tasks.tasks ?? []).flatMap((t) => {
    const e = t.result?.['config-file'];
    return e ? [e] : [];
  });
  const validate_pass_rate = units.length > 0 ? units.filter((e) => e.valid === true).length / units.length : 0;
  let cim_ok = false;
  for (const t of tasks.tasks ?? []) {
    for (const e of Object.values(t.result ?? {})) {
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
