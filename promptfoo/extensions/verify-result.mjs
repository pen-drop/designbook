import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// design-verify writes its deterministic fidelity score to a file
// (`_debo verify score --output …/plans/design-verify.score.json`): { score,
// passed, issue_count, checks }. The harness reads that file rather than the plan,
// since the MD-plan engine no longer stores task results in the plan.
function findScoreFile(root) {
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) stack.push(path);
      else if (entry.name === "design-verify.score.json") return path;
    }
  }
  return null;
}

export default function verifyResult(output, context) {
  const workspace = context?.vars?.workspace;
  const scorePath = workspace && findScoreFile(workspace);
  if (!scorePath)
    return {
      pass: false,
      score: 0,
      reason: "Missing design-verify score file",
    };
  let report;
  try {
    report = JSON.parse(readFileSync(scorePath, "utf8"));
  } catch (error) {
    return { pass: false, score: 0, reason: `Unreadable score file: ${error.message}` };
  }
  if (typeof report.score !== "number")
    return { pass: false, score: 0, reason: "Score file missing numeric score" };
  if (report.passed !== true)
    return {
      pass: false,
      score: report.score,
      reason: `Visual fidelity below its fixed threshold (score ${report.score})`,
    };
  if (context.vars.main_report) {
    const main = JSON.parse(readFileSync(context.vars.main_report, "utf8"))
      .results.results[0].response?.output;
    if (!main?.fileHashes || !Object.keys(main.fileHashes).length)
      return {
        pass: false,
        score: 0,
        reason: "Missing main artifact hash inventory",
      };
    const changed = Object.entries(main.fileHashes).filter(
      ([path, hash]) => output.fileHashes?.[path] !== hash,
    );
    if (changed.length)
      return {
        pass: false,
        score: 0,
        reason: `Verification changed main artifacts: ${changed.map(([path]) => path).join(", ")}`,
      };
  }
  return {
    pass: true,
    score: report.score,
    reason: `Validated comparisons passed (score ${report.score}); main artifacts unchanged`,
  };
}
