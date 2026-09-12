# Refaktor Workflow Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every skill file under `.agents/skills/designbook*` MUST be authored with `designbook-skill-creator` loaded first (per CLAUDE.md).

**Goal:** Ersetze die YAML-Katalog-/Definition-Engine durch einen `intake`-Leser plus einen selbst-enthaltenen MD-Plan, der ohne Intake-Skill autonom via `workflow done` ausführbar ist.

**Architecture:** Die CLI schrumpft auf zwei Rollen — `intake <workflow>` (aufgelöster, config-gefilterter Planungskontext mit eingebettetem kanonischem Inhalt, Herkunft und geordnetem Leseauftrag) und die Ausführungs-Validierung gegen einen MD-Plan (`workflow done` validiert nur gegen eingefrorene Contracts im Plan, keine Discovery). Der bestehende trigger/filter-Matcher wird wiederverwendet, indem `intake` den synthetischen Step `<wf>:intake` in denselben Matcher speist. Discover/Create/Katalog/YAML-Definition/planning-contracts entfallen ersatzlos (AC-8).

**Tech Stack:** TypeScript, Node, commander, AJV (draft-07), js-yaml, vitest; `.agents/skills` Skill-Dateien; `designbook-test` (fresh fixture workspaces).

**Spec:** `docs/specs/workflow-engine-refactor-spec.md`

## Global Constraints

- Keine Migration, keine Kompatibilitätsleser, keine Reparatur alter Artefakte — Writer/Reader/Skills/Fixtures verwenden direkt den neuen Vertrag (AC-8; CLAUDE.md).
- Schema-Create-Pfad-Bugs (`collectedSchemas`-Drop, toter `widenDefinitionEnums`) sind NICHT Teil dieses Tickets (Nicht-Ziel).
- `schemas.yml` bleibt single source of truth; Task-Contracts werden per Wert aus den Task-Dateien in den MD-Plan eingefroren, nicht dupliziert-gepflegt.
- Skill-Dateiänderungen folgen `designbook-skill-creator` (WHAT-vs-HOW; keine `params:` in Rules/Blueprints) und `writing-for-agents`.
- `pnpm check` (typecheck → lint → test, fail-fast) muss grün sein; App-/Addon-Änderungen zusätzlich über `designbook-test` verifizieren.
- Ausführung betreibt keine neue Discovery oder Ablaufkonstruktion (AC-6); der Plan-Digest friert die Definition ein.
- Alle Pfade relativ zu `packages/storybook-addon-designbook/` (TS) bzw. `.agents/skills/` (Skills), sofern nicht anders angegeben.

---

## File Structure

Neu (TS):
- `src/intake-resolve.ts` — reine Auflösung: baut `IntakeContext` aus Skill-Quellen via bestehendem Matcher (`<wf>:intake`-Step + `design.intake`-Domain), config-gefiltert, mit Gating offener Selektoren.
- `src/cli/intake.ts` — commander-Registrierung `intake <workflow>`, ruft `resolveIntakeContext`, emittiert JSON.
- `src/plan-document.ts` — MD-Plan Parser/Serializer + `planDigest` + `validatePlanCompleteness` + `validateTaskResult`.
- `src/cli/plan.ts` — commander-Registrierung der Plan-Ausführungskommandos (`done`, `steps`, `instructions`, `start`, `block`, `summary`, `validate`) gegen einen MD-Plan-Pfad.

Entfällt (TS, gelöscht — AC-8):
- `src/workflow-resolve.ts`, `src/planning-sources.ts` (Matcher wandert nach `intake-resolve.ts`, Rest gelöscht), `src/planning-schema.ts`, `src/schema-block.ts`, `src/workflow-schema-merge.ts`, `src/planning-contracts.ts`.
- `src/workflow-document.ts` (YAML-Definition/-Dokument), `src/workflow-store.ts` (YAML-Save/Read), `src/workflow-steps.ts`, `src/workflow-summary.ts` — ersetzt durch `plan-document.ts`/`cli/plan.ts`.
- `src/cli/workflow.ts`-Katalogpfad (`discover`, `create`, `validate --catalogue`, `schema`, `definitions`, `capture-location` bleibt) — Kommando `workflow` wird zu `plan`-Delegator.

