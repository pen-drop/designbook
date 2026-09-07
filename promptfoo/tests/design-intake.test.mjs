import test from "node:test";
import assert from "node:assert/strict";
import {
  selectorTable,
  validateDesignIntake,
} from "../extensions/design-intake.mjs";
const text =
  "Selected subjects:\n| Subject | Reference selector | Story selector | Breakpoints | Evidence |\n| --- | --- | --- | --- | --- |\n| header | app-site-header | planned: .page__header | sm, xl | header-sm.png, header-xl.png: logo and navigation observed |";
const message = {
  type: "item.completed",
  item: { type: "agent_message", text },
};
const create = {
  type: "item.started",
  item: {
    type: "command_execution",
    command:
      "npx storybook-addon-designbook workflow create definition.yml --output tasks.yml",
  },
};
const workflows = {
  shell: {
    definition: {
      tasks: [
        {
          params: {
            elements: [
              {
                id: "header",
                selector: "app-site-header",
                breakpoints: ["sm", "xl"],
              },
            ],
          },
        },
      ],
    },
  },
};
test("requires presentation before workflow creation, not merely a completed run", () => {
  assert.equal(validateDesignIntake([message, create], workflows).pass, true);
  assert.equal(validateDesignIntake([create, message], workflows).pass, false);
  assert.equal(validateDesignIntake([create], workflows).pass, false);
  assert.equal(validateDesignIntake([message], workflows).pass, false);
  assert.equal(
    validateDesignIntake(
      [
        { type: "user", message: { content: [{ type: "text", text }] } },
        create,
      ],
      workflows,
    ).pass,
    false,
  );
});
test("checks complete table and declared selector/breakpoint coverage", () => {
  assert.equal(
    selectorTable(text.replace("planned: .page__header", "TBD")),
    null,
  );
  for (const replacement of [
    text.replace("app-site-header", "header"),
    text.replace("sm, xl", "xl"),
    text.replace("| header |", "| footer |"),
  ])
    assert.equal(
      validateDesignIntake(
        [{ ...message, item: { ...message.item, text: replacement } }, create],
        workflows,
      ).pass,
      false,
    );
});
test("Claude and Grok assistant text precedes tool use within native message content", () => {
  const event = {
    type: "assistant",
    message: {
      content: [
        { type: "text", text },
        {
          type: "tool_use",
          input: {
            command:
              "npx storybook-addon-designbook workflow create plan.yml --output tasks.yml",
          },
        },
      ],
    },
  };
  assert.equal(validateDesignIntake([event], workflows).pass, true);
  assert.equal(
    validateDesignIntake(
      [
        {
          ...event,
          message: { content: [...event.message.content].reverse() },
        },
      ],
      workflows,
    ).pass,
    false,
  );
});
