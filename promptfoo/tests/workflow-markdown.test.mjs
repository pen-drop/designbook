import test from "node:test";
import assert from "node:assert/strict";
import { workflowMarkdown } from "../extensions/workflow-markdown.mjs";

test("reading view retains instructions, constraints and resolved predecessor results", async () => {
  const output = await workflowMarkdown({
    definition: {
      id: "shell",
      title: "Shell",
      config: { framework: "sdc" },
      schemas: { Scene: { type: "object" } },
      template: { source: "shell.md", content: "Full template instructions." },
      context: {
        rule: {
          source: "rule.md",
          content: "Exactly one `$content` slot.\n```twig\n{{ content }}\n```",
        },
      },
      tasks: [
        {
          id: "component",
          instructions: { content: "Write every variant." },
          outputs: { index: { required: true } },
        },
        {
          id: "scene",
          instructions: { source: "scene.md", content: "Full scene task." },
          context: ["rule"],
          inputs: { inventory: { task: "component", result: "index" } },
        },
      ],
    },
    state: {
      status: "blocked",
      tasks: {
        component: { results: { index: { value: ["header", "footer"] } } },
      },
    },
  });
  for (const text of [
    "Full template instructions.",
    "Exactly one `$content` slot.",
    "Full scene task.",
    "required: true",
    "header",
    "footer",
    "Scene:",
    "status: blocked",
    "framework: sdc",
  ])
    assert.ok(output.includes(text), text);
  assert.ok(output.includes("### Resolved predecessor inputs"));
  assert.ok(
    output.includes("````yaml"),
    "embedded code cannot terminate the metadata fence",
  );
});

test("provider can load the exporter before fresh fixture setup builds the addon", async (t) => {
  const { mkdtemp, mkdir, copyFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { pathToFileURL } = await import("node:url");
  const root = await mkdtemp(join(tmpdir(), "unbuilt-workflow-export-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const folder = join(root, "promptfoo", "extensions");
  await mkdir(folder, { recursive: true });
  const path = join(folder, "workflow-markdown.mjs");
  await copyFile(new URL("../extensions/workflow-markdown.mjs", import.meta.url), path);
  const module = await import(pathToFileURL(path).href);
  assert.equal(typeof module.workflowMarkdown, "function");
});
