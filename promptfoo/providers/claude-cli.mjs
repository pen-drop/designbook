import CliProvider from "./cli-provider.mjs";

export const claudeRuntime = {
  name: "claude",
  label: "Claude",
  defaultModel: "claude-opus-5",
  args: (_cwd, prompt, model) => [
    "--print",
    "--output-format",
    "stream-json",
    "--verbose",
    "--no-session-persistence",
    "--dangerously-skip-permissions",
    "--model",
    model,
    "--",
    prompt,
  ],
  parse(events) {
    const result = events.findLast((event) => event.type === "result");
    if (!result || result.is_error || result.subtype !== "success") {
      throw new Error(
        `Claude CLI did not complete successfully: ${result?.errors?.join("; ") || result?.subtype || "missing result"}; inspect claude.jsonl`,
      );
    }
    const raw = result.usage;
    // Anthropic reports ordinary input, cache writes and cache reads separately.
    // Normalize to total input so CSV totals have the same meaning as Codex.
    for (const key of [
      "input_tokens",
      "cache_creation_input_tokens",
      "cache_read_input_tokens",
      "output_tokens",
    ]) {
      if (!Number.isSafeInteger(raw?.[key]) || raw[key] < 0) {
        throw new Error(
          "Missing or invalid Claude token usage; inspect claude.jsonl",
        );
      }
    }
    return {
      text: result.result || "",
      usage: {
        input_tokens:
          raw.input_tokens +
          raw.cache_creation_input_tokens +
          raw.cache_read_input_tokens,
        cached_input_tokens: raw.cache_read_input_tokens,
        cache_write_input_tokens: raw.cache_creation_input_tokens,
        output_tokens: raw.output_tokens,
        ...(Number.isSafeInteger(raw.output_tokens_details?.thinking_tokens) &&
        raw.output_tokens_details.thinking_tokens >= 0
          ? {
              reasoning_output_tokens:
                raw.output_tokens_details.thinking_tokens,
            }
          : {}),
      },
      modelUsage: result.modelUsage,
    };
  },
};

export default class ClaudeCliProvider extends CliProvider {
  constructor(options = {}) {
    super(options, claudeRuntime);
  }
}
