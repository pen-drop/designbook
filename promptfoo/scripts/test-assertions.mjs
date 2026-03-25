#!/usr/bin/env node
/**
 * Smoke-test assertions against existing workspace data.
 * Simulates what the provider returns and runs each assertion.
 *
 * Usage: node promptfoo/scripts/test-assertions.mjs [label]
 * Example: node promptfoo/scripts/test-assertions.mjs data-model-canvas
 *          node promptfoo/scripts/test-assertions.mjs  (runs all with existing workspaces)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const yaml = require("js-yaml");

const __dirname = dirname(fileURLToPath(import.meta.url));
const promptfooDir = join(__dirname, "..");
const configsDir = join(promptfooDir, "configs");
const filterLabel = process.argv[2];

// Load all single-workflow configs from configs/ (exclude chain.yaml)
const configFiles = readdirSync(configsDir)
  .filter(f => f.endsWith(".yaml") && f !== "chain.yaml" && f !== "base.yaml")
  .sort();

const configs = configFiles.map(f => yaml.load(readFileSync(join(configsDir, f), "utf-8")));

// Merge into a single config shape for processing
const config = {
  prompts: configs.flatMap(c => c.prompts || []),
  tests: configs.flatMap(c => c.tests || []),
};

// Build prompt lookup
const promptsByRef = new Map();
for (const p of config.prompts) {
  if (p.label) promptsByRef.set(p.label, p);
  if (p.id) promptsByRef.set(p.id, p);
}

function walkDir(dir, baseDir) {
  const results = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relPath = relative(baseDir, fullPath);
      if (entry.isDirectory()) {
        results.push(...walkDir(fullPath, baseDir));
      } else if (entry.isFile()) {
        try {
          const s = statSync(fullPath);
          results.push({ path: relPath, size: s.size });
        } catch {
          results.push({ path: relPath, size: 0 });
        }
      }
    }
  } catch { /* dir doesn't exist */ }
  return results;
}

function buildOutput(workspaceDir) {
  const designbookDir = join(workspaceDir, "designbook");
  const allFiles = walkDir(designbookDir, workspaceDir);

  const newFiles = allFiles
    .filter(f => !f.path.startsWith("designbook/workflows/"))
    .map(f => f.path);

  const fileContents = {};
  for (const filePath of newFiles) {
    const fullPath = join(workspaceDir, filePath);
    try {
      const s = statSync(fullPath);
      if (s.size > 0 && s.size <= 8192) {
        const raw = readFileSync(fullPath, "utf-8");
        if (/\.(yml|yaml)$/.test(filePath)) {
          try { fileContents[filePath] = yaml.load(raw); } catch { fileContents[filePath] = raw; }
        } else {
          fileContents[filePath] = raw;
        }
      }
    } catch { /* skip */ }
  }

  const archivedWorkflows = {};
  const archiveDir = join(designbookDir, "workflows", "archive");
  const archiveFiles = walkDir(archiveDir, workspaceDir);
  for (const f of archiveFiles.filter(f => f.path.endsWith("tasks.yml"))) {
    try {
      const parsed = yaml.load(readFileSync(join(workspaceDir, f.path), "utf-8"));
      if (parsed?.workflow) archivedWorkflows[parsed.workflow] = parsed;
    } catch { /* skip */ }
  }

  const pendingWorkflows = {};
  const changesDir = join(designbookDir, "workflows", "changes");
  const changesFiles = walkDir(changesDir, workspaceDir);
  for (const f of changesFiles.filter(f => f.path.endsWith("tasks.yml"))) {
    try {
      const parsed = yaml.load(readFileSync(join(workspaceDir, f.path), "utf-8"));
      if (parsed?.workflow) pendingWorkflows[parsed.workflow] = parsed;
    } catch { /* skip */ }
  }

  return {
    text: "(simulated — no Claude output)",
    newFiles,
    archivedWorkflows,
    pendingWorkflows,
    fileContents,
  };
}

let totalPass = 0, totalFail = 0, totalSkip = 0;

for (const test of config.tests) {
  const promptRef = test.prompts?.[0];
  const prompt = promptsByRef.get(promptRef);
  const label = prompt?.label || prompt?.id || promptRef;

  if (filterLabel && label !== filterLabel) continue;

  const workspaceDir = test.vars?.workspace;
  if (!workspaceDir) { totalSkip++; continue; }

  const absWorkspace = join(process.cwd(), workspaceDir);
  try {
    statSync(join(absWorkspace, "designbook"));
  } catch {
    console.log(`\n⏭  ${test.description} — workspace not found, skipping`);
    totalSkip++;
    continue;
  }

  const output = buildOutput(absWorkspace);
  console.log(`\n━━ ${test.description} ━━`);
  console.log(`   Files: ${output.newFiles.length}, Archived: ${Object.keys(output.archivedWorkflows).join(", ") || "(none)"}, Pending: ${Object.keys(output.pendingWorkflows).join(", ") || "(none)"}`);

  for (const assertion of (test.assert || [])) {
    if (assertion.type !== "javascript") {
      console.log(`   ⏭  [${assertion.type}] — not testable offline`);
      totalSkip++;
      continue;
    }

    try {
      // promptfoo wraps multiline values as function body, not expression
      const code = assertion.value.trim();
      const isExpression = !code.includes('\n') && !code.startsWith('const ') && !code.startsWith('let ') && !code.startsWith('if ') && !code.startsWith('return ');
      const body = isExpression ? `return (${code})` : code;
      const fn = new Function("output", "context", body);
      const result = fn(output, { vars: test.vars, providerResponse: { output } });
      if (result) {
        console.log(`   ✅ ${assertion.value.trim().slice(0, 80)}`);
        totalPass++;
      } else {
        console.log(`   ❌ ${assertion.value.trim().slice(0, 80)}`);
        totalFail++;
      }
    } catch (err) {
      console.log(`   💥 ${assertion.value.trim().slice(0, 80)}`);
      console.log(`      Error: ${err.message}`);
      totalFail++;
    }
  }
}

console.log(`\n━━ Summary ━━`);
console.log(`✅ ${totalPass} passed, ❌ ${totalFail} failed, ⏭ ${totalSkip} skipped`);
process.exit(totalFail > 0 ? 1 : 0);
