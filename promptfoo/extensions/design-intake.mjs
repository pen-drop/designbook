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
  let columns;
  const start = lines.findIndex((line, index) => {
    const row = cells(line).map((cell) => {
      const label = cell.toLowerCase();
      if (
        /^(?:native )?(?:(?:source|reference) )?locator(?: \([^)]*\))?(?: on .+)?$/.test(
          label,
        )
      )
        return "reference selector";
      if (/^(?:planned )?story selector$/.test(label)) return "story selector";
      if (/^(?:views|breakpoints)(?:\b.*)?$/.test(label)) return "breakpoints";
      if (/^states?$/.test(label)) return "states";
      if (/^(?:observed )?evidence$/.test(label)) return "evidence";
      return label;
    });
    const complete =
      headers.every(
        (header) => row.filter((cell) => cell === header).length === 1,
      ) && /^\s*\|?\s*:?-{3}/.test(lines[index + 1] || "");
    if (complete) columns = row;
    return complete;
  });
  if (start < 0 || !/^\s*\|?\s*:?-{3}/.test(lines[start + 1] || ""))
    return null;
  const rows = [];
  for (const line of lines.slice(start + 2)) {
    if (!line.includes("|")) break;
    const allValues = cells(line);
    const values = headers.map((header) => allValues[columns.indexOf(header)]);
    if (
      allValues.length !== columns.length ||
      values.some((value) => !value || /^(?:tbd|unknown|\?|-)$/i.test(value)) ||
      /\b(?:tbd|unknown|story selector|to be (?:defined|determined)|(?:next )?planner['’]?s? decision|(?:decided|chosen|defined|determined) later|deferred)\b/i.test(
        values[2] || "",
      )
    )
      return null;
    const row = Object.fromEntries(
      headers.map((header, i) => [header, values[i]]),
    );
    if (columns.includes("states"))
      row.breakpoints += `; states: ${allValues[columns.indexOf("states")]}`;
    const sourceCell = line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split(/(?<!\\)\|/)[columns.indexOf("reference selector")];
    const literals = [...sourceCell.matchAll(/`([^`]+)`/g)].map((match) =>
      match[1].trim(),
    );
    if (literals.length) row.source_locators = literals;
    rows.push(row);
  }
  return rows.length &&
    new Set(rows.map((row) => row.subject)).size === rows.length
    ? rows
    : null;
}

/** Intake presents its source inventory; completed capture workflows are checked separately. */
export function validateIntakePresentation(
  events,
  { captureWorkflows = false } = {},
) {
  const entries = nativeEntries(events);
  if (
    !captureWorkflows &&
    entries.some((entry) => workflowCommand(entry.command || ""))
  )
    return {
      pass: false,
      reason: "Intake-only phase created or executed a workflow",
    };
  const presentation = entries.find(
    (entry) => entry.text && selectorTable(entry.text),
  );
  return presentation
    ? {
        pass: true,
        reason: "Complete selector intake presented",
        text: entries
          .filter((entry) => entry.text)
          .map((entry) => entry.text)
          .join("\n\n"),
        rows: selectorTable(presentation.text),
      }
    : {
        pass: false,
        reason: "Missing complete user-visible selector table in intake",
      };
}

/** Explicit inventory values may have readable labels, without matching identifier prefixes. */
export function inventoryMentions(text, value) {
  if (typeof text !== "string" || typeof value !== "string" || !value)
    return false;
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^\\w-])${escaped}(?=$|[^\\w-])`, "i").test(text);
}

/** Locator literals are case-sensitive; prose labels cannot change their meaning. */
export function locatorPresented(row, value) {
  return (
    typeof value === "string" &&
    (row.source_locators || [row["reference selector"]]).includes(value)
  );
}

/** Every published reference scope cell must appear in the native intake. */
export function validateCapturePresentation(rows, workflows = {}) {
  const fail = (reason) => ({ pass: false, reason });
  for (const workflow of Object.values(workflows)) {
    if (workflow.definition?.capture?.role !== "reference") continue;
    for (const cell of workflow.definition.capture.scope || []) {
      const row = rows?.find((candidate) => candidate.subject === cell.subject);
      if (!row || !locatorPresented(row, cell.locator.value))
        return fail(`Intake omits the source locator for ${cell.subject}`);
      if (
        !inventoryMentions(row.breakpoints, cell.view) &&
        !inventoryMentions(row.breakpoints, cell.breakpoint)
      )
        return fail(`Intake omits view ${cell.view} for ${cell.subject}`);
      if (!inventoryMentions(`${row.evidence} ${row.breakpoints}`, cell.state))
        return fail(
          `Intake evidence omits state ${cell.state} for ${cell.subject}`,
        );
    }
  }
  return { pass: true };
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
  const coverage = validateCapturePresentation(rows, workflows);
  if (!coverage.pass) return coverage;
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
