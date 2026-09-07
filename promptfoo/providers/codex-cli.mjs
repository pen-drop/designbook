import CliProvider from "./cli-provider.mjs";
import { collectCodexUsage } from "./codex-usage.mjs";

export const codexRuntime = {
  name: "codex",
  label: "Codex",
  defaultModel: "gpt-5.6-luna",
  args: (cwd, prompt, model, config = {}) => [
    "exec",
    "--json",
    "--dangerously-bypass-approvals-and-sandbox",
    "--skip-git-repo-check",
    "--model",
    model,
    "-c",
    `model_reasoning_effort=${JSON.stringify(config.reasoningEffort || "medium")}`,
    "-C",
    cwd,
    prompt,
  ],
  async parse(events, options) {
    if (
      !events.some((event) => event.type === "turn.completed") ||
      events.some((event) => event.type === "turn.failed")
    ) {
      throw new Error(
        "Codex CLI did not complete successfully; inspect codex.jsonl",
      );
    }
    const messages = events
      .filter(
        (event) =>
          event.type === "item.completed" &&
          event.item?.type === "agent_message",
      )
      .map((event) =>
        typeof event.item.text === "string"
          ? event.item.text
          : (event.item.content || [])
              .filter((part) => typeof part?.text === "string")
              .map((part) => part.text)
              .join("\n"),
      );
    return {
      text: messages.filter(Boolean).at(-1) || "",
      ...(await collectCodexUsage(
        events,
        events.findLast(
          (event) => event.type === "turn.completed" && event.usage,
        )?.usage,
        options,
      )),
    };
  },
};

export default class CodexCliProvider extends CliProvider {
  constructor(options = {}) {
    super(options, codexRuntime);
  }
}
