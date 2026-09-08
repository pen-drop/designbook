import test from "node:test";
import assert from "node:assert/strict";
import {
  selectorTable,
  workflowCommand,
  validateIntakePresentation,
  validateDesignIntake,
} from "../extensions/design-intake.mjs";
const text =
  "Selected subjects:\n| Subject | Reference selector | Story selector | Breakpoints | Evidence |\n| --- | --- | --- | --- | --- |\n| header | app-site-header | planned: .page__header | sm, xl | header-sm.png, header-xl.png: rest: logo and navigation observed |";
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
      capture: {
        role: "reference",
        scope: ["sm", "xl"].map((view) => ({
          subject: "header",
          locator: { kind: "css", value: "app-site-header" },
          view,
          state: "rest",
        })),
      },
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

test("recognizes semantic columns with separate states and preserves exact locators", () => {
  const presentation = [
    "| Subject | Native source locator (CSS) | Planned story selector | Views → breakpoint | States | Observed evidence |",
    "| --- | --- | --- | --- | --- | --- |",
    "| header | `app-site-header` | planned: `#storybook-root header` | 640×1600 → sm, 1280×1600 → xl | rest | header-sm.png, header-xl.png: logo and navigation observed |",
  ].join("\n");
  const rows = selectorTable(presentation);
  assert.deepEqual(rows[0].source_locators, ["app-site-header"]);
  assert.match(rows[0].breakpoints, /states: rest/);
  assert.equal(
    validateDesignIntake(
      [{ ...message, item: { ...message.item, text: presentation } }, create],
      workflows,
    ).pass,
    true,
  );
  const reordered = [
    "| States | Evidence | Story selector | Subject | Reference selector | Views (breakpoint) |",
    "| --- | --- | --- | --- | --- | --- |",
    "| rest | header.png: logo observed | `#Header` | header | `app-site-header` | sm, xl |",
  ].join("\n");
  assert.deepEqual(selectorTable(reordered)[0].source_locators, [
    "app-site-header",
  ]);
  assert.equal(selectorTable(reordered)[0]["story selector"], "#Header");
});

test("flexible tables still reject missing, ambiguous or deferred selector decisions", () => {
  for (const placeholder of [
    "planned header slot; concrete element selector is the next planner's decision",
    "selector will be chosen later",
    "deferred to planning",
  ])
    assert.equal(
      selectorTable(text.replace("planned: .page__header", placeholder)),
      null,
    );
  assert.equal(selectorTable(text.replace("Story selector", "Notes")), null);
  assert.equal(selectorTable(text.replace("Evidence", "Story selector")), null);
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

test("source-neutral headings preserve concrete non-CSS locators and view identities", () => {
  const rows = selectorTable(
    text
      .replace("Reference selector", "Source locator")
      .replace("Breakpoints", "Views")
      .replace("app-site-header", "file-A/node-42")
      .replace("sm, xl", "mobile-frame, desktop-frame"),
  );
  assert.equal(rows[0]["reference selector"], "file-A/node-42");
  assert.equal(rows[0].breakpoints, "mobile-frame, desktop-frame");
});

test("capture-enabled intake checks presentation while workflow publication is checked separately", () => {
  assert.equal(
    validateIntakePresentation([create, message], { captureWorkflows: true })
      .pass,
    true,
  );
  assert.equal(
    validateIntakePresentation([create], { captureWorkflows: true }).pass,
    false,
  );
});

test("readable source headings and annotated views retain explicit capture coverage", () => {
  const prose = text
    .replace("Reference selector", "Source locator on https://example.test/")
    .replace("Story selector", "Planned story selector")
    .replace("Breakpoints", "Views and states")
    .replace("Evidence", "Observed evidence")
    .replace(
      "| app-site-header |",
      "| `app-site-header > nav` within `app-site-header` |",
    )
    .replace("sm, xl", "sm 640×1600; xl 1440×1600. Both: rest.");
  const events = [
    { ...message, item: { ...message.item, text: prose } },
    create,
  ];
  assert.equal(validateDesignIntake(events, workflows).pass, true);
  assert.equal(
    validateDesignIntake(
      [
        {
          ...message,
          item: {
            ...message.item,
            text: prose.replaceAll("app-site-header", "app-site-header-other"),
          },
        },
        create,
      ],
      workflows,
    ).pass,
    false,
  );
});

test("source locators preserve exact case and compound-selector identity", () => {
  for (const [locator, presented] of [
    ["#Navigation", "#navigation"],
    ["header", "header.mobile"],
  ]) {
    const document = {
      definition: {
        capture: {
          role: "reference",
          scope: [
            {
              subject: "header",
              view: "sm",
              state: "rest",
              locator: { kind: "css", value: locator },
            },
          ],
        },
      },
    };
    const prose = text.replace("app-site-header", presented);
    assert.equal(
      validateDesignIntake(
        [{ ...message, item: { ...message.item, text: prose } }, create],
        { capture: document },
      ).pass,
      false,
    );
  }
});
