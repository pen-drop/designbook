#!/usr/bin/env node
import {
  existsSync,
  readFileSync,
  readdirSync,
  mkdirSync,
  mkdtempSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import yaml from "js-yaml";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const opts = { suite: "drupal-petshop", phase: "main" };
const extra = [];
for (let i = 0; i < args.length; i++) {
  const key = args[i].replace(/^--/, "");
  if (
    [
      "suite",
      "workspace",
      "output",
      "phase",
      "prompt-file",
      "validate",
      "history",
    ].includes(key)
  ) {
    if (!args[i + 1] || args[i + 1].startsWith("--"))
      throw new Error(`Missing value for --${key}`);
    opts[key] = args[++i];
  } else if (["--list", "--config-only"].includes(args[i])) opts[key] = true;
  else if (!opts.case && !args[i].startsWith("-")) opts.case = args[i];
  else extra.push(args[i]);
}
const cases = join(repo, "fixtures", opts.suite, "cases");
if (opts.list || !opts.case) {
  console.log(
    readdirSync(cases)
      .filter((f) => f.endsWith(".yaml"))
      .map((f) => f.slice(0, -5))
      .join("\n"),
  );
  process.exit(0);
}
if (!["main", "verify"].includes(opts.phase))
  throw new Error("phase must be main or verify");
if (opts.phase === "verify" && (!opts.workspace || !opts["prompt-file"])) {
  throw new Error(
    "Verification needs --workspace and --prompt-file, and preserves the main artifacts",
  );
}
const caseDoc = yaml.load(
  readFileSync(join(cases, `${opts.case}.yaml`), "utf8"),
);
const base = yaml.load(
  readFileSync(join(repo, "promptfoo/configs/base.yaml"), "utf8"),
);
const requestedOutput = resolve(
  repo,
  opts.output ||
    `promptfoo/reports/${opts.suite}-${opts.case}-${opts.phase}.json`,
);
mkdirSync(dirname(requestedOutput), { recursive: true });
const runDir = mkdtempSync(
  join(dirname(requestedOutput), `${opts.case}-${opts.phase}-`),
);
const output = opts.output ? requestedOutput : join(runDir, "report.json");
if (existsSync(output))
  throw new Error(
    `Report already exists: ${output}; choose a fresh --output path`,
  );
const workspace = resolve(
  repo,
  opts.workspace || `promptfoo/workspaces/${opts.suite}-${opts.case}`,
);
let prompt = opts["prompt-file"]
  ? readFileSync(resolve(repo, opts["prompt-file"]), "utf8")
  : caseDoc.prompt;
if (typeof prompt !== "string" || !prompt.trim())
  throw new Error("Case needs a nonempty prompt");
const workflowId =
  opts.phase === "main" ? opts.case : opts.validate || "design-verify";
prompt = prompt.replaceAll("{{workspace}}", workspace);
prompt += `\nUse ${JSON.stringify(workflowId)} as the primary saved workflow definition.id for this phase.`;
prompt +=
  "\nRun all Designbook CLI commands from the workspace root with its designbook.config.yml.\n" +
  `After workflow create returns the saved tasks.yml path, run node ${JSON.stringify(join(repo, "promptfoo/scripts/snapshot-definition.mjs"))} <saved-tasks.yml> before execute-workflow. This helper saves the unchanged definition beside tasks.yml. ` +
  "Execute the saved path through execute-workflow. Report every saved path, failure, retry and unanswered input. " +
  "If required inputs are missing, record the failure and end the run; this test has no interactive user.";
const providers = base.providers.map((p) => ({
  ...p,
  id: `file://${resolve(repo, "promptfoo/configs", p.id.slice(7))}`,
  config: { ...p.config, evidenceDir: join(runDir, "evidence") },
}));
const assertions =
  opts.phase === "main"
    ? [...(caseDoc.assert || [])]
    : [
        {
          type: "javascript",
          value: `Object.values(output.completedWorkflows).some(w => w.definition.id === ${JSON.stringify(workflowId)})`,
        },
      ];
assertions.push(
  { type: "javascript", value: "output.workflowErrors.length === 0" },
  {
    type: "javascript",
    value: "Object.keys(output.pendingWorkflows).length === 0",
  },
  { type: "javascript", value: "output.usage != null" },
  { type: "javascript", value: "output.definitionUnchanged === true" },
);
const config = {
  description: `${opts.suite}/${opts.case}: ${opts.phase}`,
  outputPath: output,
  extensions: [
    `file://${join(repo, "promptfoo/extensions/result-history.mjs")}:afterAll`,
  ],
  tags: {
    suite: opts.suite,
    case: opts.case,
    phase: opts.phase,
    history_csv: resolve(repo, opts.history || "promptfoo/results.csv"),
    report: relative(repo, output),
    model: providers[0].config.model,
    git_commit: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repo,
      encoding: "utf8",
    }).trim(),
    source_dirty: String(
      Boolean(
        execFileSync(
          "git",
          [
            "status",
            "--porcelain",
            "--",
            ".agents/skills",
            "promptfoo/providers",
            "promptfoo/scripts",
            "promptfoo/extensions",
            "promptfoo/configs",
            "packages",
            "scripts",
          ],
          { cwd: repo, encoding: "utf8" },
        ).trim(),
      ),
    ),
  },
  prompts: [prompt],
  providers,
  evaluateOptions: { ...base.evaluateOptions, maxConcurrency: 1 },
  tests: [
    {
      vars:
        opts.phase === "main"
          ? { suite: opts.suite, case: opts.case, workspace }
          : { workspace },
      assert: assertions,
    },
  ],
};
const configPath = join(runDir, "promptfooconfig.yaml");
writeFileSync(configPath, yaml.dump(config, { lineWidth: 120, noRefs: true }));
console.log(configPath);
if (!opts["config-only"]) {
  const child = spawnSync(
    "pnpm",
    ["exec", "promptfoo", "eval", "-c", configPath, "--no-cache", ...extra],
    {
      cwd: repo,
      stdio: "inherit",
    },
  );
  if (child.error) throw child.error;
  process.exit(child.status ?? 1);
}
