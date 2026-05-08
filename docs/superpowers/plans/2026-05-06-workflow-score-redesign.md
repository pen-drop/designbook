# Workflow Score Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `flow_rate` wird deterministisch von der Engine in `archiveWorkflow` berechnet und in `workflow_output` gespeichert; `workflow score` wird zu `workflow summary` — einem reinen Lesebefehl mit human- und JSON-Output.

**Architecture:** `archiveWorkflow()` in `workflow.ts` liest `dbo.log` + `scope.workflow_output.success_rate`, berechnet `flow_rate`, und schreibt beide Werte vor dem Archivieren zurück in `scope.workflow_output`. `workflow-summary.ts` liest nur `tasks.yml` und formatiert das Ergebnis. `composite.ts` wird auf die reine `flow_rate`-Formel vereinfacht.

**Tech Stack:** TypeScript, Node.js, Vitest, `js-yaml`, `commander`

---

## File Map

| Datei | Aktion | Zweck |
|---|---|---|
| `src/scoring/composite.ts` | Modify | Nur `flow_rate`-Formel, kein Assertions-Weight im gespeicherten Score |
| `src/scoring/__tests__/composite.test.ts` | Modify | Tests auf neue Signatur |
| `src/workflow.ts` | Modify | `archiveWorkflow` berechnet + schreibt `flow_rate` und `metrics` |
| `src/cli/workflow-summary.ts` | Create | Reiner Leser, ersetzt `workflow-score.ts` |
| `src/cli/__tests__/workflow-summary.test.ts` | Create | Tests für summary command |
| `src/cli/workflow-score.ts` | Delete | Ersetzt durch `workflow-summary.ts` |
| `src/cli/__tests__/workflow-score.test.ts` | Delete | Ersetzt durch `workflow-summary.test.ts` |
| `src/cli/index.ts` | Modify | `score` → `summary` registrieren |
| `.agents/skills/designbook/design/schemas.yml` | Modify | `flow_rate` neu, `success_rate` Beschreibung präzisiert |
| `.agents/skills/designbook/design/tasks/outtake--design-workflow.md` | Modify | `flow_rate`/`metrics` aus Result entfernt |

---

### Task 1: `composite.ts` vereinfachen

**Files:**
- Modify: `packages/storybook-addon-designbook/src/scoring/composite.ts`
- Modify: `packages/storybook-addon-designbook/src/scoring/__tests__/composite.test.ts`

- [ ] **Schreibe den failing Test**

Ersetze die bestehenden Tests in `composite.test.ts` mit:

```typescript
import { describe, expect, it } from 'vitest';
import { computeFlowRate } from '../composite.js';

describe('computeFlowRate', () => {
  it('berechnet flow_rate aus success_rate und friction', () => {
    const r = computeFlowRate({ successRate: 0.85, errors: 0, retries: 2, unresolved: 0 });
    // friction = 0*5 + 2*2 + 0*3 = 4
    // flow_rate = 0.85 * 100 - 4 = 81
    expect(r.flowRate).toBeCloseTo(81);
    expect(r.successRate).toBe(0.85);
    expect(r.metrics).toEqual({ errors: 0, retries: 2, unresolved: 0 });
  });

  it('gibt negatives flow_rate zurück wenn kein success_rate', () => {
    const r = computeFlowRate({ errors: 3, retries: 1, unresolved: 1 });
    // friction = 3*5 + 1*2 + 1*3 = 20
    // flow_rate = 0 - 20 = -20
    expect(r.flowRate).toBe(-20);
    expect(r.successRate).toBeUndefined();
  });

  it('flow_rate ist 100 bei perfektem Run', () => {
    const r = computeFlowRate({ successRate: 1, errors: 0, retries: 0, unresolved: 0 });
    expect(r.flowRate).toBe(100);
  });
});
```

- [ ] **Test ausführen — muss FAIL sein**

```bash
cd packages/storybook-addon-designbook
pnpm exec vitest run src/scoring/__tests__/composite.test.ts
```

Expected: `computeFlowRate is not a function` oder ähnlich.

- [ ] **Implementiere `composite.ts`**

