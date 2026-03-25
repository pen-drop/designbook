#!/usr/bin/env node
/**
 * Pretty-print a promptfoo report JSON for debugging.
 *
 * Usage: node promptfoo/scripts/show-report.mjs <report.json>
 *        node promptfoo/scripts/show-report.mjs data-model-canvas
 */
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const reportsDir = join(__dirname, "..", "reports");

let reportPath = process.argv[2];
if (!reportPath) {
  console.error("Usage: show-report.mjs <label|path>");
  process.exit(1);
}

// Accept label shorthand: "data-model-canvas" → "promptfoo/reports/data-model-canvas.json"
if (!reportPath.endsWith(".json")) {
  reportPath = join(reportsDir, `${reportPath}.json`);
} else {
  reportPath = resolve(reportPath);
}

let data;
try {
  data = JSON.parse(readFileSync(reportPath, "utf-8"));
} catch (e) {
  console.error(`Cannot read report: ${reportPath}`);
  process.exit(1);
}

const results = data.results?.results || [];
if (results.length === 0) {
  console.log("No results found in report.");
  process.exit(0);
}

for (const r of results) {
  const desc = r.description || "(no description)";
  const success = r.success;
  const banner = success ? "PASS" : "FAIL";

  console.log(`\n${"━".repeat(70)}`);
  console.log(`${banner}  ${desc}`);
  console.log(`${"━".repeat(70)}`);

  // Output summary
  const output = r.response?.output || {};
  if (typeof output === "object") {
    const nf = output.newFiles || [];
    const fc = Object.keys(output.fileContents || {});
    const aw = Object.keys(output.archivedWorkflows || {});
    const pw = Object.keys(output.pendingWorkflows || {});

    console.log(`\n  Output:`);
    console.log(`    newFiles (${nf.length}):  ${nf.join(", ") || "(none)"}`);
    console.log(`    fileContents (${fc.length}): ${fc.join(", ") || "(none)"}`);
    console.log(`    archived: ${aw.join(", ") || "(none)"}`);
    if (pw.length) console.log(`    PENDING:  ${pw.join(", ")}`);

    // Show data-model structure if present
    for (const [path, content] of Object.entries(output.fileContents || {})) {
      if (path.endsWith("data-model.yml") && typeof content === "object") {
        console.log(`\n  ${path} structure:`);
        const c = content.content || content;
        for (const [entityType, bundles] of Object.entries(c)) {
          if (typeof bundles === "object") {
            for (const [bundle, val] of Object.entries(bundles)) {
              const fields = Object.keys(val?.fields || {}).join(", ");
              const vms = Object.keys(val?.view_modes || {}).join(", ");
              console.log(`    ${entityType}.${bundle}: fields=[${fields}] view_modes=[${vms}]`);
            }
          }
        }
      }
    }
  }

  // Assertions
  const components = r.gradingResult?.componentResults || [];
  if (components.length > 0) {
    console.log(`\n  Assertions (${components.filter(c => c.pass).length}/${components.length} passed):`);
    for (const [i, c] of components.entries()) {
      const icon = c.pass ? "✅" : "❌";
      // Extract assertion code (first meaningful line)
      const code = c.assertion?.value?.trim() || "";
      const firstLine = code.split("\n")[0].slice(0, 90);
      console.log(`    ${icon} [${i}] ${firstLine}`);
      if (!c.pass) {
        const reason = c.reason || "";
        // Show just the failure reason, not the full stack
        const shortReason = reason.split("\nStack Trace:")[0].split("\n").slice(0, 2).join(" ");
        console.log(`         ${shortReason}`);
      }
    }
  }

  // Claude output snippet
  if (typeof output === "object" && output.text) {
    console.log(`\n  Claude output (first 300 chars):`);
    console.log(`    ${output.text.slice(0, 300).replace(/\n/g, "\n    ")}`);
  }
}

// Summary
const passed = results.filter(r => r.success).length;
const failed = results.length - passed;
console.log(`\n${"═".repeat(70)}`);
console.log(`Summary: ${passed} passed, ${failed} failed (${results.length} total)`);
console.log(`${"═".repeat(70)}\n`);

process.exit(failed > 0 ? 1 : 0);
