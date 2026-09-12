import { copyFile, mkdir, readFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const requiredCounters = ["input_tokens", "cached_input_tokens", "output_tokens"];
const optionalCounters = ["cache_write_input_tokens", "reasoning_output_tokens"];
const parseLines = (text) => text.split(/\r?\n/).filter(Boolean).map(JSON.parse);

function validateUsage(usage, id) {
  for (const key of [...requiredCounters, ...optionalCounters.filter((key) => usage?.[key] !== undefined)]) {
    if (!Number.isSafeInteger(usage?.[key]) || usage[key] < 0)
      throw new Error(`Invalid Codex token usage for thread ${id}: ${key}`);
  }
  if (usage.cached_input_tokens > usage.input_tokens)
    throw new Error(`Invalid Codex cached input for thread ${id}`);
}

function spawnedIds(items) {
  return [...new Set(items.filter((item) => item?.tool === "spawn_agent")
    .flatMap((item) => item.receiver_thread_ids || []))];
}

/** Native exec usage covers the parent only. Add each spawned thread exactly once. */
export async function collectCodexUsage(events, rootUsage, {
  evidenceDir,
  codexHome = process.env.CODEX_HOME || join(homedir(), ".codex"),
} = {}) {
  const children = spawnedIds(events.filter((event) => event.type === "item.completed")
    .map((event) => event.item));
  if (!children.length) return { usage: rootUsage, usageScope: "thread-tree", subagentCount: 0 };

  const rootId = events.find((event) => event.type === "thread.started")?.thread_id;
  if (!rootId || !evidenceDir) throw new Error("Missing Codex root thread/evidence directory for subagent accounting");
  validateUsage(rootUsage, rootId);
  const sessionDir = join(codexHome, "sessions");
  const files = await readdir(sessionDir, { recursive: true });
  const evidenceThreads = join(evidenceDir, "threads");
  await mkdir(evidenceThreads, { recursive: true });

  async function loadThread(id, parentId) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error(`Invalid Codex thread ID: ${id}`);
    const matches = files.filter((file) => file.endsWith(`-${id}.jsonl`));
    if (matches.length !== 1) throw new Error(`Missing or ambiguous native Codex log for thread ${id}`);
    const source = join(sessionDir, matches[0]);
    const log = join(evidenceThreads, `${id}.jsonl`);
    await copyFile(source, log);
    const lines = parseLines(await readFile(log, "utf8"));
    const meta = lines.find((event) => event.type === "session_meta")?.payload;
    if (meta?.id !== id || (parentId && meta.source?.subagent?.thread_spawn?.parent_thread_id !== parentId))
      throw new Error(`Codex thread ancestry mismatch for ${id}`);
    const lastStart = lines.findLastIndex((event) => event.type === "event_msg" && event.payload?.type === "task_started");
    const lastEnd = lines.findLastIndex((event) => event.type === "event_msg" && event.payload?.type === "task_complete");
    if (lastStart < 0 || lastEnd <= lastStart) throw new Error(`Codex thread ${id} did not finish; usage is incomplete`);
    const record = lines.findLast((event) => event.type === "token_usage_record")?.payload;
    if (record?.thread_id !== id) throw new Error(`Missing native Codex token record for thread ${id}`);
    validateUsage(record.thread_token_usage, id);
    const context = lines.findLast((event) => event.type === "turn_context")?.payload;
    return {
      threadId: id, parentThreadId: parentId, usage: record.thread_token_usage,
      model: context?.model, reasoningEffort: context?.effort, log,
      children: spawnedIds(lines.filter((event) => event.type === "event_msg" && event.payload?.type === "item_completed")
        .map((event) => event.payload.item)),
    };
  }

  const root = await loadThread(rootId);
  for (const key of [...requiredCounters, ...optionalCounters.filter((key) => rootUsage[key] !== undefined)]) {
    if (root.usage[key] !== rootUsage[key]) throw new Error(`Codex parent usage differs between exec and native log: ${key}`);
  }
  const seen = new Set([rootId]);
  const subagents = [];
  const queue = [...new Set([...children, ...root.children])].map((id) => [id, rootId]);
  while (queue.length) {
    const [id, parentId] = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    const thread = await loadThread(id, parentId);
    subagents.push(thread);
    queue.push(...thread.children.map((child) => [child, id]));
  }
  const all = [root, ...subagents];
  const usage = Object.fromEntries([...requiredCounters,
    ...optionalCounters.filter((key) => all.every((thread) => thread.usage[key] !== undefined)),
  ].map((key) => [key, all.reduce((total, thread) => total + thread.usage[key], 0)]));
  validateUsage(usage, rootId);
  const withoutChildren = ({ children: _children, ...thread }) => thread;
  return {
    usage, usageScope: "thread-tree", subagentCount: subagents.length,
    usageBreakdown: { root: withoutChildren(root), subagents: subagents.map(withoutChildren) },
  };
}
