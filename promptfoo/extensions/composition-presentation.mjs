import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { compositionPresentation } from "../providers/native-presentation.mjs";

const WRITING = new Set([
  "design-entity",
  "design-component",
  "design-screen",
  "design-shell",
]);

function eventsFrom(evidenceDir) {
  if (!evidenceDir || !existsSync(evidenceDir)) return [];
  const log = ["codex.jsonl", "claude.jsonl", "grok.jsonl"]
    .map((name) => join(evidenceDir, name))
    .find((path) => existsSync(path));
  if (!log) {
    const found = readdirSync(evidenceDir).find((name) => name.endsWith(".jsonl"));
    if (!found) return [];
    return readFileSync(join(evidenceDir, found), "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
  return readFileSync(log, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function sealedPlan(output, context) {
  const data = context?.vars?.plan_contract?.workflow;
  const pending = output?.pendingWorkflows || {};
  if (data && pending[data]?.path) return pending[data].path;
  const first = Object.values(pending)[0];
  return first?.path || first?.file || output?.plan;
}

export default function compositionPresentationAssert(output, context) {
  const workflow = context?.vars?.plan_contract?.workflow;
  if (workflow && !WRITING.has(workflow))
    return { pass: true, score: 1, reason: "non-writing workflow skips composition presentation" };
  const fail = (reason) => ({ pass: false, score: 0, reason });
  const events = eventsFrom(output?.evidenceDir);
  if (!events.length) return fail("Missing planner native event log");
  const planPath = context?.vars?.composition_plan || sealedPlan(output, context);
  let expected = context?.vars?.composition_tree;
  if (!expected && planPath && existsSync(planPath)) {
    try {
      expected = execFileSync(
        "npx",
        ["storybook-addon-designbook", "plan", "tree", planPath],
        { cwd: output.workspace, encoding: "utf8", timeout: 30000 },
      );
    } catch (err) {
      return fail(`plan tree failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (!expected) return fail("Missing expected composition tree");
  const result = compositionPresentation(events, expected, {
    ask: Boolean(context?.vars?.ask),
  });
  return result.ok
    ? { pass: true, score: 1, reason: "Composition tree presented before plan build" }
    : fail(result.reason);
}