Bleibt (TS):
- `src/reference-capture.ts`, `src/cli/inspect-register.ts`, `src/cli/reference-inspect.ts`, `src/cli/capture-session.ts`, `src/workflow-context-boundary.ts` — reference/capture-IO.
- `src/config.ts`, `src/skill-resolver.ts`, `src/skill-sources.ts`, `src/cli/workflow-discovery.ts` (Workflow-Datei-Auflösung wird von `intake` genutzt).

Skills:
- `.agents/skills/designbook/resources/{cli-workflow,workflow-building,workflow-execution}.md`, `skills/execute-workflow/SKILL.md`, jeder `skills/<wf>/resources/intake.md` — auf `intake`+MD-Plan umgestellt.
- `.agents/skills/designbook/design/rules/{website,storybook}-capture-observations.md` — Planungsanteil in Intake-Kontext, Ausführungsanteil bleibt Execution-Rule.
- `.agents/skills/designbook-test/` Fixtures für die vier frischen Fälle.

---

## Task 1: `IntakeContext`-Auflösung (Matcher-Wiederverwendung)

Löst für einen Workflow den Intake-Kontext auf, indem der synthetische Step `<wf>:intake` und die Domain `design.intake` in den bestehenden trigger/filter-Matcher gespeist werden. Damit werden die bestehenden `trigger.steps: [<wf>:intake]`- und `trigger.domain: design.intake`-Metadaten erstmals aufgelöst (AC-2).

**Files:**
- Create: `src/intake-resolve.ts`
- Modify: `src/planning-sources.ts:341-394` (Matcher `resolveFiles`/`checkConditions`/`matchConditionKey` nach `intake-resolve.ts` extrahieren; alten planning-Rest belässt Task 6 zum Löschen)
- Test: `src/__tests__/intake-resolve.test.ts`

**Interfaces:**
- Consumes: `resolveSkillsRoot`, `resolveSkillSources` (`config.ts`, `skill-resolver.ts`); `resolveWorkflowFile` (`cli/workflow-discovery.ts:23`); bestehende Match-Primitive `checkConditions`/`matchConditionKey` (`planning-sources.ts:200-265`).
- Produces:
  ```ts
  export interface EmbeddedContent { source: string; content: string }
  export interface ContextEntry extends EmbeddedContent { key: string; kind: 'rule' | 'blueprint' }
  export interface TaskContract { name: string; step: string; outputs: unknown; source: string }
  export interface IntakeStep {
    name: string;            // execution step id
    context: string[];       // keys in die geteilte Context-Registry (Per-Step-Referenzen)
    read_order: string[];    // geordnete Context-Keys, vor abhängigen Entscheidungen zu lesen
    tasks: TaskContract[];   // Task-Palette-Kandidaten für diesen Step
  }
  export interface IntakeContext {
    workflow: string;
    config: Record<string, unknown>;
    definitions: Record<string, unknown>;   // eingefrorene #/definitions/<Name> aus schemas.yml
    context: Record<string, ContextEntry>;  // geteilte Registry, dedupliziert; Wiederholung wird referenziert, nicht kopiert
    steps: IntakeStep[];
    open_selectors: OpenSelector[];   // Task 2
    gated: GatedGroup[];              // Task 2
  }
  export function resolveIntakeContext(workflowId: string, opts?: { configDir?: string }): IntakeContext
  ```

- [ ] **Step 1: Write the failing test** — `intake` liefert eine `<wf>:intake`-getaggte Regel für den passenden Workflow.

