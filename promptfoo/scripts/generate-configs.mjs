#!/usr/bin/env node
/**
 * Generate promptfoo configs from case files in fixtures/.
 * Each case file (fixtures/<suite>/cases/<name>.yaml) becomes a test entry.
 *
 * Usage:
 *   node promptfoo/scripts/generate-configs.mjs [suite]           # generate for a suite (default: drupal-petshop)
 *   node promptfoo/scripts/generate-configs.mjs --list             # list available suites
 *   node promptfoo/scripts/generate-configs.mjs --stdout           # print to stdout
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const fixturesDir = join(repoRoot, "fixtures");
const promptfooDir = join(__dirname, "..");
const configsDir = join(promptfooDir, "configs");

let yaml;
try {
  yaml = await import("js-yaml");
} catch {
  console.error("js-yaml not found. Run: pnpm add -D js-yaml");
  process.exit(1);
}

if (process.argv.includes("--list")) {
  console.log("Available suites:");
  for (const d of readdirSync(fixturesDir, { withFileTypes: true })) {
    if (d.isDirectory()) console.log(`  ${d.name}`);
  }
  process.exit(0);
}

const suite = process.argv.find(a => !a.startsWith("-") && a !== process.argv[0] && a !== process.argv[1]) || "drupal-petshop";
const casesDir = join(fixturesDir, suite, "cases");

let caseFiles;
try {
  caseFiles = readdirSync(casesDir).filter(f => f.endsWith(".yaml")).sort();
} catch {
  console.error(`No cases found for suite '${suite}' at ${casesDir}`);
  process.exit(1);
}

// Load base config for provider settings
const base = yaml.load(readFileSync(join(configsDir, "base.yaml"), "utf-8"));

// Build tests from case files
const tests = [];
for (const f of caseFiles) {
  const caseName = basename(f, ".yaml");
  const caseData = yaml.load(readFileSync(join(casesDir, f), "utf-8"));

  const test = {
    description: `${caseName}: ${suite}`,
    vars: { suite, case: caseName },
    assert: caseData.assert || [],
  };
  tests.push(test);
}

const monolith = {
  description: `Designbook workflow evaluation — ${suite} (generated from case files)`,
  outputPath: `promptfoo/reports/${suite}.json`,
  prompts: ["{{prompt}}"],
  providers: base.providers,
  evaluateOptions: base.evaluateOptions,
  defaultTest: base.defaultTest,
  tests,
};

const output = yaml.dump(monolith, { lineWidth: 120, noRefs: true });

if (process.argv.includes("--stdout")) {
  process.stdout.write(output);
} else {
  const outPath = join(promptfooDir, "promptfooconfig.yaml");
  writeFileSync(outPath, output);
  console.log(`Generated ${tests.length} tests from ${suite} → promptfoo/promptfooconfig.yaml`);
}
