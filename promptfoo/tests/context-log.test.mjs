import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  codexContext,
  messageContext,
  writeContextLog,
} from "../providers/context-log.mjs";
import { codexRuntime } from "../providers/codex-cli.mjs";

const record = (id, input) => ({
  type: "token_usage_record",
  timestamp: "2026-09-07T14:00:00Z",
  payload: {
    response_id: id,
    usage: {
      input_tokens: input,
      cached_input_tokens: input - 10,
      output_tokens: 20,
    },
    thread_token_usage: { input_tokens: 9000000 },
  },
});
test("context uses individual requests, retains cached input and records compaction separately", () => {
  const result = codexContext([
    record("one", 1000),
    record("one", 1000),
    record("two", 2000),
    {
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          last_token_usage: { input_tokens: 2000 },
          model_context_window: 258400,
        },
      },
    },
    { type: "compacted", payload: {} },
    record("three", 500),
  ]);
  assert.equal(result.summary.request_count, 3);
  assert.equal(result.summary.peak_input_tokens, 2000);
  assert.equal(result.summary.last_input_tokens, 500);
  assert.equal(result.summary.compactions, 1);
  assert.deepEqual(result.summary.model_context_windows, [258400]);
  assert.equal(result.entries[0].cached_input_tokens, 990);
  assert.equal(
    codexRuntime.args("/tmp", "test", "test").includes("--ephemeral"),
    false,
  );
});

test("archives the matching native session and writes unknown instead of inferred context", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "context-log-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const evidence = join(root, "evidence");
  const sessions = join(root, "sessions", "2026");
  await mkdir(evidence);
  await mkdir(sessions, { recursive: true });
  const id = "01a07c40-7a13-7f93-aa5f-1bd77bf3504e";
  const stdout = JSON.stringify({ type: "thread.started", thread_id: id });
  const unavailable = await writeContextLog("codex", stdout, evidence, {
    codexHome: root,
  });
  assert.equal(unavailable.status, "unavailable");
  assert.equal(unavailable.peak_input_tokens, null);
  assert.equal(unavailable.compactions, null);
  const raw =
    [{ type: "session_meta", payload: { id } }, record("one", 1234)]
      .map(JSON.stringify)
      .join("\n") + '\n{"incomplete":';
  await writeFile(join(sessions, `rollout-${id}.jsonl`), raw);
  const summary = await writeContextLog("codex", stdout, evidence, {
    codexHome: root,
  });
  assert.equal(summary.peak_input_tokens, 1234);
  assert.equal(await readFile(summary.source, "utf8"), raw);
  assert.match(await readFile(summary.log, "utf8"), /"type":"request"/);
  assert.equal(
    JSON.parse(await readFile(join(evidence, "context-summary.json"), "utf8"))
      .status,
    "available",
  );
  const unsupported = await writeContextLog("grok", "", evidence);
  assert.equal(unsupported.peak_input_tokens, null);
  assert.equal(unsupported.status, "unavailable");
});

test("Claude context includes all cache inputs without duplicating streamed messages or subagents", () => {
  const event = {
    type: "assistant",
    message: {
      id: "msg_1",
      model: "opus",
      usage: {
        input_tokens: 10,
        cache_creation_input_tokens: 20,
        cache_read_input_tokens: 1000,
        output_tokens: 3,
      },
    },
  };
  const result = messageContext([
    event,
    event,
    { ...event, parent_tool_use_id: "child" },
    { type: "system", subtype: "compact_boundary" },
    { type: "result", modelUsage: { opus: { contextWindow: 200000 } } },
  ]);
  assert.equal(result.summary.request_count, 1);
  assert.equal(result.summary.peak_input_tokens, 1030);
  assert.equal(result.summary.compactions, 1);
  assert.deepEqual(result.summary.model_context_windows, [200000]);
});