```ts
import { describe, it, expect } from 'vitest';
import { resolveIntakeContext } from '../intake-resolve';
// Fixture: skills-root mit einem Workflow 'design-shell' und einer Regel
// designbook/design/rules/entity-reference-rendering.md (trigger.steps: [design-shell:intake]).

describe('resolveIntakeContext', () => {
  it('resolves rules tagged <wf>:intake into the shared registry, referenced per step', () => {
    const ctx = resolveIntakeContext('design-shell', { configDir: FIXTURE });
    const entry = Object.values(ctx.context).find((c) =>
      c.source.endsWith('rules/entity-reference-rendering.md'));
    expect(entry).toBeDefined();
    expect(entry!.content.length).toBeGreaterThan(0); // kanonischer Inhalt eingebettet
    // mindestens ein Step referenziert den Eintrag per Key (nicht per Kopie)
    expect(ctx.steps.some((s) => s.context.includes(entry!.key))).toBe(true);
    // Wiederholung über Steps => genau EIN Registry-Eintrag
    const dupes = Object.values(ctx.context).filter((c) => c.source === entry!.source);
    expect(dupes.length).toBe(1);
  });

  it('does NOT resolve a rule whose intake token names a different workflow', () => {
    const ctx = resolveIntakeContext('tokens', { configDir: FIXTURE });
    // entity-reference-rendering only names design-*:intake, not tokens:intake
    const sources = Object.values(ctx.context).map((c) => c.source);
    expect(sources.some((s) => s.endsWith('entity-reference-rendering.md'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test intake-resolve`
Expected: FAIL — `resolveIntakeContext` not defined.

- [ ] **Step 3: Implement `resolveIntakeContext`**

Setze `context = { steps: ['<wf>:intake', `${workflowId}:intake`], domain: ['design.intake'] }` und speise es in die extrahierten Matcher (`matchRuleFiles`/`matchBlueprintFiles`/`resolveTaskFilesRich`-Äquivalent). Embedde jede gematchte Datei einmal via `readFileSync(source,'utf8')` in die geteilte `context`-Registry unter einem stabilen, source-abgeleiteten Key (byte-identische Wiederholung ⇒ ein Eintrag). Jeder `IntakeStep` referenziert nur die Keys, die für ihn matchen — keine Kopie. Baue `read_order` je Step aus den referenzierten Keys (rules → blueprints → tasks). Ziehe die von den Task-Contracts benötigten Typen transitiv aus `schemas.yml` in `definitions`. Config-Filter über `buildEnrichedConfig` (bestehend).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook test intake-resolve`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/intake-resolve.ts packages/storybook-addon-designbook/src/__tests__/intake-resolve.test.ts
git commit -m "feat(engine): resolve intake context via <wf>:intake matcher"
```

---

## Task 2: Offene Selektoren + Gating (AC-3)

Deklariert im Workflow-Frontmatter, welche Dimensionen der Intake auflösen muss (`open_selectors`), und gruppiert davon abhängige Kandidaten gegated statt flach.

**Files:**
- Modify: `src/intake-resolve.ts`
- Modify: `.agents/skills/designbook/skills/extract-reference/workflows/extract-reference.md` (Frontmatter `intake.open_selectors`)
- Test: `src/__tests__/intake-resolve.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface OpenSelector { name: string; variants: string[]; resolved: false }
  export interface GatedGroup { selector: string; variant: string; context: ContextEntry[]; tasks: TaskContract[] }
  ```
- Workflow-Frontmatter (authored, designbook-skill-creator/workflow-files.md):
  ```yaml
  intake:
    open_selectors:
      - name: source
        variants: [website, figma, storybook]
        gates:
          website: { steps: [observe-website] }
          storybook: { steps: [observe-storybook] }
          figma: { steps: [observe-figma] }
  ```

- [ ] **Step 1: Write the failing test** — offene Quelle ⇒ gegateter, nicht-vollständiger Satz.

```ts
it('marks source open and gates source-specific rules for extract-reference', () => {
  const ctx = resolveIntakeContext('extract-reference', { configDir: FIXTURE });
  expect(ctx.open_selectors.map((s) => s.name)).toContain('source');
  // website-capture-observations is NOT in the flat shared registry...
  const flatSources = Object.values(ctx.context).map((c) => c.source);
  expect(flatSources.some((s) => s.endsWith('website-capture-observations.md'))).toBe(false);
  // ...it is gated under source=website
  const website = ctx.gated.find((g) => g.selector === 'source' && g.variant === 'website')!;
  expect(website.context.some((c) => c.source.endsWith('website-capture-observations.md'))).toBe(true);
  const storybook = ctx.gated.find((g) => g.selector === 'source' && g.variant === 'storybook')!;
  expect(storybook.context.some((c) => c.source.endsWith('storybook-capture-observations.md'))).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test intake-resolve`
Expected: FAIL — `open_selectors`/`gated` empty.

- [ ] **Step 3: Implement gating**

