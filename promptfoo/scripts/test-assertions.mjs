#!/usr/bin/env node
/**
 * Smoke-test assertions against existing workspace data.
 * Reads case files from fixtures/ and tests assertions against workspace artifacts.
 *
 * Usage: node promptfoo/scripts/test-assertions.mjs [case] [--suite <suite>]
 * Example: node promptfoo/scripts/test-assertions.mjs data-model-canvas
 *          node promptfoo/scripts/test-assertions.mjs --suite drupal-stitch
 *          node promptfoo/scripts/test-assertions.mjs  (runs all for default suite)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const yaml = require("js-yaml");

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");

// Parse args
let suite = "drupal-petshop";
let filterCase = null;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--suite" && args[i + 1]) { suite = args[++i]; }
  else if (!args[i].startsWith("-")) { filterCase = args[i]; }
}

const casesDir = join(repoRoot, "fixtures", suite, "cases");
const workspacesDir = join(repoRoot, "promptfoo", "workspaces");

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

const caseFiles = readdirSync(casesDir).filter(f => f.endsWith(".yaml")).sort();

for (const f of caseFiles) {
  const caseName = f.replace(".yaml", "");
  if (filterCase && caseName !== filterCase) continue;

  const caseData = yaml.load(readFileSync(join(casesDir, f), "utf-8"));
  const workspaceDir = join(workspacesDir, `${suite}-${caseName}`);

  try {
    statSync(join(workspaceDir, "designbook"));
  } catch {
    console.log(`\n⏭  ${caseName} — workspace not found, skipping`);
    totalSkip++;
    continue;
  }

  const output = buildOutput(workspaceDir);
  console.log(`\n━━ ${caseName} ━━`);
  console.log(`   Files: ${output.newFiles.length}, Archived: ${Object.keys(output.archivedWorkflows).join(", ") || "(none)"}, Pending: ${Object.keys(output.pendingWorkflows).join(", ") || "(none)"}`);

  for (const assertion of (caseData.assert || [])) {
    if (assertion.type !== "javascript") {
      console.log(`   ⏭  [${assertion.type}] — not testable offline`);
      totalSkip++;
      continue;
    }

    try {
      const code = assertion.value.trim();
      const isExpression = !code.includes('\n') && !code.startsWith('const ') && !code.startsWith('let ') && !code.startsWith('if ') && !code.startsWith('return ');
      const body = isExpression ? `return (${code})` : code;
      const fn = new Function("output", "context", body);
      const result = fn(output, { vars: { suite, case: caseName }, providerResponse: { output } });
      if (result) {
        console.log(`   ✅ ${code.slice(0, 80)}`);
        totalPass++;
      } else {
        console.log(`   ❌ ${code.slice(0, 80)}`);
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
