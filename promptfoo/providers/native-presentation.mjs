/** Only assistant prose is presentation; tool output and quoted file content are not. */
export function nativeEntries(events) {
  return events.flatMap((event) => {
    if (event.type === "item.completed" && event.item?.type === "agent_message")
      return [{ text: event.item.text || "" }];
    if (
      event.type === "item.started" &&
      event.item?.type === "command_execution"
    )
      return [{ command: event.item.command || "" }];
    if (event.type !== "assistant" || event.parent_tool_use_id != null)
      return [];
    return (event.message?.content || []).flatMap((part) => {
      if (part.type === "text") return [{ text: part.text }];
      if (part.type === "tool_use")
        return [{ command: part.input?.command || part.input?.cmd || "" }];
      return [];
    });
  });
}

function normalize(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .trimEnd();
}

function isPlanBuild(command) {
  return /\bplan\s+build\b/.test(command || "");
}

function isAskChoices(text) {
  const body = String(text || "").toLowerCase();
  return (
    (body.includes("ephemeral") || body.includes("run here")) &&
    (body.includes("persist") || body.includes("hand off")) &&
    body.includes("cancel")
  );
}

/**
 * Require the exact expected composition tree in assistant prose before the
 * first `plan build`, and in ask mode before the three execution-mode choices.
 */
export function compositionPresentation(events, expectedTree, options = {}) {
  const tree = normalize(expectedTree);
  if (!tree)
    return { ok: false, reason: "expected composition tree is missing" };
  const entries = nativeEntries(events);
  const presented = entries.findIndex(
    (entry) => entry.text && normalize(entry.text).includes(tree),
  );
  if (presented < 0)
    return {
      ok: false,
      reason: "expected composition tree was not presented in assistant prose",
    };
  const firstBuild = entries.findIndex((entry) => isPlanBuild(entry.command));
  if (firstBuild >= 0 && presented > firstBuild)
    return {
      ok: false,
      reason: "composition tree was presented after the first plan build",
    };
  if (options.ask) {
    const choices = entries.findIndex(
      (entry) => entry.text && isAskChoices(entry.text),
    );
    if (choices < 0)
      return { ok: false, reason: "ask-mode choices were not presented" };
    if (presented > choices)
      return {
        ok: false,
        reason: "composition tree was presented after the ask-mode choices",
      };
  }
  return { ok: true };
}
