import CliProvider from "./cli-provider.mjs";
import { parseMessagesResult } from "./claude-cli.mjs";

export const grokRuntime = {
  name: "grok",
  label: "Grok",
  defaultModel: "grok-4.6",
  args: (_cwd, prompt, model) => [
    "--model",
    model,
    "--no-subagents",
    "--permission-mode",
    "bypassPermissions",
    "--output-format",
    "streaming-messages-json",
    "--single",
    prompt,
  ],
  parse(events) {
    const parsed = parseMessagesResult(events, "Grok");
    const messages = events.filter((event) => event.type === "assistant");
    if (
      !messages.length ||
      messages.some((event) => event.parent_tool_use_id != null)
    )
      throw new Error("Missing Grok messages or unaccounted subagent usage");
    const ids = messages.map((event) => event.message?.id);
    if (ids.some((id) => !id) || new Set(ids).size !== ids.length)
      throw new Error("Missing or duplicate Grok message IDs");
    const terminal = events.findLast((event) => event.type === "result");
    for (const key of [
      "input_tokens",
      "output_tokens",
      "cache_read_input_tokens",
      "cache_creation_input_tokens",
    ]) {
      const counters = messages.map((event) => event.message?.usage?.[key]);
      if (
        counters.some((count) => !Number.isSafeInteger(count) || count < 0) ||
        counters.reduce((sum, count) => sum + count, 0) !== terminal.usage[key]
      )
        throw new Error(`Grok message/terminal usage mismatch: ${key}`);
    }
    return { ...parsed, usageScope: "session-no-subagents", subagentCount: 0 };
  },
};

export default class GrokCliProvider extends CliProvider {
  constructor(options = {}) {
    super(options, grokRuntime);
  }
}
