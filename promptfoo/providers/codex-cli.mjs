import CliProvider from "./cli-provider.mjs";

export const codexRuntime = {
  name: "codex",
  label: "Codex",
  defaultModel: "gpt-5.6-luna",
  args: (cwd, prompt, model) => [
    "exec",
    "--json",
    "--ephemeral",
    "--dangerously-bypass-approvals-and-sandbox",
    "--skip-git-repo-check",
    "--model",
    model,
    "-C",
    cwd,
    prompt,
  ],
  parse(events) {
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
      usage: events.findLast(
        (event) => event.type === "turn.completed" && event.usage,
      )?.usage,
    };
  },
};

export default class CodexCliProvider extends CliProvider {
  constructor(options = {}) {
    super(options, codexRuntime);
  }
}