Lies `intake.open_selectors` aus dem Workflow-Frontmatter. Für jeden Selektor ohne aufgelösten Wert: verschiebe jeden Kandidaten, dessen `trigger`/`filter` einen der Gate-Keys der Varianten trifft, aus dem flachen Satz in die passende `GatedGroup`; belasse selektor-unabhängige Kandidaten flach. `open_selectors[].resolved` bleibt `false`.

- [ ] **Step 4: Run test to verify it passes** — Run wie oben; Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/intake-resolve.ts packages/storybook-addon-designbook/src/__tests__/intake-resolve.test.ts .agents/skills/designbook/skills/extract-reference/workflows/extract-reference.md
git commit -m "feat(engine): gate open selectors in intake context (AC-3)"
```

---

## Task 3: `intake <workflow>` CLI-Kommando

Verdrahtet die Auflösung als commander-Kommando, das JSON auf stdout emittiert.

**Files:**
- Create: `src/cli/intake.ts`
- Modify: `src/cli.ts:132-136` (registriere `intake` statt/neben `workflow`)
- Test: `src/cli/__tests__/intake.test.ts`

**Interfaces:**
- Consumes: `resolveIntakeContext` (Task 1/2).
- Produces: `export function register(program: Command): void` — Kommando `intake <workflow>` mit `--config-dir`.

- [ ] **Step 1: Write the failing test**

```ts
import { runCli } from './helpers'; // spawnt das commander-Programm, captured stdout
it('intake <workflow> emits IntakeContext JSON', async () => {
  const out = await runCli(['intake', 'design-shell', '--config-dir', FIXTURE]);
  const ctx = JSON.parse(out);
  expect(ctx.workflow).toBe('design-shell');
  expect(Array.isArray(ctx.read_order)).toBe(true);
});
```

- [ ] **Step 2: Run** `pnpm --filter storybook-addon-designbook test cli/__tests__/intake` — Expected: FAIL.
- [ ] **Step 3: Implement** `register()` — parse args, call `resolveIntakeContext`, `process.stdout.write(JSON.stringify(ctx))`; Fehler → stderr + `process.exitCode = 1`.
- [ ] **Step 4: Run** wie oben — Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/intake.ts packages/storybook-addon-designbook/src/cli.ts packages/storybook-addon-designbook/src/cli/__tests__/intake.test.ts
git commit -m "feat(cli): add intake <workflow> command"
```

---

## Task 4: MD-Plan Parser/Serializer + Digest

Definiert das MD-Plan-Format und seine verlustfreie Round-Trip-Serialisierung.

**Files:**
- Create: `src/plan-document.ts`
- Test: `src/__tests__/plan-document.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface EmbeddedContent { source: string; content: string }
  export interface ContextEntry extends EmbeddedContent { key: string; kind: 'rule' | 'blueprint' }
  export interface OutputContract { required: boolean; schema: unknown; submission: 'data' | 'direct'; path?: string; validators?: string[] }
  export interface PlanTask {
    name: string;            // z.B. create-component
    title: string;           // z.B. pet-card
    done: boolean;           // Checkbox-Status
    params: Record<string, unknown>;
    contract: { outputs: Record<string, OutputContract> }; // schema via { $ref: '#/definitions/<Name>' }
    results: Record<string, unknown> | null;               // von `done` gefüllt
  }
  export interface PlanStep { name: string; context: string[]; tasks: PlanTask[] } // context = Registry-Keys (Referenzen)
  export interface Plan {
    workflow: string;
    digest: string;
    definitions: Record<string, unknown>;   // ## Schemas: #/definitions/<Name>
    context: Record<string, ContextEntry>;  // ## Context: geteilte Registry, per Step referenziert
    steps: PlanStep[];
  }
  export function parsePlan(md: string): Plan
  export function serializePlan(plan: Plan): string
  export function planDigest(plan: Omit<Plan, 'digest'>): string  // SHA-256 über workflow+definitions+context+steps ohne results
  ```

- [ ] **Step 1: Write the failing test** — Round-Trip + Digest-Stabilität.

```ts
import { parsePlan, serializePlan, planDigest } from '../plan-document';
const MD = `# Plan: design-component
<!-- digest: PLACEHOLDER -->