```typescript
export interface FlowRateInput {
  successRate?: number;
  errors?: number;
  retries?: number;
  unresolved?: number;
}

export interface FlowRateResult {
  flowRate: number;
  successRate?: number;
  metrics: { errors: number; retries: number; unresolved: number };
}

export const FRICTION_WEIGHTS = { error: 5, retry: 2, unresolved: 3 } as const;

export function computeFlowRate(input: FlowRateInput): FlowRateResult {
  const errors = input.errors ?? 0;
  const retries = input.retries ?? 0;
  const unresolved = input.unresolved ?? 0;
  const friction =
    errors * FRICTION_WEIGHTS.error +
    retries * FRICTION_WEIGHTS.retry +
    unresolved * FRICTION_WEIGHTS.unresolved;
  const base = typeof input.successRate === 'number' ? input.successRate * 100 : 0;
  return {
    flowRate: base - friction,
    ...(typeof input.successRate === 'number' ? { successRate: input.successRate } : {}),
    metrics: { errors, retries, unresolved },
  };
}

// Legacy — used by evalAssertions in workflow-summary
export interface Assertion { type: string; value: string }
export interface AssertionResult { passed: number; total: number; failures: string[] }

import vm from 'node:vm';
const ASSERTION_TIMEOUT_MS = 1000;

export function evalAssertions(assertions: Assertion[], output: unknown): AssertionResult {
  let passed = 0; let total = 0; const failures: string[] = [];
  for (const a of assertions) {
    if (a.type !== 'javascript') continue;
    total += 1;
    const ctx = vm.createContext({ output }, { codeGeneration: { strings: false, wasm: false } });
    try {
      if (vm.runInContext(a.value, ctx, { timeout: ASSERTION_TIMEOUT_MS })) { passed += 1; }
      else { failures.push(a.value); }
    } catch { failures.push(a.value); }
  }
  return { passed, total, failures };
}
```

- [ ] **Test ausführen — muss PASS sein**

```bash
pnpm exec vitest run src/scoring/__tests__/composite.test.ts
```

- [ ] **Commit**

```bash
git add packages/storybook-addon-designbook/src/scoring/composite.ts \
        packages/storybook-addon-designbook/src/scoring/__tests__/composite.test.ts
git commit -m "refactor(score): composite.ts → computeFlowRate, kein Assertions-Weight"
```

---

### Task 2: `archiveWorkflow` berechnet und speichert `flow_rate`

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow.ts` (Funktion `archiveWorkflow`, ca. Zeile 185)

- [ ] **Schreibe den failing Test**

Füge in `src/__tests__/workflow-lifecycle.test.ts` (oder neue Datei `src/__tests__/workflow-archive-score.test.ts`) hinzu:

```typescript
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { load as parseYaml } from 'js-yaml';
import { readFileSync } from 'node:fs';

// Wir testen archiveWorkflow indirekt über workflowDone —
// hier testen wir die Hilfsfunktion injectFlowRate direkt,
// da sie exportiert wird (nach Task 2).
import { injectFlowRate } from '../workflow.js';

describe('injectFlowRate', () => {
  it('berechnet flow_rate aus success_rate + dbo.log', () => {
    const root = resolve(tmpdir(), `archive-score-${Date.now()}`);
    mkdirSync(root, { recursive: true });
    // dbo.log mit 2 errors, 1 retry-group (count=2 → 1 retry)
    writeFileSync(
      resolve(root, 'dbo.log'),
      [
        JSON.stringify({ ts: '2026-05-06T00:00:00Z', cmd: 'workflow create', tagged: true, error: 'oops' }),
        JSON.stringify({ ts: '2026-05-06T00:00:01Z', cmd: 'workflow done', tagged: true, error: 'oops2' }),
      ].join('\n') + '\n',
    );
    const scope = { workflow_output: { success_rate: 0.9 } };
    injectFlowRate(root, scope);
    const wo = scope.workflow_output as Record<string, unknown>;
    // friction = 2*5 + 0*2 + 0*3 = 10; flow_rate = 90 - 10 = 80
    expect(wo.flow_rate).toBeCloseTo(80);
    expect((wo.metrics as Record<string, number>).errors).toBe(2);
    rmSync(root, { recursive: true });
  });

  it('setzt flow_rate auch ohne success_rate (nur friction)', () => {
    const root = resolve(tmpdir(), `archive-nosuccess-${Date.now()}`);
    mkdirSync(root, { recursive: true });
    writeFileSync(resolve(root, 'dbo.log'), '');
    const scope = { workflow_output: {} };
    injectFlowRate(root, scope);
    const wo = scope.workflow_output as Record<string, unknown>;
    expect(wo.flow_rate).toBe(0);
    expect(wo.success_rate).toBeUndefined();
    rmSync(root, { recursive: true });
  });
});
```

- [ ] **Test ausführen — muss FAIL sein**

```bash
pnpm exec vitest run src/__tests__/workflow-archive-score.test.ts
```

Expected: `injectFlowRate is not exported`

- [ ] **Implementiere `injectFlowRate` und erweitere `archiveWorkflow`**

Füge am Anfang von `workflow.ts` den Import hinzu (zu den bestehenden Imports):

```typescript
import { digestLog } from './log/digest.js';
import { computeFlowRate } from './scoring/composite.js';
```

Füge nach den bestehenden Helper-Funktionen (nach `timestamp()`) die neue exportierte Funktion ein:

```typescript
/**
 * Liest dbo.log aus dataDir, berechnet flow_rate + metrics und schreibt beides
 * in scope.workflow_output. Wird von archiveWorkflow aufgerufen.
 */
