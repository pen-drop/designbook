import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

export function recordDefinitionSnapshot(path, document, directory) {
  path = resolve(path);
  if (!document?.definition || typeof document.state?.created_at !== "string")
    throw new Error(
      "Definition snapshot requires a saved workflow and creation time",
    );
  mkdirSync(directory, { recursive: true });
  const key = createHash("sha256").update(path).digest("hex");
  const snapshot = {
    path,
    createdAt: document.state.created_at,
    definition: document.definition,
  };
  writeFileSync(
    join(directory, `${key}.json`),
    JSON.stringify(snapshot, null, 2) + "\n",
    { flag: "wx" },
  );
}

export function snapshotExistingDefinitions(workflows, directory) {
  mkdirSync(directory, { recursive: true });
  for (const { path, document, error } of workflows) {
    if (error) continue;
    const key = createHash("sha256").update(resolve(path)).digest("hex");
    if (!existsSync(join(directory, `${key}.json`)))
      recordDefinitionSnapshot(path, document, directory);
  }
}

export function auditDefinitionSnapshots(workflows, directory) {
  const errors = [];
  const snapshots = new Map();
  try {
    for (const file of readdirSync(directory)) {
      const snapshot = JSON.parse(readFileSync(join(directory, file), "utf8"));
      if (
        !snapshot.path ||
        !snapshot.createdAt ||
        !snapshot.definition ||
        snapshots.has(snapshot.path)
      )
        throw new Error(`Invalid or duplicate definition snapshot: ${file}`);
      snapshots.set(snapshot.path, snapshot);
    }
  } catch (error) {
    return [
      {
        path: directory,
        error: `Missing or invalid external definition snapshots: ${error.message}`,
      },
    ];
  }
  for (const { path, document } of workflows) {
    const snapshot = snapshots.get(resolve(path));
    if (!snapshot)
      errors.push({ path, error: "Missing external definition snapshot" });
    else if (
      snapshot.createdAt !== document?.state?.created_at ||
      !isDeepStrictEqual(snapshot.definition, document?.definition)
    )
      errors.push({
        path,
        error:
          "Workflow was replaced or its definition changed after the external snapshot",
      });
    snapshots.delete(resolve(path));
  }
  for (const path of snapshots.keys())
    errors.push({ path, error: "Previously snapshotted workflow disappeared" });
  return errors;
}