## Schemas
~~~yaml
definitions:
  ComponentResult: { type: object, required: [id], properties: { id: { type: string } } }
~~~

## Context
### ctx:x (source: /abs/rules/x.md)
Regel X Body

## Steps

### Step: component
Context: [ctx:x]

- [ ] create-component — pet-card

  #### Params
  component_id: pet-card

  #### Contract
  ~~~yaml
  outputs:
    component: { required: true, schema: { $ref: '#/definitions/ComponentResult' }, submission: data }
  ~~~

  #### Results
  <!-- pending -->
`;
it('round-trips a plan with shared registries and per-step references', () => {
  const plan = parsePlan(MD);
  expect(plan.workflow).toBe('design-component');
  expect(plan.definitions.ComponentResult).toBeDefined();
  expect(Object.keys(plan.context)).toContain('ctx:x');
  expect(plan.steps[0].name).toBe('component');
  expect(plan.steps[0].context).toEqual(['ctx:x']); // Referenz, kein inlined Body
  expect(plan.steps[0].tasks[0].name).toBe('create-component');
  expect(plan.steps[0].tasks[0].done).toBe(false);
  expect(plan.steps[0].tasks[0].contract.outputs.component.schema).toEqual({ $ref: '#/definitions/ComponentResult' });
  expect(parsePlan(serializePlan(plan))).toEqual(plan);
});
it('digest covers definitions/context/steps but ignores results', () => {
  const plan = parsePlan(MD);
  const d1 = planDigest(plan);
  plan.steps[0].tasks[0].results = { component: { id: 'pet-card' } };
  expect(planDigest(plan)).toBe(d1); // results excluded
  plan.definitions.ComponentResult = { type: 'object' };
  expect(planDigest(plan)).not.toBe(d1); // definitions included
});
```