export function injectFlowRate(dataDir: string, scope: Record<string, unknown>): void {
  const logPath = resolve(dataDir, 'dbo.log');
  const digest = existsSync(logPath) ? digestLog(logPath) : { errors: [], retries: [], unresolved: [] };
  const errors = digest.errors.length;
  const retries = digest.retries.reduce((acc, g) => acc + (g.count - 1), 0);
  const unresolved = digest.unresolved.length;

  const wo = (scope.workflow_output ?? {}) as Record<string, unknown>;
  const successRate = typeof wo.success_rate === 'number' ? wo.success_rate : undefined;
  const result = computeFlowRate({ successRate, errors, retries, unresolved });

  wo.flow_rate = result.flowRate;
  wo.metrics = { ...((wo.metrics as object | undefined) ?? {}), ...result.metrics };
  scope.workflow_output = wo;
}
```

Ändere `archiveWorkflow` (Zeile ~185) — füge den `injectFlowRate`-Aufruf vor `writeWorkflowAtomic` ein:

```typescript
function archiveWorkflow(dataDir: string, name: string, wf: WorkflowFile): void {
  wf.status = 'completed';
  wf.completed_at = timestamp();
  wf.summary = wf.tasks.map((t) => `${t.title} (${t.type})`).join(', ');

  // Berechne flow_rate deterministisch aus dbo.log + success_rate
  const scope = (wf.scope ?? {}) as Record<string, unknown>;
  injectFlowRate(dataDir, scope);
  wf.scope = scope;

  const changesDir = resolve(dataDir, 'workflows', 'changes', name);
  const filePath = resolve(changesDir, 'tasks.yml');
  writeWorkflowAtomic(filePath, wf);

  const archiveDir = resolve(dataDir, 'workflows', 'archive', name);
  mkdirSync(dirname(archiveDir), { recursive: true });
  renameSync(changesDir, archiveDir);
}
```

- [ ] **Test ausführen — muss PASS sein**

```bash
pnpm exec vitest run src/__tests__/workflow-archive-score.test.ts
```

- [ ] **Typecheck**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow.ts \
        packages/storybook-addon-designbook/src/__tests__/workflow-archive-score.test.ts
git commit -m "feat(workflow): archiveWorkflow berechnet flow_rate + metrics via injectFlowRate"
```

---

### Task 3: `workflow-summary.ts` — reiner Leser

**Files:**
- Create: `packages/storybook-addon-designbook/src/cli/workflow-summary.ts`
- Create: `packages/storybook-addon-designbook/src/cli/__tests__/workflow-summary.test.ts`

- [ ] **Schreibe die failing Tests**

