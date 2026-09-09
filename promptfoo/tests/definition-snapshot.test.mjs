import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  readdir,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  recordDefinitionSnapshot,
  auditDefinitionSnapshots,
} from "../scripts/definition-snapshots.mjs";

test("audit rejects missing workflows and replacements even when local before files agree", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "snapshot-audit-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, "tasks.yml");
  const snapshots = join(directory, "snapshots");
  const document = {
    definition: { id: "main" },
    state: { created_at: "first" },
  };
  recordDefinitionSnapshot(path, document, snapshots);
  assert.deepEqual(
    auditDefinitionSnapshots([{ path, document }], snapshots),
    [],
  );
  assert.match(auditDefinitionSnapshots([], snapshots)[0].error, /disappeared/);
  const replaced = structuredClone(document);
  replaced.state.created_at = "second";
  assert.match(
    auditDefinitionSnapshots([{ path, document: replaced }], snapshots)[0]
      .error,
    /replaced/,
  );
  replaced.state.created_at = "first";
  replaced.definition.id = "changed";
  assert.match(
    auditDefinitionSnapshots([{ path, document: replaced }], snapshots)[0]
      .error,
    /definition changed/,
  );
  assert.match(
    auditDefinitionSnapshots(
      [{ path: join(directory, "other.yml"), document }],
      snapshots,
    )[0].error,
    /Missing/,
  );
});

test("external snapshot survives deletion and recreation of a workspace workflow", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "definition-snapshot-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const workspace = join(root, "workspace");
  const snapshots = join(root, "evidence", "definitions");
  await mkdir(workspace);
  const path = join(workspace, "tasks.yml");
  const original = {
    definition: { id: "main", title: "Original" },
    state: { created_at: "2026-09-07T12:00:00Z" },
  };
  await writeFile(path, JSON.stringify(original));
  const snapshot = () =>
    spawnSync(
      process.execPath,
      [resolve("promptfoo/scripts/snapshot-definition.mjs"), path],
      {
        encoding: "utf8",
        env: { ...process.env, DESIGNBOOK_DEFINITION_SNAPSHOTS: snapshots },
      },
    );
  assert.equal(snapshot().status, 0);
  const [file] = await readdir(snapshots);
  const saved = JSON.parse(await readFile(join(snapshots, file), "utf8"));
  assert.deepEqual(saved.definition, original.definition);
  assert.equal(saved.path, path);
  assert.equal(saved.createdAt, original.state.created_at);
  await rm(join(workspace, "definition-before.yml"));
  await rm(path);
  await writeFile(
    path,
    JSON.stringify({
      ...original,
      definition: { id: "main", title: "Replaced" },
    }),
  );
  const replacement = snapshot();
  assert.notEqual(replacement.status, 0);
  assert.match(replacement.stderr, /snapshot|EEXIST/i);
  assert.deepEqual(
    JSON.parse(await readFile(join(snapshots, file), "utf8")),
    saved,
  );
});