- [ ] **Step 2: Run** `pnpm --filter storybook-addon-designbook test plan-document` — Expected: FAIL.
- [ ] **Step 3: Implement** Parser (`## Schemas` `definitions:` via js-yaml → `plan.definitions`; `## Context` `### <key> (source: …)` + Body → `plan.context`; `## Steps` `### Step: <name>` + `Context: [keys]`-Referenzen + Checkbox-Tasks mit fenced `~~~yaml` Contract/Params/Results), Serializer (deterministische Reihenfolge), `planDigest` (js-yaml canonical über `{workflow, definitions, context, steps}` mit auf `null` genullten `results` → sha256).
- [ ] **Step 4: Run** wie oben — Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/plan-document.ts packages/storybook-addon-designbook/src/__tests__/plan-document.test.ts
git commit -m "feat(engine): MD-plan parser/serializer with results-excluded digest"
```

---

## Task 5: `workflow done` validiert gegen eingefrorenen Contract (AC-6)

Validiert ein Ergebnis ausschließlich gegen den im Plan eingebetteten Contract; kein Skill-Re-Read; Digest-Prüfung; setzt Checkbox + Results.

**Files:**
- Create: `src/cli/plan.ts`
- Modify: `src/plan-document.ts` (`validateTaskResult`)
- Test: `src/__tests__/plan-document.test.ts`, `src/cli/__tests__/plan.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface TaskValidation { ok: boolean; errors: string[] }
  export function validateTaskResult(
    task: PlanTask,
    result: Record<string, unknown>,
    definitions: Record<string, unknown>,   // plan.definitions, für $ref-Auflösung
  ): TaskValidation
  // cli/plan.ts: register() → `done <plan> --task <name> --data-file <json>`
  ```
- Consumes: AJV (draft-07); Datei-Validators-Registry (bestehend `getValidatorKeys`/`validateByKeys` aus dem alten Store — nach `plan-document.ts` mitnehmen, nicht neu erfinden).

- [ ] **Step 1: Write the failing test**

```ts
it('validateTaskResult resolves $ref against plan.definitions and rejects violations', () => {
  const definitions = { ComponentResult: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } };
  const task: PlanTask = { name: 'create-component', title: 't', done: false, params: {},
    contract: { outputs: { component: { required: true, submission: 'data',
      schema: { $ref: '#/definitions/ComponentResult' } } } }, results: null };
  expect(validateTaskResult(task, { component: {} }, definitions).ok).toBe(false);
  expect(validateTaskResult(task, { component: { id: 'pet-card' } }, definitions).ok).toBe(true);
});
```
Und CLI-Ebene:
```ts
it('done ticks the checkbox and records results on valid input; rejects on digest mismatch', async () => {
  // schreibt Plan-Datei, ruft done mit gültigem data-file → Checkbox [x] + Results gesetzt
  // manipuliert danach den Contract im File → done bricht mit "plan digest mismatch" ab
});
```

- [ ] **Step 2: Run** `pnpm --filter storybook-addon-designbook test plan` — Expected: FAIL.
- [ ] **Step 3: Implement** `validateTaskResult` (AJV mit `plan.definitions` als `#/definitions/*` registriert, dann Output-Schema `$ref`-aufgelöst validieren + Datei-Validators für `direct`); `cli/plan.ts done` liest Plan, prüft `planDigest` gegen den im File eingebetteten Digest, validiert, setzt `task.done=true` + `task.results`, schreibt Plan atomar zurück. Keine Skill-Auflösung.
- [ ] **Step 4: Run** wie oben — Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/plan.ts packages/storybook-addon-designbook/src/plan-document.ts packages/storybook-addon-designbook/src/__tests__/plan-document.test.ts packages/storybook-addon-designbook/src/cli/__tests__/plan.test.ts
git commit -m "feat(cli): workflow done validates against frozen plan contract (AC-6)"
```

---

## Task 6: Plan-Ausführungskommandos + `plan validate` (Autonomie, AC-5)

Vervollständigt die Ausführungsfläche gegen den MD-Plan und die maschinelle Vollständigkeitsprüfung, die fehlende Pflichten mit Quelle meldet.

**Files:**
- Modify: `src/cli/plan.ts` (`steps`, `instructions`, `start`, `block`, `summary`, `validate`)
- Modify: `src/plan-document.ts` (`validatePlanCompleteness`)
- Test: `src/cli/__tests__/plan.test.ts`, `src/__tests__/plan-document.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface MissingObligation { source: string; obligation: string }
  export interface CompletenessReport { ok: boolean; missing: MissingObligation[] }
  export function validatePlanCompleteness(plan: Plan): CompletenessReport
  ```
- Obligation-Deklaration: eine Intake-Regel deklariert im Frontmatter `intake_obligation: <text>` und optional `requires_task: <task-name>`; `validatePlanCompleteness` prüft, dass jede in der Plan-Herkunft referenzierte Pflichtregel ihren geforderten Task/Result im Plan hat.

- [ ] **Step 1: Write the failing test** — fehlende Pflicht wird mit Quelle gemeldet.

```ts
it('validatePlanCompleteness reports a missing obligation with source', () => {
  const plan = parsePlan(PLAN_MISSING_PUBLISH); // Plan ohne den Pflicht-Task publish-capture
  const report = validatePlanCompleteness(plan);
  expect(report.ok).toBe(false);
  expect(report.missing).toContainEqual(
    expect.objectContaining({ source: expect.stringMatching(/publish-capture/), obligation: expect.any(String) }),
  );
});
it('validatePlanCompleteness passes for a complete plan', () => {
  expect(validatePlanCompleteness(parsePlan(PLAN_COMPLETE)).ok).toBe(true);
});
```

- [ ] **Step 2: Run** `pnpm --filter storybook-addon-designbook test plan` — Expected: FAIL.
- [ ] **Step 3: Implement** `validatePlanCompleteness` + `plan validate <plan>` (emittiert `CompletenessReport` JSON, exit 1 bei `ok:false`); `steps`/`instructions`/`start`/`block`/`summary` lesen den Plan (Checkbox-State, eingebetteten Kontext) ohne Discovery.
- [ ] **Step 4: Run** wie oben — Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/plan.ts packages/storybook-addon-designbook/src/plan-document.ts packages/storybook-addon-designbook/src/cli/__tests__/plan.test.ts packages/storybook-addon-designbook/src/__tests__/plan-document.test.ts
git commit -m "feat(cli): plan validate reports missing obligations with source (AC-5)"
```

---

## Task 7: Alte Engine-Module löschen (AC-8)

Entfernt Katalog/Create/YAML-Definition ersatzlos.