```typescript
// src/cli/__tests__/workflow-summary.test.ts
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { readSummary, type SummaryOptions } from '../workflow-summary.js';

function setup(name: string) {
  const root = resolve(tmpdir(), `summary-${name}-${Date.now()}`);
  const dataDir = resolve(root, 'designbook');
  mkdirSync(dataDir, { recursive: true });
  return { root, dataDir };
}

function writeArchive(dataDir: string, workflowName: string, workflowOutput: Record<string, unknown>) {
  const dir = resolve(dataDir, 'workflows', 'archive', workflowName);
  mkdirSync(dir, { recursive: true });
  const lines = [
    `workflow: ${workflowName}`,
    'status: completed',
    'scope:',
    '  workflow_output:',
    ...Object.entries(workflowOutput).map(([k, v]) => `    ${k}: ${JSON.stringify(v)}`),
    'tasks: []',
    '',
  ];
  writeFileSync(resolve(dir, 'tasks.yml'), lines.join('\n'));
}

describe('readSummary', () => {
  it('liest flow_rate + success_rate aus tasks.yml', () => {
    const { root, dataDir } = setup('basic');
    writeArchive(dataDir, 'design-shell', { flow_rate: 81, success_rate: 0.85, compare_passed: true });
    const r = readSummary({ dataDir, workflowName: 'design-shell' });
    expect(r.flowRate).toBe(81);
    expect(r.successRate).toBe(0.85);
    expect(r.comparePassed).toBe(true);
    rmSync(root, { recursive: true });
  });

  it('gibt null zurück wenn tasks.yml nicht existiert', () => {
    const { root, dataDir } = setup('missing');
    const r = readSummary({ dataDir, workflowName: 'design-shell' });
    expect(r).toBeNull();
    rmSync(root, { recursive: true });
  });

  it('wertet case assertions aus wenn caseFile übergeben', () => {
    const { root, dataDir } = setup('assertions');
    writeArchive(dataDir, 'design-shell', { flow_rate: 90, success_rate: 0.9, compare_passed: true });
    const caseFile = resolve(root, 'case.yaml');
    writeFileSync(caseFile, [
      'fixtures: []',
      'prompt: x',
      'assert:',
      '  - type: javascript',
      "    value: 'output.comparePassed === true'",
      '',
    ].join('\n'));
    const r = readSummary({ dataDir, workflowName: 'design-shell', caseFile });
    expect(r?.assertions?.passed).toBe(1);
    expect(r?.assertions?.total).toBe(1);
    rmSync(root, { recursive: true });
  });
});
```

- [ ] **Test ausführen — muss FAIL sein**

```bash
pnpm exec vitest run src/cli/__tests__/workflow-summary.test.ts
```

- [ ] **Implementiere `workflow-summary.ts`**

