import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import yaml from "js-yaml";

/** A real workflow-done publication for testing the native provider handoff. */
export function publishedCapture(workspace) {
  const data = join(workspace, "designbook");
  mkdirSync(data, { recursive: true });
  writeFileSync(join(workspace, "designbook.config.yml"), yaml.dump({ data }));
  const cli = resolve("packages/storybook-addon-designbook/dist/cli.js");
  const invoke = (...args) =>
    execFileSync(process.execPath, [cli, ...args], {
      cwd: workspace,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  const source = {
    kind: "website",
    identity: "https://example.test/header",
    revision: "fixture-v1",
  };
  const location = JSON.parse(
    invoke(
      "workflow",
      "capture-location",
      "--source-kind",
      source.kind,
      "--source-identity",
      source.identity,
      "--workflow-id",
      "capture-fixture",
    ),
  );
  const locator = { kind: "css", value: "header" };
  const views = [
    { id: "mobile", width: 1, height: 1, breakpoint: "sm" },
    { id: "desktop", width: 1, height: 1, breakpoint: "xl" },
  ];
  const meta = {
    source,
    role: "reference",
    elements: [{ id: "header", locator, views, states: [{ name: "rest" }] }],
    extract: "extract.json",
    assets_dir: "assets",
  };
  const extract = {
    subjects: [
      {
        id: "header",
        locator,
        samples: views.map((view) => ({
          view: view.id,
          state: "rest",
          breakpoint: view.breakpoint,
          structure: {
            roots: ["header"],
            nodes: [{ id: "header", kind: "header", locator, children: [] }],
          },
          observations: { layout: { display: "flex" } },
          dependencies: { parent_ids: [], asset_ids: [], font_families: [] },
          unavailable: [],
        })),
      },
    ],
    parents: [],
    images: [],
    fonts: [],
    captures: views.map((view) => ({
      subject: "header",
      view: view.id,
      state: "rest",
      path: `${view.id}--header--rest.png`,
      width: 1,
      height: 1,
    })),
  };
  const shared = yaml.load(
    readFileSync(
      resolve(".agents/skills/designbook/design/schemas.yml"),
      "utf8",
    ),
  );
  const schemas = JSON.parse(
    JSON.stringify(shared).replaceAll('"$ref":"#/', '"$ref":"#/definitions/'),
  );
  const instructions = {
    source: "capture-fixture.md",
    content: "Capture the fixed selected subject and publish its observations.",
  };
  const outputs = {
    reference: {
      required: true,
      submission: "data",
      validators: [],
      path: join(location.directory, "meta.yml"),
      schema: { $ref: "#/definitions/Reference" },
    },
    reference_extract: {
      required: true,
      submission: "data",
      validators: [],
      path: join(location.directory, "extract.json"),
      schema: { $ref: "#/definitions/DesignReference" },
    },
  };
  mkdirSync(location.directory, { recursive: true });
  for (const capture of extract.captures) {
    const path = join(location.directory, capture.path);
    writeFileSync(
      path,
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4l8AAAAASUVORK5CYII=",
        "base64",
      ),
    );
    outputs[`screenshot_${capture.view}`] = {
      required: true,
      submission: "direct",
      validators: ["image"],
      path,
      schema: {},
    };
  }
  const template = {
    source: "capture-fixture.md",
    content: "Capture a fixed source.",
  };
  const config = { data };
  const definition = {
    id: "capture-fixture",
    title: "Capture fixture",
    workspace_root: workspace,
    config,
    template,
    inputs: {},
    inputs_schema: {},
    context: { capture: instructions },
    schemas,
    capture: {
      role: "reference",
      source,
      scope: views.map((view) => ({
        subject: "header",
        locator,
        view: view.id,
        breakpoint: view.breakpoint,
        state: "rest",
      })),
    },
    tasks: [
      {
        id: "capture",
        title: "Capture",
        step: "capture",
        type: "reference",
        target: "header",
        depends_on: [],
        inputs: {},
        params: {},
        params_schema: { type: "object" },
        instructions: "capture",
        context: [],
        outputs,
      },
    ],
  };
  const catalogue = {
    template,
    config,
    blocks: {
      capture: [
        {
          instructions,
          rules: [],
          blueprints: [],
          config_rules: [],
          config_instructions: [],
          params_schema: { type: "object" },
          outputs,
          schemas,
        },
      ],
    },
  };
  const planFile = join(workspace, "capture-definition.json");
  const catalogueFile = join(workspace, "capture-catalogue.json");
  const resultsFile = join(workspace, "capture-results.json");
  const workflow = join(data, "workflows/changes/capture-fixture/tasks.yml");
  writeFileSync(planFile, JSON.stringify(definition));
  writeFileSync(catalogueFile, JSON.stringify(catalogue));
  writeFileSync(
    resultsFile,
    JSON.stringify({
      capture: { reference: meta, reference_extract: extract },
    }),
  );
  invoke(
    "workflow",
    "create",
    planFile,
    "--catalogue",
    catalogueFile,
    "--output",
    workflow,
  );
  writeFileSync(
    join(workflow, "..", "definition-before.yml"),
    yaml.dump(definition),
  );
  invoke("workflow", "start", workflow, "--step", "capture");
  invoke(
    "workflow",
    "done",
    workflow,
    "--step",
    "capture",
    "--data-file",
    resultsFile,
  );
  return { directory: location.directory, workflow, meta, extract };
}