**Files:**
- Delete: `src/workflow-resolve.ts`, `src/planning-schema.ts`, `src/schema-block.ts`, `src/workflow-schema-merge.ts`, `src/planning-contracts.ts`, `src/planning-sources.ts` (Rest nach Matcher-Extraktion), `src/workflow-document.ts`, `src/workflow-store.ts`, `src/workflow-steps.ts`, `src/workflow-summary.ts`
- Delete: zugehörige Tests `src/__tests__/{workflow-document,workflow-steps,workflow-summary}.test.ts`, `src/cli/__tests__/{workflow-definitions,workflow-config}.test.ts` sowie `planning-catalogue-contract`, `planning-contracts`, `workflow-planning-contract`, `plugin-skills-discovery` (soweit sie gelöschte Symbole testen — Matcher-relevante Teile nach `intake-resolve.test.ts` retten)
- Modify: `src/cli/workflow.ts` → in `src/cli/plan.ts` aufgehen; `src/cli.ts` Registrierungen bereinigen; `src/index.ts`/Barrel-Exports.
- Modify: `src/cli/runbook.ts` + `runbook/*` — falls sie den gelöschten Resolver konsumieren, auf `intake-resolve` umstellen oder mitlöschen (entscheidet der Implementierer nach Konsum-Prüfung; im Zweifel löschen, kein Katalogpfad überlebt).

- [ ] **Step 1: Grep-Konsumprüfung** — `git grep -n "workflow-resolve\|planning-\|workflow-document\|workflow-store\|workflow-steps\|discoverWorkflow\|createDocument"` — jede Fundstelle entweder auf den neuen Vertrag umstellen oder mitlöschen.
- [ ] **Step 2: Dateien + Tests löschen** (Liste oben).
- [ ] **Step 3: Barrel/Registrierungen bereinigen** — `cli.ts`, `index.ts`.
- [ ] **Step 4: Run** `pnpm --filter storybook-addon-designbook typecheck` — Expected: keine Referenzen auf gelöschte Symbole; grün.
- [ ] **Step 5: Commit**

```bash
git add -A packages/storybook-addon-designbook/src
git commit -m "refactor(engine): remove catalogue/create/YAML-definition path (AC-8)"
```

---

## Task 8: Panel auf Log-Ausgabe reduzieren

**Files:**
- Modify/Delete: Panel-UI-Komponenten (Tabs, Katalog-/Definition-Ansichten) unter `src/` bzw. `src/manager*`/Addon-Register — nur eine Log-Ansicht bleibt.
- Test: bestehende Addon-Tests anpassen/entfernen.

- [ ] **Step 1: Konsumprüfung** — `git grep -n "addPanel\|Tab\|catalogue\|definition" packages/storybook-addon-designbook/src` auf Panel-Ebene; identifiziere die Panel-Registrierung.
- [ ] **Step 2: Reduziere** die Panel-Registrierung auf eine einzige Logs-Ansicht; entferne Tabs + Katalog/Definition-UI + zugehörigen toten Code.
- [ ] **Step 3: Run** `pnpm --filter storybook-addon-designbook typecheck && pnpm --filter storybook-addon-designbook lint` — Expected: grün.
- [ ] **Step 4: Commit**

```bash
git add -A packages/storybook-addon-designbook/src
git commit -m "refactor(addon): reduce panel to logs-only view"
```

---

## Task 9: Skills auf `intake`+MD-Plan umstellen + Mixed-Responsibility ordnen

**Files:**
- Modify: `.agents/skills/designbook/resources/{cli-workflow,workflow-building,workflow-execution}.md`, `.agents/skills/designbook/SKILL.md`, `.agents/skills/designbook/skills/execute-workflow/SKILL.md`, jeder `skills/<wf>/resources/intake.md`
- Modify: `.agents/skills/designbook/design/rules/{website,storybook}-capture-observations.md` (+ deren Intake-Planungsanteil in Intake-Kontext, Ausführungsanteil bleibt)
- Modify: `.agents/skills/designbook/skills/*/workflows/*.md` (Frontmatter `intake.open_selectors` wo nötig)

