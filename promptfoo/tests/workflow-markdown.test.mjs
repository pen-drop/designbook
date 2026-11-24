import test from "node:test";
import assert from "node:assert/strict";
import { workflowMarkdown } from "../extensions/workflow-markdown.mjs";

test("human plan retains unique instructions and constraints without mutable results", async () => {
  const output = await workflowMarkdown({
    definition: {
      id: "shell",
      title: "Shell",
      config: { framework: "sdc" },
      schemas: { Scene: { type: "object" } },
      template: { source: "shell.md", content: "Full template instructions." },
      context: {
        component: { source: "component.md", content: "Write every variant." },
        scene: { source: "scene.md", content: "Full scene task." },
        rule: {
          source: "rule.md",
          content: "Exactly one `$content` slot.\n```twig\n{{ content }}\n```",
        },
      },
      tasks: [
        {
          id: "component",
          instructions: "component",
          context: ["rule"],
          outputs: { index: { required: true } },
        },
        {
          id: "scene",
          instructions: "scene",
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
    "Scene:",
    "framework: sdc",
  ])
    assert.ok(output.includes(text), text);
  assert.doesNotMatch(
    output,
    /Resolved predecessor inputs|status: blocked|header|footer/,
  );
  assert.equal(output.split("Exactly one `$content` slot.").length - 1, 1);
  assert.match(output, /\[rule\]\(#context-72756c65\)/);
  assert.match(output, /<a id="context-72756c65"><\/a>/);
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
  await copyFile(
    new URL("../extensions/workflow-markdown.mjs", import.meta.url),
    path,
  );
  const module = await import(pathToFileURL(path).href);
  assert.equal(typeof module.workflowMarkdown, "function");
});
