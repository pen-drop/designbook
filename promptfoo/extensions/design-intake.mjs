import { parse as parseShell } from "shell-quote";
const headers = [
  "subject",
  "reference selector",
  "story selector",
  "breakpoints",
  "evidence",
];
const clean = (value) => value.trim().replaceAll("`", "");

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

export function workflowCommand(command) {
  let words;
  try {
    words = parseShell(command, (name) => `$${name}`);
  } catch {
    return false;
  }
  for (let i = 0; i < words.length; i++) {
    if (typeof words[i] !== "string") continue;
    if (
      /(?:^|\/)(?:bash|sh|zsh|fish)$/.test(words[i]) &&
      typeof words[i + 1] === "string" &&
      /^-[a-z]*c[a-z]*$/.test(words[i + 1]) &&
      typeof words[i + 2] === "string" &&
      workflowCommand(words[i + 2])
    )
      return true;
    if (
      /(?:^|\/)(?:storybook-addon-designbook|_debo|cli\.(?:mjs|js))$/.test(
        words[i],
      ) &&
      words[i + 1] === "workflow" &&
      ["create", "start", "done"].includes(words[i + 2])
    )
      return true;
  }
  return false;
}

export function selectorTable(text) {
  const lines = text.split(/\r?\n/);
  const cells = (line) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split(/(?<!\\)\|/)
      .map(clean);
  const start = lines.findIndex((line, index) => {
    const row = cells(line).map((cell) => cell.toLowerCase());
    return (
      row.length === headers.length &&
      row.every((cell, i) => cell === headers[i]) &&
      /^\s*\|?\s*:?-{3}/.test(lines[index + 1] || "")
    );
  });
  if (start < 0 || !/^\s*\|?\s*:?-{3}/.test(lines[start + 1] || ""))
    return null;
  const rows = [];
  for (const line of lines.slice(start + 2)) {
    if (!line.includes("|")) break;
    const values = cells(line);
    if (
      values.length !== headers.length ||
      values.some((value) => !value || /^(?:tbd|unknown|\?|-)$/i.test(value)) ||
      /\b(?:tbd|unknown|story selector|to be (?:defined|determined))\b/i.test(
        values[2] || "",
      )
    )
      return null;
    rows.push(
      Object.fromEntries(headers.map((header, i) => [header, values[i]])),
    );
  }
  return rows.length &&
    new Set(rows.map((row) => row.subject)).size === rows.length
    ? rows
    : null;
}

/** Deterministic transcript/order and declared-scope check; visual truth is audited separately. */
export function validateDesignIntake(events, workflows = {}) {
  const entries = nativeEntries(events);
  const presented = entries.findIndex(
    (entry) => entry.text && selectorTable(entry.text),
  );
  const created = entries.findIndex((entry) =>
    workflowCommand(entry.command || ""),
  );
  const fail = (reason) => ({ pass: false, reason });
  if (presented < 0)
    return fail("Missing complete user-visible selector table in intake");
  if (created < 0)
    return fail(
      "Missing native workflow lifecycle evidence for intake ordering",
    );
  if (presented >= created)
    return fail(
      "Selector presentation must precede workflow create and execution",
    );
  const rows = selectorTable(entries[presented].text);
  for (const workflow of Object.values(workflows)) {
    for (const task of workflow.definition?.tasks || []) {
      for (const element of task.params?.elements || []) {
        if (!element.id || typeof element.selector !== "string") continue;
        const row = rows.find((candidate) => candidate.subject === element.id);
        if (
          !row ||
          row["reference selector"] !== (element.selector || "full page")
        )
          return fail(
            `Intake does not present the declared reference selector for ${element.id}`,
          );
        for (const bp of element.breakpoints || task.params.breakpoints || [])
          if (!row.breakpoints.split(/[\s,]+/).includes(bp))
            return fail(`Intake omits breakpoint ${bp} for ${element.id}`);
      }
    }
  }
  return {
    pass: true,
    reason: "Selector inventory presented before workflow creation",
    rows,
    text: entries[presented].text,
  };
}

export default function designIntakeResult(output) {
  const result = output?.designIntake;
  return {
    pass: result?.pass === true,
    score: result?.pass === true ? 1 : 0,
    reason: result?.reason || "Missing static design-intake validation",
  };
}