- [ ] **Step 1: `designbook-skill-creator` laden** (Pflicht vor jeder Änderung an diesen Dateien) und die passenden per-file-type Rules (rule-files/workflow-files/writing-files/common-rules).
- [ ] **Step 2: cli-workflow/workflow-building/workflow-execution** auf den neuen Befehlsfluss umschreiben: erste Aktion `intake <workflow>`; Plan als MD schreiben; Ausführung via `workflow done <plan> --task …`. Discover/create/validate-Katalog entfernen.
- [ ] **Step 3: Mixed-Responsibility** in den beiden capture-observations-Rules trennen: Planungsprosa → Intake-Kontext (getaggt `<wf>:intake`/Domain), Ausführungskommandos bleiben als Execution-Rule. Prüfe zusätzlich `playwright-validate.md`.
- [ ] **Step 4: Verify Authoring** — `designbook-skill-creator` validate-Workflow über die geänderten Dateien (WHAT-vs-HOW, keine `params:` in Rules/Blueprints, `$ref`-Auflösung).
- [ ] **Step 5: Commit**

```bash
git add -A .agents/skills
git commit -m "refactor(skills): intake+MD-plan contract; order capture planning/execution"
```

---

## Task 10: Vier frische Fälle + `pnpm check` (AC-7)

**Files:**
- Modify/Create: `.agents/skills/designbook-test/` Fixtures/Cases für `design-component`, `extract-reference`, `tokens`, `css-tailwind`
- Verify: end-to-end via `designbook-test`

- [ ] **Step 1: Fixtures** je Fall bereitstellen (fresh workspace), sodass `intake` → MD-Plan → `workflow done` durchläuft.
- [ ] **Step 2: `pnpm check`** (typecheck → lint → test) grün.
- [ ] **Step 3: debo-test** je Fall aus dem Ticket-Worktree: `debo-test run <suite> <case>` (distinct `--workspace` pro parallelem Lauf) — Nachweis: gültiger Plan, Outputs validieren.
- [ ] **Step 4: Evidenz sichern** (Kommando, beobachtetes Ergebnis, Commit) für das review-Handoff.
- [ ] **Step 5: Commit**

```bash
git add -A .agents/skills/designbook-test
git commit -m "test(engine): fresh cases for design-component, extract-reference, tokens, css-tailwind (AC-7)"
```

---

## Self-Review

**Spec coverage:**
- AC-1 (Verantwortlichkeiten/Datenfluss/Verträge) → Spec + Tasks 1–6 Interfaces.
- AC-2 (CLI liefert Intake-Regeln/Blueprints; Metadaten/Domain abgedeckt; keine ausführbaren Intake-Tasks) → Tasks 1, 3.
- AC-3 (Matching-Kombinationen; offener Kontext ≠ vollständig) → Tasks 1, 2.
- AC-4 (kanonischer Inhalt+Herkunft+Leseauftrag) → Task 1 (`ContextEntry.source`, geteilte `context`-Registry, `IntakeStep.read_order`).
- AC-5 (fehlende Pflicht mit Quelle; kein gelesen-Flag) → Task 6 (`validatePlanCompleteness`).
- AC-6 (Ausführung ohne Discovery; Digest) → Tasks 4, 5.
- AC-7 (frische Fälle; pnpm check grün) → Task 10.
- AC-8 (keine Migration; direkte Umstellung) → Tasks 7, 8, 9.

**Placeholder scan:** Keine „TBD/TODO"; die einzige bewusste Implementierer-Entscheidung ist die Runbook-Konsumprüfung (Task 7 Step 1/Modify) und die Panel-Komponentenlokalisierung (Task 8 Step 1) — beide mit konkretem grep-Einstieg statt offenem Platzhalter.

**Type consistency:** `IntakeContext`/`EmbeddedContent`/`ContextEntry`/`IntakeStep`/`OpenSelector`/`GatedGroup` (Tasks 1–2), `Plan`/`PlanStep`/`PlanTask`/`OutputContract`/`planDigest` mit geteilten `definitions`- und `context`-Registries plus Per-Step-`context`-Referenzen (Task 4), `validateTaskResult`/`TaskValidation` mit `definitions`-Parameter (Task 5), `validatePlanCompleteness`/`CompletenessReport`/`MissingObligation` (Task 6) sind über alle Tasks konsistent benannt. `ContextEntry` ist in `intake-resolve.ts` (Task 1) und `plan-document.ts` (Task 4) formgleich.
