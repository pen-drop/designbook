import test from "node:test";
import assert from "node:assert/strict";
import planArtifacts, {
  planArtifactContract,
} from "../extensions/plan-artifacts.mjs";

test("planning inventory preserves fixtures and ignores skill folders with domain names", () => {
  const config = {
    data: "/work/theme/data",
    "dirs.components": "/work/theme/components",
    "designbook.home": "/work/theme",
  };
  const before = {
    "designbook/tokens.yml": "existing",
    "theme/components/base/base.twig": "existing",
    ".agents/skills/components/task.md": "instructions",
  };
  const context = {
    vars: { plan_artifacts: planArtifactContract("/work", config, before) },
  };
  assert.equal(planArtifacts({ fileHashes: before }, context).pass, true);
  assert.equal(
    planArtifacts(
      { fileHashes: { ...before, "author-plan.py": "scratch" } },
      context,
    ).pass,
    true,
  );
  for (const hashes of [
    { ...before, "theme/components/header/header.twig": "new" },
    { ...before, "designbook/tokens.yml": "modified" },
    { ".agents/skills/components/task.md": "instructions" },
    { ...before, "theme/public/logo.svg": "new" },
  ])
    assert.equal(planArtifacts({ fileHashes: hashes }, context).pass, false);
  assert.equal(planArtifacts({}, context).pass, false);
});
