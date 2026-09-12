import { copyFile, readFile, readdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const lines = (text) =>
  text
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
const counter = (value) =>
  Number.isSafeInteger(value) && value >= 0 ? value : null;

/** Per-request native input usage, never cumulative thread usage or cache misses. */
export function codexContext(events) {
  const entries = [];
  const seen = new Set();
  for (const event of events) {
    const p = event.payload || {};
    const timestamp = event.timestamp || null;
    if (event.type === "token_usage_record" && !seen.has(p.response_id)) {
      if (p.response_id) seen.add(p.response_id);
      entries.push({
        type: "request",
        timestamp,
        response_id: p.response_id || null,
        input_tokens: counter(p.usage?.input_tokens),
        cached_input_tokens: counter(p.usage?.cached_input_tokens),
        output_tokens: counter(p.usage?.output_tokens),
        reasoning_output_tokens: counter(p.usage?.reasoning_output_tokens),
      });
    }
    if (event.type === "event_msg" && p.type === "token_count" && p.info) {
      entries.push({
        type: "context_snapshot",
        timestamp,
        model_context_window: counter(p.info.model_context_window),
        last_input_tokens: counter(p.info.last_token_usage?.input_tokens),
      });
    }
    if (event.type === "compacted")
      entries.push({ type: "compaction", timestamp });
  }
  const requests = entries.filter((e) => e.type === "request");
  const inputs = requests.map((e) => e.input_tokens).filter((v) => v !== null);
  const windows = entries
    .map((e) => e.model_context_window)
    .filter((v) => v != null);
  return {
    entries,
    summary: {
      status: inputs.length ? "available" : "unavailable",
      scope: "root-thread",
      request_count: requests.length,
      peak_input_tokens: inputs.length ? Math.max(...inputs) : null,
      last_input_tokens: inputs.at(-1) ?? null,
      model_context_windows: [...new Set(windows)],
      compactions: events.length
        ? entries.filter((e) => e.type === "compaction").length
        : null,
    },
  };
}

/** Claude/Grok input counters are disjoint: include reads and writes in request context. */
export function messageContext(events) {
  const requests = new Map();
  const entries = [];
  for (const event of events) {
    if (event.type === "system" && event.subtype === "compact_boundary")
      entries.push({ type: "compaction", timestamp: event.timestamp || null });
    const message = event.message;
    if (
      event.type !== "assistant" ||
      event.parent_tool_use_id != null ||
      !message?.id
    )
      continue;
    const usage = message.usage;
    const inputs = [
      usage?.input_tokens,
      usage?.cache_read_input_tokens,
      usage?.cache_creation_input_tokens,
    ];
    if (inputs.some((v) => counter(v) === null)) continue;
    const row = {
      type: "request",
      timestamp: event.timestamp || null,
      response_id: message.id,
      input_tokens: inputs.reduce((a, b) => a + b, 0),
      cached_input_tokens: usage.cache_read_input_tokens,
      output_tokens: counter(usage.output_tokens),
      model: message.model || null,
    };
    if (requests.has(message.id)) Object.assign(requests.get(message.id), row);
    else {
      requests.set(message.id, row);
      entries.push(row);
    }
  }
  const rows = [...requests.values()];
  const modelUsage =
    events.findLast((e) => e.type === "result")?.modelUsage || {};
  return {
    entries,
    summary: {
      status: rows.length ? "available" : "unavailable",
      scope: "root-thread",
      request_count: rows.length,
      peak_input_tokens: rows.length
        ? Math.max(...rows.map((e) => e.input_tokens))
        : null,
      last_input_tokens: rows.at(-1)?.input_tokens ?? null,
      model_context_windows: [
        ...new Set(
          Object.values(modelUsage)
            .map((e) => counter(e.contextWindow))
            .filter((v) => v !== null),
        ),
      ],
      compactions: rows.length
        ? entries.filter((e) => e.type === "compaction").length
        : null,
    },
  };
}

/** Write an explicit unavailable report when the CLI exposes no recoverable context history. */
export async function writeContextLog(
  cli,
  stdout,
  evidenceDir,
  { codexHome = process.env.CODEX_HOME || join(homedir(), ".codex") } = {},
) {
  let result = codexContext([]);
  let reason = `${cli} context history is not collected; see its raw CLI log`;
  let source = null;
  if (cli === "codex") {
    try {
      const id = lines(stdout).find(
        (e) => e.type === "thread.started",
      )?.thread_id;
      if (!id || !/^[0-9a-f-]{36}$/i.test(id))
        throw new Error("Missing native thread ID");
      const directory = join(codexHome, "sessions");
      const matches = (await readdir(directory, { recursive: true })).filter(
        (p) => p.endsWith(`-${id}.jsonl`),
      );
      if (matches.length !== 1)
        throw new Error("Native session log missing or ambiguous");
      const path = join(directory, matches[0]);
      const events = lines(await readFile(path, "utf8"));
      if (events.find((e) => e.type === "session_meta")?.payload?.id !== id)
        throw new Error("Native session identity mismatch");
      source = join(evidenceDir, "codex-session.jsonl");
      await copyFile(path, source);
      result = codexContext(events);
      reason =
        result.summary.status === "available"
          ? null
          : "Native session contains no per-request usage records";
    } catch (error) {
      reason = error.message;
    }
  }
  if (["claude", "grok"].includes(cli)) {
    result = messageContext(lines(stdout));
    source = join(evidenceDir, `${cli}.jsonl`);
    reason =
      result.summary.status === "available"
        ? null
        : "No per-message native usage records";
  }
  const log = join(evidenceDir, "context.jsonl");
  const summary = { ...result.summary, cli, source, log, reason };
  await writeFile(
    log,
    [...result.entries, { type: "summary", ...summary }]
      .map((e) => JSON.stringify(e))
      .join("\n") + "\n",
  );
  await writeFile(
    join(evidenceDir, "context-summary.json"),
    JSON.stringify(summary, null, 2) + "\n",
  );
  return summary;
}
