import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import yaml from "js-yaml";
import {
  initRunEvidence,
  writeEnvelope,
  linkNativeLogs,
  evidenceSurvivesWorkspaceCleanup,
} from "../experiments/evidence-store.mjs";
import { createEnvelope } from "../experiments/envelope.mjs";

test("evidence survives workspace cleanup and envelope identity is present", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "exp-evidence-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const workspaceDir = join(root, "workspaces", "ws-1");
  const evidenceBase = join(root, "evidence");
  await mkdir(workspaceDir, { recursive: true });
  await writeFile(join(workspaceDir, "scratch.txt"), "ephemeral", "utf8");

  const evidenceRoot = await initRunEvidence({
    experimentId: "minimal-fixture",
    runId: "run-abc",
    baseDir: evidenceBase,
  });

  assert.equal(
    evidenceRoot,
    join(evidenceBase, "minimal-fixture", "run-abc"),
  );

  const envelope = createEnvelope({
    experimentId: "minimal-fixture",
    variant: "candidate",
    caseId: "design-shell",
    suite: "drupal-web",
    ticket: "DESIGNBOOK-62",
    commit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    harnessCommit: "cccccccccccccccccccccccccccccccccccccccc",
    workspaceId: "ws-1",
    evidenceRoot,
    runId: "run-abc",
  });
  await writeEnvelope(evidenceRoot, envelope);

  const nativeLog = join(workspaceDir, "provider.jsonl");
  await writeFile(nativeLog, '{"type":"done"}\n', "utf8");
  await linkNativeLogs(evidenceRoot, [nativeLog]);

  const envelopePath = join(evidenceRoot, "envelope.yml");
  const loaded = yaml.load(await readFile(envelopePath, "utf8"));
  assert.equal(loaded.experiment_id, "minimal-fixture");
  assert.equal(loaded.variant, "candidate");
  assert.equal(loaded.ticket, "DESIGNBOOK-62");
  assert.equal(loaded.run_id, "run-abc");
  assert.equal(loaded.commit, "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");

  await access(join(evidenceRoot, "native", "provider.jsonl"));

  await rm(workspaceDir, { recursive: true, force: true });
  const survived = await evidenceSurvivesWorkspaceCleanup(workspaceDir, evidenceRoot);
  assert.equal(survived, true);
  await access(envelopePath);
  await access(join(evidenceRoot, "native", "provider.jsonl"));
});