```typescript
/**
 * `npx storybook-addon-designbook workflow summary`
 *
 * Reiner Leser: gibt flow_rate, success_rate und metrics aus tasks.yml zurück.
 * flow_rate + metrics werden von archiveWorkflow beim Archivieren berechnet.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Command } from 'commander';
import { load as parseYaml } from 'js-yaml';
import { loadConfig } from '../config.js';
import { evalAssertions, type Assertion, type AssertionResult } from '../scoring/composite.js';

export interface SummaryOptions {
  dataDir: string;
  workflowName: string;
  caseFile?: string;
}

export interface SummaryResult {
  workflow: string;
  flowRate: number;
  successRate?: number;
  comparePassed?: boolean;
  metrics?: { errors: number; retries: number; unresolved: number };
  summary?: string;
  warnings?: string[];
  assertions?: AssertionResult;
}

interface WorkflowOutput {
  flow_rate?: number;
  success_rate?: number;
  compare_passed?: boolean;
  metrics?: { errors?: number; retries?: number; unresolved?: number };
  summary?: string;
  warnings?: string[];
}

export function readSummary(opts: SummaryOptions): SummaryResult | null {
  const tasksPath = resolve(opts.dataDir, 'workflows', 'archive', opts.workflowName, 'tasks.yml');
  if (!existsSync(tasksPath)) return null;

  let tasksData: { scope?: { workflow_output?: WorkflowOutput } } | null = null;
  try {
    tasksData = parseYaml(readFileSync(tasksPath, 'utf-8')) as typeof tasksData;
  } catch { return null; }

  const wo: WorkflowOutput = tasksData?.scope?.workflow_output ?? {};

  let assertions: AssertionResult | undefined;
  if (opts.caseFile && existsSync(opts.caseFile)) {
    const caseDoc = parseYaml(readFileSync(opts.caseFile, 'utf-8')) as { assert?: Assertion[] } | null;
    const assertList = caseDoc?.assert ?? [];
    if (assertList.length > 0) {
      const output = {
        flowRate: wo.flow_rate,
        successRate: wo.success_rate,
        comparePassed: wo.compare_passed,
        metrics: wo.metrics,
      };
      assertions = evalAssertions(assertList, output);
    }
  }

  return {
    workflow: opts.workflowName,
    flowRate: wo.flow_rate ?? 0,
    ...(typeof wo.success_rate === 'number' ? { successRate: wo.success_rate } : {}),
    ...(typeof wo.compare_passed === 'boolean' ? { comparePassed: wo.compare_passed } : {}),
    ...(wo.metrics ? { metrics: { errors: wo.metrics.errors ?? 0, retries: wo.metrics.retries ?? 0, unresolved: wo.metrics.unresolved ?? 0 } } : {}),
    ...(wo.summary ? { summary: wo.summary } : {}),
    ...(wo.warnings?.length ? { warnings: wo.warnings } : {}),
    ...(assertions ? { assertions } : {}),
  };
}

function formatHuman(r: SummaryResult): string {
  const lines = [
    `${r.workflow}`,
    `  flow_rate:    ${r.flowRate.toFixed(1)}`,
    ...(typeof r.successRate === 'number' ? [`  success_rate: ${r.successRate.toFixed(2)}  (visual quality)`] : []),
    ...(typeof r.comparePassed === 'boolean' ? [`  compare:      ${r.comparePassed ? '✓ passed' : '✗ failed'}`] : []),
    ...(r.metrics ? [`  metrics:      errors ${r.metrics.errors} · retries ${r.metrics.retries} · unresolved ${r.metrics.unresolved}`] : []),
    ...(r.summary ? [`  summary:      ${r.summary}`] : []),
    ...(r.warnings?.length ? r.warnings.map((w) => `  warning:      ${w}`) : []),
    ...(r.assertions ? [`  assertions:   ${r.assertions.passed}/${r.assertions.total} passed`] : []),
  ];
  return lines.join('\n');
}

export function register(workflow: Command): void {
  workflow
    .command('summary')
    .description('Zeige Ergebnis des letzten Workflow-Runs (flow_rate, success_rate, metrics).')
    .requiredOption('--workflow <name>', 'Workflow-Name (z.B. design-shell-2026-05-06-abcd)')
    .option('--case <file>', 'Case-YAML mit assert:-Block')
    .option('--json', 'JSON-Output (für Research-Loop)')
    .action((opts: { workflow: string; case?: string; json?: boolean }) => {
      const config = loadConfig();
      const r = readSummary({ dataDir: config.data, workflowName: opts.workflow, caseFile: opts.case });
      if (!r) { console.error(`Kein archivierter Workflow gefunden: ${opts.workflow}`); process.exit(1); }
      if (opts.json) { console.log(JSON.stringify(r)); }
      else { console.log(formatHuman(r)); }
    });
}
```

- [ ] **Tests ausführen — müssen PASS sein**

```bash
pnpm exec vitest run src/cli/__tests__/workflow-summary.test.ts
```

- [ ] **Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/workflow-summary.ts \
        packages/storybook-addon-designbook/src/cli/__tests__/workflow-summary.test.ts
git commit -m "feat(cli): workflow summary — reiner Leser für flow_rate + success_rate"
```

---

### Task 4: `workflow score` durch `workflow summary` ersetzen

**Files:**
- Modify: `packages/storybook-addon-designbook/src/cli/index.ts`
- Delete: `packages/storybook-addon-designbook/src/cli/workflow-score.ts`
- Delete: `packages/storybook-addon-designbook/src/cli/__tests__/workflow-score.test.ts`

- [ ] **Finde `score`-Registration in `cli/index.ts`**

```bash
grep -n "score\|summary" packages/storybook-addon-designbook/src/cli/index.ts
```

- [ ] **Tausche `score` gegen `summary` aus**

Ersetze in `src/cli/index.ts`:
```typescript
// Alt:
import { register as registerScore } from './workflow-score.js';
// ...
registerScore(workflowCommand);
```
durch:
```typescript
// Neu:
import { register as registerSummary } from './workflow-summary.js';
// ...
registerSummary(workflowCommand);
```

- [ ] **Lösche die alten Dateien**

```bash
rm packages/storybook-addon-designbook/src/cli/workflow-score.ts
rm packages/storybook-addon-designbook/src/cli/__tests__/workflow-score.test.ts
```

- [ ] **Typecheck + alle Tests**

```bash
cd packages/storybook-addon-designbook && pnpm exec tsc --noEmit && pnpm exec vitest run
```

- [ ] **Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/index.ts
git rm packages/storybook-addon-designbook/src/cli/workflow-score.ts \
        packages/storybook-addon-designbook/src/cli/__tests__/workflow-score.test.ts
git commit -m "refactor(cli): workflow score → workflow summary"
```

