import { readFileSync } from "node:fs";
import yaml from "js-yaml";
import { evalAssertions } from "../../.agents/skills/designbook-test/resources/eval-score.mjs";

export default function caseResult(output, context) {
  const caseDoc = yaml.load(readFileSync(context.vars.case_file, "utf8"));
  const result = evalAssertions(caseDoc.assert ?? [], output);
  return {
    pass: result.total > 0 && result.passed === result.total,
    score: result.total ? result.passed / result.total : 0,
    reason:
      `${result.passed}/${result.total} case assertions passed` +
      (result.failures.length ? `: ${result.failures.join("; ")}` : ""),
  };
}
