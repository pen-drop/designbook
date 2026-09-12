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
