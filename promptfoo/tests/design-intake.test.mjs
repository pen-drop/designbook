import test from "node:test";
import assert from "node:assert/strict";
import {
  selectorTable,
  workflowCommand,
  validateIntakePresentation,
  referenceInventoryError,
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

test("rejects descriptive story-selector placeholders and ambiguous duplicate subjects", () => {
  assert.equal(
    selectorTable(
      text.replace(
        "planned: .page__header",
        "Planned: shell header story selector",
      ),
    ),
    null,
  );
  assert.equal(selectorTable(text + "\n" + text.split("\n").at(-1)), null);
  assert.notEqual(selectorTable(text.split("\n")[1] + "\n" + text), null);
});

test("ordering checks actual shell commands rather than documentation searches", () => {
  assert.equal(workflowCommand(`rg 'workflow create' .agents`), false);
  assert.equal(
    workflowCommand(`rg 'storybook-addon-designbook workflow create' .agents`),
    false,
  );
  assert.equal(
    workflowCommand(
      `/usr/bin/bash -lc 'npx storybook-addon-designbook workflow create plan.yml --output tasks.yml'`,
    ),
    true,
  );
  assert.equal(
    workflowCommand(
      `node /app/dist/cli.js workflow start tasks.yml --task header`,
    ),
    true,
  );
});

test("intake-only part requires a complete presentation and forbids workflow execution", () => {
  assert.equal(validateIntakePresentation([message]).pass, true);
  assert.equal(validateIntakePresentation([message, create]).pass, false);
  assert.equal(validateIntakePresentation([]).pass, false);
});

test("intake statically validates selector bindings and capture paths against reference metadata", () => {
  const rows = selectorTable(text);
  const metadata = {
    "designbook/references/site/meta.yml": {
      elements: [
        {
          id: "header",
          selector: "app-site-header",
          breakpoints: ["sm", "xl"],
          states: [{ name: "rest" }],
        },
      ],
    },
  };
  const hashes = {
    "designbook/references/site/sm--header--rest.png": "sm",
    "designbook/references/site/xl--header--rest.png": "xl",
  };
  assert.equal(referenceInventoryError(rows, metadata, hashes), null);
  assert.match(
    referenceInventoryError(rows, metadata, {}),
    /Missing declared reference capture/,
  );
  const wrong = structuredClone(metadata);
  wrong["designbook/references/site/meta.yml"].elements[0].selector = "footer";
  assert.match(referenceInventoryError(rows, wrong, hashes), /does not bind/);
  assert.equal(
    referenceInventoryError([{ "reference selector": "no reference" }], {}, {}),
    null,
  );
});
