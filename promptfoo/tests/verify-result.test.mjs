import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import verifyResult from "../extensions/verify-result.mjs";

test("reads the skill score path and preserves fidelity and artifact gates", () => {
  const workspace = mkdtempSync(join(tmpdir(), "verify-result-"));
  try {
    const context = { vars: { workspace } };
    assert.equal(verifyResult({}, context).pass, false);
    mkdirSync(join(workspace, "designbook"));
    const score = join(workspace, "designbook/verify-score.json");
    writeFileSync(
      score,
      JSON.stringify({ score: 0, passed: true, checks: [] }),
    );
    assert.equal(verifyResult({}, context).pass, true);
    writeFileSync(
      score,
      JSON.stringify({ score: 4, passed: false, checks: [] }),
    );
    assert.equal(verifyResult({}, context).pass, false);
    writeFileSync(
      score,
      JSON.stringify({ score: 0, passed: true, checks: [] }),
    );
    const main = join(workspace, "main.json");
    writeFileSync(
      main,
      JSON.stringify({
        results: {
          results: [
            {
              response: {
                output: { fileHashes: { "component.twig": "original" } },
              },
            },
          ],
        },
      }),
    );
    context.vars.main_report = main;
    assert.equal(
      verifyResult({ fileHashes: { "component.twig": "changed" } }, context)
        .pass,
      false,
    );
    assert.equal(
      verifyResult({ fileHashes: { "component.twig": "original" } }, context)
        .pass,
      true,
    );
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
