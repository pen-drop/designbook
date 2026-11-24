#!/usr/bin/env node
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { loadExperimentFile, validateExperiment } from "../experiments/schema.mjs";
import { generateComparisonReport } from "../experiments/report.mjs";
import { writeJudgment } from "../experiments/judge.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function usage(exit = 1) {
  console.error(`Usage:
  node promptfoo/scripts/experiment-cli.mjs validate <path-to-experiment.yml>
  node promptfoo/scripts/experiment-cli.mjs report <experiment-id>
  node promptfoo/scripts/experiment-cli.mjs judge <evidence-run> --result <img> --reference <img> --status pass|fail|unclear|rejected --criteria <text> [--blind] [--rationale <text>] [--evaluator <name>]
`);
  process.exit(exit);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--blind") {
      out.blind = true;
    } else if (a.startsWith("--")) {
      out[a.slice(2)] = argv[++i];
    } else {
      out._.push(a);
    }
  }
  return out;
}

async function scanExperimentDirs(base, experimentId, { allowUnderscore = false } = {}) {
  const entries = await readdir(base, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    if (!allowUnderscore && ent.name.startsWith("_")) continue;
    const path = join(base, ent.name, "experiment.yml");
    try {
      const doc = yaml.load(await readFile(path, "utf8"));
      if (doc?.id === experimentId || doc?.primary_key?.experiment === experimentId) {
        return join(base, ent.name);
      }
    } catch {
      /* skip */
    }
  }
  return null;
}

async function findExperimentDir(experimentId) {
  const base = join(repoRoot, "docs/experiments");
  const direct = join(base, experimentId);
  try {
    await readFile(join(direct, "experiment.yml"), "utf8");
    return direct;
  } catch {
    /* scan */
  }
  const found = await scanExperimentDirs(base, experimentId);
  if (found) return found;
  const fixtures = join(base, "_fixtures");
  try {
    const under = join(fixtures, experimentId);
    await readFile(join(under, "experiment.yml"), "utf8");
    return under;
  } catch {
    /* scan fixture stubs */
  }
  return scanExperimentDirs(fixtures, experimentId, { allowUnderscore: true });
}

async function cmdValidate(path) {
  const result = await loadExperimentFile(resolve(path));
  if (!result.ok) {
    console.error("INVALID");
    for (const err of result.errors) console.error(`- ${err}`);
    process.exit(1);
  }
  console.log(`OK ${result.doc.id} ticket=${result.doc.ticket}`);
}

async function cmdReport(experimentId) {
  const docsDir = await findExperimentDir(experimentId);
  if (!docsDir) {
    console.error(`experiment not found: ${experimentId}`);
    process.exit(1);
  }
  const loaded = await loadExperimentFile(join(docsDir, "experiment.yml"));
  if (!loaded.ok) {
    console.error("INVALID experiment.yml");
    for (const err of loaded.errors) console.error(`- ${err}`);
    process.exit(1);
  }

  let runs = [];
  const runsPath = join(docsDir, "runs.json");
  try {
    runs = JSON.parse(await readFile(runsPath, "utf8"));
  } catch {
    runs = [];
  }

  const md = await generateComparisonReport({
    experiment: loaded.doc,
    docsDir,
    runs,
  });
  console.log(`Wrote ${join(docsDir, "comparison.md")} (${md.length} bytes)`);
}

async function cmdJudge(evidenceRun, opts) {
  const root = resolve(evidenceRun);
  await mkdir(root, { recursive: true });
  const path = await writeJudgment(root, {
    status: opts.status,
    resultImage: resolve(opts.result),
    referenceImage: resolve(opts.reference),
    criteria: opts.criteria || "",
    rationale: opts.rationale || "",
    evaluator: opts.evaluator,
    blind: Boolean(opts.blind),
  });
  console.log(`Wrote ${path}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd, target] = args._;
  if (!cmd) usage(0);

  if (cmd === "validate") {
    if (!target) usage();
    await cmdValidate(target);
    return;
  }
  if (cmd === "report") {
    if (!target) usage();
    await cmdReport(target);
    return;
  }
  if (cmd === "judge") {
    if (!target || !args.result || !args.reference || !args.status || !args.criteria) {
      usage();
    }
    await cmdJudge(target, args);
    return;
  }

  // expose validateExperiment for programmatic smoke
  if (cmd === "check-schema") {
    const doc = yaml.load(await readFile(resolve(target), "utf8"));
    const r = validateExperiment(doc);
    console.log(JSON.stringify(r));
    process.exit(r.ok ? 0 : 1);
  }

  usage();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
