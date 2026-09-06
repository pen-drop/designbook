import { readFileSync } from "node:fs";
import { verificationMetrics } from "./result-history.mjs";

export default function verifyResult(output, context) {
  const measurement = verificationMetrics(output, context.vars.workflow_id);
  if (measurement.score === undefined)
    return {
      pass: false,
      score: 0,
      reason: "Missing or invalid validated verification score-report",
    };
  if (measurement.passed !== measurement.total)
    return {
      pass: false,
      score: measurement.passed / measurement.total,
      reason: "Visual comparisons exceeded their fixed thresholds",
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
    score: 1,
    reason: "Validated comparisons passed; main artifacts unchanged",
  };
}
