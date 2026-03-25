#!/usr/bin/env node
/**
 * Assemble a monolithic promptfoo config from individual configs in configs/.
 * Useful for running all single-workflow tests in one `promptfoo eval` call.
 *
 * Usage:
 *   node promptfoo/scripts/generate-configs.mjs            # write promptfoo/promptfooconfig.yaml
 *   node promptfoo/scripts/generate-configs.mjs --list      # list available configs
 *   node promptfoo/scripts/generate-configs.mjs --stdout     # print to stdout
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const promptfooDir = join(__dirname, "..");
const configsDir = join(promptfooDir, "configs");

let yaml;
try {
  yaml = await import("js-yaml");
} catch {
  console.error("js-yaml not found. Run: pnpm add -D js-yaml");
  process.exit(1);
}

// Load base config for shared settings (providers, evaluateOptions, defaultTest)
const base = yaml.load(readFileSync(join(configsDir, "base.yaml"), "utf-8"));

// Discover all single-workflow configs (exclude base.yaml, chain.yaml)
const configFiles = readdirSync(configsDir)
  .filter(f => f.endsWith(".yaml") && f !== "chain.yaml" && f !== "base.yaml")
  .sort();

if (process.argv.includes("--list")) {
  console.log("Available single configs:");
  for (const f of configFiles) {
    const label = basename(f, ".yaml");
    console.log(`  ${label}  →  promptfoo/configs/${f}`);
  }
  console.log(`\nChain config:  promptfoo/configs/chain.yaml`);
  process.exit(0);
}

// Load all workflow configs
const configs = configFiles.map(f => yaml.load(readFileSync(join(configsDir, f), "utf-8")));

if (configs.length === 0) {
  console.error("No configs found in promptfoo/configs/");
  process.exit(1);
}

// Collect all prompts (deduplicate by id)
const promptMap = new Map();
for (const c of configs) {
  for (const p of c.prompts || []) {
    promptMap.set(p.id, p);
  }
}

// Collect all tests
const allTests = configs.flatMap(c => c.tests || []);

// Fix provider paths back to root-relative (base uses ../ since it's in configs/)
const fixPath = (p) => ({
  ...p,
  id: p.id?.replace("file://../providers/", "file://providers/"),
});

const monolith = {
  description: "Designbook workflow evaluation suite (assembled from configs/)",
  outputPath: configs[0]?.outputPath,
  prompts: [...promptMap.values()].map(p => ({ ...p })),
  providers: (base.providers || []).map(fixPath),
  evaluateOptions: base.evaluateOptions,
  defaultTest: base.defaultTest
    ? {
        ...base.defaultTest,
        options: base.defaultTest.options
          ? {
              ...base.defaultTest.options,
              provider: base.defaultTest.options.provider
                ? fixPath(base.defaultTest.options.provider)
                : undefined,
            }
          : undefined,
      }
    : undefined,
  tests: allTests.map(t => ({ ...t })),
};

const output = yaml.dump(monolith, { lineWidth: 120, noRefs: true });

if (process.argv.includes("--stdout")) {
  process.stdout.write(output);
} else {
  const outPath = join(promptfooDir, "promptfooconfig.yaml");
  writeFileSync(outPath, output);
  console.log(`Assembled ${configs.length} configs → promptfoo/promptfooconfig.yaml (${allTests.length} tests)`);
}