---

### Task 5: Schema + Skill-Dateien aktualisieren

**Files:**
- Modify: `.agents/skills/designbook/design/schemas.yml`
- Modify: `.agents/skills/designbook/design/tasks/outtake--design-workflow.md`

- [ ] **`design/schemas.yml`: `flow_rate` hinzufügen, `success_rate` Beschreibung präzisieren**

In `DesignWorkflowOutput` (suche nach `success_rate:`):

```yaml
    success_rate:
      type: number
      minimum: 0
      maximum: 1
      description: >
        Optisches Qualitätsurteil des AI nach Abschluss des Outtake-Tasks.
        Beschreibt wie gut das visuelle Ergebnis der Referenz entspricht (0 = kein Match, 1 = perfekter Match).
        Wird von der Engine nach dem Archivieren zu flow_rate weiterverarbeitet.
    flow_rate:
      type: number
      description: >
        Composite-Score für den Research-Loop. Wird von der Engine deterministisch berechnet:
        flow_rate = success_rate * 100 - friction (errors*5 + retries*2 + unresolved*3).
        Wird nie vom AI geschrieben.
```

- [ ] **`outtake--design-workflow.md`: `flow_rate` und `metrics` aus Result entfernen**

Das `result:`-Frontmatter des Tasks soll nur noch `workflow_output` mit AI-authored Feldern deklarieren. Entferne alle Verweise auf `flow_rate` oder `metrics` als AI-Outputs aus dem Task-Body. Die Task-Beschreibung soll explizit sagen dass `flow_rate` von der Engine berechnet wird.

Füge am Ende des Task-Bodys hinzu:

```markdown
## Hinweis

`flow_rate` und `workflow_output.metrics` werden **nicht** von diesem Task berechnet.
Die Engine injiziert diese Werte deterministisch beim Archivieren des Workflows.
Schreibe nur `success_rate` (visuelles Urteil) und die menschlich lesbaren Felder.
```

- [ ] **Typecheck + alle Tests**

```bash
cd packages/storybook-addon-designbook && pnpm check
```

- [ ] **Commit**

```bash
git add .agents/skills/designbook/design/schemas.yml \
        .agents/skills/designbook/design/tasks/outtake--design-workflow.md
git commit -m "docs(skill): flow_rate in schema, outtake-Hinweis auf Engine-Berechnung"
```

---

### Task 6: `research.md` auf `workflow summary` aktualisieren

**Files:**
- Modify: `.agents/skills/designbook-test/research.md`

- [ ] **Ersetze `workflow score` durch `workflow summary --json`**

In `research.md`, alle Vorkommen von:
```
npx storybook-addon-designbook workflow score --workflow <id> --case <path> --json
```
ersetzen durch:
```
npx storybook-addon-designbook workflow summary --workflow <id> --case <path> --json
```

- [ ] **Ersetze `score.json` durch `summary.json` in Pfaden**

```
iterations/000-baseline/score.json  →  iterations/000-baseline/summary.json
iterations/<N>/score.json           →  iterations/<N>/summary.json
```

- [ ] **Aktualisiere den Subagent-Prompt in `research.md`**

Im Context-Bundle-Abschnitt:
```
# Alt:
- research-runs/<slug>/iterations/<N-1>/score.json
# Neu:
- research-runs/<slug>/iterations/<N-1>/summary.json
```

Und in der Decide-Sektion: `iterations/<N>/score.json:.score` → `iterations/<N>/summary.json:.flowRate`

- [ ] **Commit**

```bash
git add .agents/skills/designbook-test/research.md
git commit -m "docs(skill): research.md auf workflow summary + flowRate umstellen"
```

---

### Task 7: Abschluss — `pnpm check`

- [ ] **Vollständiger Check**

```bash
cd packages/storybook-addon-designbook && pnpm check
```

Expected: typecheck ✓, lint ✓, tests ✓

- [ ] **Manueller Smoke-Test**

```bash
# Im Workspace-Verzeichnis nach einem abgeschlossenen Workflow:
npx storybook-addon-designbook workflow summary --workflow <name>
npx storybook-addon-designbook workflow summary --workflow <name> --json
```

- [ ] **Final commit + push**

```bash
git push origin feat/research-mode
```
