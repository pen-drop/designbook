import { copyFile, mkdir, writeFile, access, rm } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import yaml from "js-yaml";

const DEFAULT_BASE = "promptfoo/evidence";

/**
 * Create durable evidence root for one run.
 * Layout: <base>/<experimentId>/<runId>/
 */
export async function initRunEvidence({
  experimentId,
  runId,
  baseDir = DEFAULT_BASE,
} = {}) {
  if (!experimentId) throw new Error("experimentId is required");
  if (!runId) throw new Error("runId is required");
  const evidenceRoot = resolve(join(baseDir, experimentId, runId));
  await mkdir(join(evidenceRoot, "native"), { recursive: true });
  await mkdir(join(evidenceRoot, "screenshots"), { recursive: true });
  await mkdir(join(evidenceRoot, "phases"), { recursive: true });
  return evidenceRoot;
}

/** Write envelope.yml without rewriting raw native logs. */
export async function writeEnvelope(evidenceRoot, envelope) {
  await mkdir(evidenceRoot, { recursive: true });
  const path = join(evidenceRoot, "envelope.yml");
  await writeFile(path, yaml.dump(envelope, { lineWidth: 100 }), "utf8");
  return path;
}

/** Copy native provider logs into evidenceRoot/native/. */
export async function linkNativeLogs(evidenceRoot, paths = []) {
  const nativeDir = join(evidenceRoot, "native");
  await mkdir(nativeDir, { recursive: true });
  const copied = [];
  for (const src of paths) {
    const dest = join(nativeDir, basename(src));
    await copyFile(src, dest);
    copied.push(dest);
  }
  return copied;
}

/**
 * Assert helper: after workspaceDir is gone, evidenceRoot still exists.
 * Returns true when evidence remains readable and workspace is absent.
 */
export async function evidenceSurvivesWorkspaceCleanup(workspaceDir, evidenceRoot) {
  let workspaceGone = false;
  try {
    await access(workspaceDir);
  } catch {
    workspaceGone = true;
  }
  try {
    await access(evidenceRoot);
    await access(join(evidenceRoot, "envelope.yml"));
  } catch {
    return false;
  }
  return workspaceGone;
}

/** Convenience: wipe a workspace directory only (never evidence). */
export async function cleanupWorkspaceOnly(workspaceDir, evidenceRoot) {
  const ws = resolve(workspaceDir);
  const ev = resolve(evidenceRoot);
  if (ws === ev || ws.startsWith(`${ev}/`) || ev.startsWith(`${ws}/`)) {
    throw new Error("refusing to clean: workspace and evidence paths overlap");
  }
  await rm(ws, { recursive: true, force: true });
}
