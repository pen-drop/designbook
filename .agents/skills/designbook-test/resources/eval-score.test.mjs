import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  collectArtifacts,
  executionComplete,
  evalAssertions,
  collectRuns,
  componentPrerequisites,
  artifactIntegrity,
  savedWorkflows,
  planToDocument,
} from "./eval-score.mjs";

test("bounded baseline evidence includes unchanged files and detects damage/deletion", () => {
  const dir = mkdtempSync(join(tmpdir(), "eval-artifacts-"));
  try {
    const git = (...args) => execFileSync("git", args, { cwd: dir });
    git("init", "-q");
    writeFileSync(join(dir, "neighbor.yml"), "title: Keep\n");
    writeFileSync(join(dir, "target.yml"), "title: Before\n");
    git("add", ".");
    git(
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.invalid",
      "commit",
      "-qm",
      "fixture",
    );
    writeFileSync(join(dir, "target.yml"), "title: After\n");
    let evidence = collectArtifacts(dir, ["neighbor.yml", "target.yml"]);
    assert.equal(evidence.fileContents["neighbor.yml"].title, "Keep");
    assert.equal(evidence.baselineContents["target.yml"].title, "Before");
    assert.equal(evidence.unchangedFiles.includes("neighbor.yml"), true);
    assert.equal(evidence.unchangedFiles.includes("target.yml"), false);
    rmSync(join(dir, "neighbor.yml"));
    evidence = collectArtifacts(dir, ["neighbor.yml"]);
    assert.equal(evidence.unchangedFiles.includes("neighbor.yml"), false);
    assert.equal(evidence.fileContents["neighbor.yml"], undefined);
    assert.throws(() => collectArtifacts(dir, ["../outside"]));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const doc = () => ({
  definition: {
    id: "same",
    tasks: [{ id: "write", outputs: { artifact: { required: true } } }],
  },
  state: {
    status: "completed",
    tasks: {
      write: {
        status: "done",
        results: { artifact: { valid: true, value: "written" } },
      },
    },
  },
});

test("run completion rejects files changed after validation even with a stale snapshot", () => {
  const dir = mkdtempSync(join(tmpdir(), "eval-drift-"));
  try {
    const file = join(dir, "header.twig");
    const workflow = join(dir, "tasks.yml");
    const snapshot = join(dir, "snapshot.json");
    const document = doc();
    const original = '<header data-shell-header="">Header</header>\n';
    document.definition.tasks[0].outputs.artifact.path = file;
    document.state.tasks.write.results.artifact.value = original;
    document.state.tasks.write.results.artifact.sha256 = createHash("sha256")
      .update(original)
      .digest("hex");
    writeFileSync(file, original);
    writeFileSync(workflow, JSON.stringify(document));
    writeFileSync(
      snapshot,
      JSON.stringify({
        outputHashes: {
          [file]: document.state.tasks.write.results.artifact.sha256,
        },
      }),
    );
    const entries = [{ workflow, artifactSnapshot: snapshot }];
    const collect = () => collectRuns(entries, () => ({}))[0];
    assert.equal(collect().complete, true);
    writeFileSync(file, original.replace('=""', '="true"'));
    assert.equal(collect().complete, false);
    rmSync(file);
    assert.equal(collect().complete, false);
    writeFileSync(file, original);
    delete document.state.tasks.write.results.artifact.sha256;
    writeFileSync(workflow, JSON.stringify(document));
    assert.equal(collect().complete, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("file integrity follows declared writer dependencies rather than task array order", () => {
  const first = doc().definition.tasks[0];
  first.outputs.artifact.path = "/tmp/scene.yml";
  const last = { ...first, id: "last", depends_on: ["write"] };
  const document = doc();
  document.definition.tasks = [last, first];
  document.state.tasks.write.results.artifact.sha256 = "a".repeat(64);
  document.state.tasks.last = {
    status: "done",
    results: { artifact: { valid: true, value: null, sha256: "b".repeat(64) } },
  };
  assert.equal(
    artifactIntegrity(document, { "/tmp/scene.yml": "b".repeat(64) }).passed,
    true,
  );
  assert.equal(
    artifactIntegrity(document, { "/tmp/scene.yml": "a".repeat(64) }).passed,
    false,
  );
  last.depends_on = [];
  assert.equal(
    artifactIntegrity(document, { "/tmp/scene.yml": "b".repeat(64) }).passed,
    false,
  );
});

test("repeated runs retain historical validation and reject drift in files not rewritten later", () => {
  const dir = mkdtempSync(join(tmpdir(), "eval-repeat-integrity-"));
  try {
    const file = join(dir, "scene.yml");
    const untouched = join(dir, "neighbor.yml");
    const hash = (value) => createHash("sha256").update(value).digest("hex");
    const entries = ["first", "second"].map((value, index) => {
      const document = doc();
      document.definition.tasks[0].outputs.artifact.path = file;
      document.state.tasks.write.results.artifact = {
        valid: true,
        value,
        sha256: hash(value),
      };
      if (index === 0) {
        document.definition.tasks[0].outputs.neighbor = {
          path: untouched,
          required: true,
        };
        document.state.tasks.write.results.neighbor = {
          valid: true,
          value: "keep",
          sha256: hash("keep"),
        };
      } else {
        document.definition.tasks[0].outputs.neighbor = {
          path: untouched,
          required: false,
          submission: "data",
        };
      }
      const workflow = join(dir, value + ".json");
      const artifactSnapshot = join(dir, value + "-snapshot.json");
      writeFileSync(workflow, JSON.stringify(document));
      writeFileSync(
        artifactSnapshot,
        JSON.stringify({
          outputHashes: {
            [file]: hash(value),
            ...(index === 0 ? { [untouched]: hash("keep") } : {}),
          },
        }),
      );
      return { workflow, artifactSnapshot };
    });
    writeFileSync(file, "second");
    writeFileSync(untouched, "keep");
    assert.equal(
      collectRuns(entries).every((run) => run.complete),
      true,
    );
    writeFileSync(untouched, "undeclared edit");
    assert.equal(collectRuns(entries)[0].complete, false);
    writeFileSync(untouched, "keep");
    writeFileSync(
      entries[0].artifactSnapshot,
      JSON.stringify({
        outputHashes: { [file]: hash("wrong"), [untouched]: hash("keep") },
      }),
    );
    assert.equal(collectRuns(entries)[0].complete, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scorer CLI uses the current summary command and shared artifact collector", () => {
  const dir = mkdtempSync(join(tmpdir(), "eval-cli-"));
  try {
    const git = (...args) => execFileSync("git", args, { cwd: dir });
    git("init", "-q");
    writeFileSync(join(dir, "neighbor.yml"), "title: Preserve\n");
    git("add", ".");
    git(
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.invalid",
      "commit",
      "-qm",
      "fixture",
    );
    const document = doc();
    const workflow = join(dir, "tasks.yml");
    writeFileSync(workflow, JSON.stringify(document));
    writeFileSync(join(dir, "before.yml"), JSON.stringify(document.definition));
    writeFileSync(
      join(dir, "summary.mjs"),
      `
      import assert from "node:assert/strict";
      assert.deepEqual(process.argv.slice(2), [${JSON.stringify(workflow)}]);
      console.log(JSON.stringify({flowRate: 1}));
    `,
    );
    writeFileSync(
      join(dir, "case.yml"),
      JSON.stringify({
        evidence: { files: ["neighbor.yml"] },
        assert: [
          {
            type: "javascript",
            value:
              "output.runs[0].complete && output.definitionUnchanged && output.unchangedFiles.includes('neighbor.yml')",
          },
        ],
      }),
    );
    const stdout = execFileSync(
      process.execPath,
      [
        new URL("./eval-score.mjs", import.meta.url).pathname,
        "--workflow",
        workflow,
        "--case",
        join(dir, "case.yml"),
        "--theme-dir",
        dir,
        "--data-dir",
        dir,
        "--definition-before",
        join(dir, "before.yml"),
        "--summary-cmd",
        `${process.execPath} ${join(dir, "summary.mjs")}`,
      ],
      { encoding: "utf8" },
    );
    assert.deepEqual(JSON.parse(stdout).assertions, {
      passed: 1,
      total: 1,
      failures: [],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("completion rejects empty tasks/results, invalid results and undeclared state", () => {
  assert.equal(executionComplete(doc()), true);
  for (const mutate of [
    (d) => {
      d.definition.tasks = [];
      d.state.tasks = {};
    },
    (d) => {
      d.state.tasks.write.results = {};
    },
    (d) => {
      d.state.tasks.write.results.artifact.valid = false;
    },
    (d) => {
      d.state.tasks.extra = { status: "done" };
    },
  ]) {
    const damaged = doc();
    mutate(damaged);
    assert.equal(executionComplete(damaged), false);
  }
});
test("repeated definition IDs retain separate run paths, definitions and evidence", () => {
  const dir = mkdtempSync(join(tmpdir(), "eval-runs-"));
  try {
    const entries = ["first", "second"].map((name) => {
      const workflow = join(dir, `${name}.json`),
        definitionBefore = join(dir, `${name}-before.json`);
      writeFileSync(workflow, JSON.stringify(doc()));
      writeFileSync(definitionBefore, JSON.stringify(doc().definition));
      return { workflow, definitionBefore };
    });
    const runs = collectRuns(entries, () => ({ flowRate: 1 }));
    assert.equal(runs.length, 2);
    assert.notEqual(runs[0].path, runs[1].path);
    assert.equal(
      runs.every((run) => run.definitionUnchanged && run.complete),
      true,
    );
    const changed = doc();
    changed.definition.title = "Changed";
    writeFileSync(entries[0].workflow, JSON.stringify(changed));
    assert.equal(
      collectRuns(entries, () => ({}))[0].definitionUnchanged,
      false,
    );
    assert.throws(() => collectRuns([entries[0], entries[0]], () => ({})));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("assertions fail closed for absent evidence and damaged artifacts", () => {
  const assertions = [
    {
      type: "javascript",
      value: "output.runs.length === 2 && output.runs.every(r => r.complete)",
    },
  ];
  assert.equal(evalAssertions(assertions, { runs: [] }).passed, 0);
  assert.equal(
    evalAssertions(assertions, {
      runs: [{ complete: true }, { complete: false }],
    }).passed,
    0,
  );
});

import { componentInventory } from "./eval-score.mjs";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { load as parseYaml } from "js-yaml";

test("savedWorkflows loads durable and ephemeral sealed plans via planToDocument", () => {
  const dir = mkdtempSync(join(tmpdir(), "eval-plans-"));
  try {
    const plans = join(dir, "plans");
    const ephemeral = join(plans, ".ephemeral");
    mkdirSync(ephemeral, { recursive: true });
    writeFileSync(
      join(plans, "tokens.plan.md"),
      "# Plan: tokens\n\n### Step: create-tokens\n- [ ] create-tokens — palette\n",
    );
    writeFileSync(
      join(ephemeral, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.plan.md"),
      "# Plan: vision\n\n### Step: create-vision\n- [x] create-vision — PetMatch\n",
    );
    writeFileSync(join(plans, "notes.md"), "not a plan\n");
    mkdirSync(join(plans, "other"));
    const found = savedWorkflows(dir);
    assert.equal(found.length, 2);
    const byId = Object.fromEntries(
      found.map((entry) => [entry.document.definition.id, entry]),
    );
    assert.equal(byId.tokens.document.state.status, "pending");
    assert.equal(byId.vision.document.state.status, "completed");
    assert.match(byId.vision.path, /\.ephemeral/);
    assert.equal(
      byId.vision.document.definition.id,
      planToDocument(readFileSync(byId.vision.path, "utf8"), "ignored")
        .definition.id,
    );
    assert.equal(savedWorkflows(join(dir, "missing")).length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("component inventory detects deletion of a tracked component", () => {
  const dir = mkdtempSync(join(tmpdir(), "eval-inventory-"));
  try {
    const git = (...args) => execFileSync("git", args, { cwd: dir });
    git("init", "-q");
    mkdirSync(join(dir, "components/avatar"), { recursive: true });
    const component = join(dir, "components/avatar/avatar.component.yml");
    writeFileSync(component, "name: Avatar\n");
    git("add", ".");
    git(
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.invalid",
      "commit",
      "-qm",
      "fixture",
    );
    assert.deepEqual(componentInventory(dir), {
      componentIds: ["avatar"],
      baselineComponentIds: ["avatar"],
    });
    rmSync(component);
    assert.deepEqual(componentInventory(dir), {
      componentIds: [],
      baselineComponentIds: ["avatar"],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const suite = new URL("../../../../fixtures/drupal-petshop/", import.meta.url);
const caseNames = [
  "design-component",
  "design-component-update",
  "design-screen",
  "design-screen-update",
  "design-shell",
  "design-shell-update",
  "design-entity",
  "design-entity-update",
];
test("all eight cases reject empty runs, transcript-only builds, and missing browser evidence", () => {
  for (const name of caseNames) {
    const caseDoc = parseYaml(
      readFileSync(new URL(`cases/${name}.yaml`, suite), "utf8"),
    );
    assert.ok(caseDoc.assert.length > 0, name);
    const empty = evalAssertions(caseDoc.assert, {
      runs: [],
      pendingWorkflows: {},
      definitionUnchanged: true,
      fileContents: {},
      mappingResults: {},
      componentIds: [],
      baselineComponentIds: [],
      unchangedFiles: [],
      text: "build-storybook Build completed",
    });
    assert.ok(empty.passed < empty.total, name);
    const buildAssertion = caseDoc.assert.find((a) =>
      a.value.includes("build?.command"),
    );
    assert.equal(
      evalAssertions([buildAssertion], {
        runs: [
          {
            evidence: {
              build: {
                command: "pnpm build-storybook",
                exitCode: 0,
                stdout: "real output",
                cwd: "/tmp/web/themes/custom/test_integration_drupal",
              },
              checks: [],
            },
          },
        ],
      }).passed,
      0,
      name,
    );
  }
});

test("seeded update components have supported metadata, canonical variants and stories", () => {
  for (const layer of [
    "component-update",
    "shell-update",
    "screen-update",
    "entity-update",
    "pet-card-component",
  ]) {
    const components = new URL(`${layer}/components/`, suite);
    for (const name of readdirSync(components)) {
      const dir = new URL(`${name}/`, components);
      const schema = parseYaml(
        readFileSync(new URL(`${name}.component.yml`, dir), "utf8"),
      );
      assert.ok(
        ["stable", "experimental", "deprecated"].includes(schema.status),
        `${layer}/${name}: status`,
      );
      assert.ok(
        ["Action", "Data Display", "Navigation", "Layout", "Shell"].includes(
          schema.group,
        ),
        `${layer}/${name}: group`,
      );
      assert.equal(
        schema.thirdPartySettings?.sdcStorybook?.disableBasicStory,
        true,
      );
      for (const variant of [
        "default",
        ...Object.keys(schema.variants ?? {}),
      ]) {
        const story = parseYaml(
          readFileSync(new URL(`${name}.${variant}.story.yml`, dir), "utf8"),
        );
        assert.equal(story.component, `test_integration_drupal:${name}`);
        if (schema.variants) assert.ok(story.props.variant in schema.variants);
      }
      if (schema.variants)
        assert.equal(schema.props?.properties?.variant, undefined);
    }
  }
});

test("actual schema-free direct artifact results carry null while data results require a value", () => {
  const direct = doc();
  direct.definition.tasks[0].outputs.artifact = {
    required: true,
    submission: "direct",
    schema: {},
  };
  direct.state.tasks.write.results.artifact.value = null;
  assert.equal(executionComplete(direct), true);
  direct.definition.tasks[0].outputs.artifact.submission = "data";
  assert.equal(executionComplete(direct), false);
  delete direct.state.tasks.write.results.artifact.value;
  assert.equal(executionComplete(direct), false);
});

test("screen preservation and repeat assertions detect lost sibling metadata and duplicate append", () => {
  const caseDoc = parseYaml(
    readFileSync(new URL("cases/design-screen-update.yaml", suite), "utf8"),
  );
  const file = "designbook/sections/homepage/homepage.section.scenes.yml";
  const before = parseYaml(
    readFileSync(new URL(`screen-update/${file}`, suite), "utf8"),
  );
  const current = structuredClone(before);
  current.scenes[0].items[0].with.content[1].props.text =
    "Meet your companion this weekend";
  const output = {
    fileContents: { [file]: current },
    baselineContents: { [file]: before },
  };
  const preserve = caseDoc.assert.find((a) =>
    a.value.includes("JSON.stringify(now.scenes[1])"),
  );
  const unique = caseDoc.assert.find((a) =>
    a.value.includes("scenes.filter(s => s.name === 'homepage')"),
  );
  assert.equal(evalAssertions([preserve, unique], output).passed, 2);
  current.scenes[1].docs = "Lost";
  assert.equal(evalAssertions([preserve], output).passed, 0);
  current.scenes.push(structuredClone(current.scenes[0]));
  assert.equal(evalAssertions([unique], output).passed, 0);
  const repeat = caseDoc.assert.find((a) =>
    a.value.includes("output.runs[0].path !=="),
  );
  const first = {
    path: "/first",
    artifacts: { fileContents: { [file]: before } },
  };
  const second = {
    path: "/second",
    artifacts: { fileContents: { [file]: current } },
  };
  assert.equal(evalAssertions([repeat], { runs: [first, second] }).passed, 0);
});

test("CLI exposes baseline content, snapshot and separate run evidence together", () => {
  const dir = mkdtempSync(join(tmpdir(), "eval-cli-"));
  try {
    const git = (...args) => execFileSync("git", args, { cwd: dir });
    git("init", "-q");
    writeFileSync(join(dir, "neighbor.yml"), "title: Keep\n");
    git("add", ".");
    git(
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.invalid",
      "commit",
      "-qm",
      "fixture",
    );
    const workflow = join(dir, "tasks.json"),
      before = join(dir, "before.json"),
      evidence = join(dir, "evidence.json");
    writeFileSync(workflow, JSON.stringify(doc()));
    writeFileSync(before, JSON.stringify(doc().definition));
    writeFileSync(evidence, JSON.stringify({ build: { exitCode: 0 } }));
    const summary = join(dir, "summary.mjs");
    writeFileSync(summary, "console.log(JSON.stringify({flowRate:1}));");
    const caseFile = join(dir, "case.json");
    writeFileSync(
      caseFile,
      JSON.stringify({
        evidence: { files: ["neighbor.yml"] },
        assert: [
          {
            type: "javascript",
            value:
              "output.unchangedFiles.includes('neighbor.yml') && output.baselineContents['neighbor.yml'].title === 'Keep' && output.runs.length === 1 && output.runs[0].complete && output.runs[0].definitionUnchanged && output.runs[0].evidence.build.exitCode === 0",
          },
        ],
      }),
    );
    const snapshot = join(dir, "snapshot.json");
    const stdout = execFileSync(
      process.execPath,
      [
        new URL("./eval-score.mjs", import.meta.url).pathname,
        "--workflow",
        workflow,
        "--definition-before",
        before,
        "--case",
        caseFile,
        "--theme-dir",
        dir,
        "--data-dir",
        join(dir, "data"),
        "--summary-cmd",
        `${process.execPath} ${summary}`,
        "--evidence",
        evidence,
        "--snapshot",
        snapshot,
      ],
      { encoding: "utf8" },
    );
    assert.deepEqual(JSON.parse(stdout).assertions, {
      passed: 1,
      total: 1,
      failures: [],
    });
    assert.equal(
      JSON.parse(readFileSync(snapshot, "utf8")).fileContents["neighbor.yml"]
        .title,
      "Keep",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("seeded screen files satisfy shared group, identity, shell and route constraints", () => {
  for (const [layer, section] of [
    ["component-update", "team"],
    ["shell-update", "homepage"],
    ["screen-update", "homepage"],
  ]) {
    const file = new URL(
      `${layer}/designbook/sections/${section}/${section}.section.scenes.yml`,
      suite,
    );
    const sceneFile = parseYaml(readFileSync(file, "utf8"));
    assert.equal(sceneFile.id, section);
    assert.equal(sceneFile.group, `Designbook/Sections/${sceneFile.title}`);
    assert.ok(sceneFile.scenes.length > 0);
    assert.equal(
      new Set(sceneFile.scenes.map((scene) => scene.name)).size,
      sceneFile.scenes.length,
    );
    for (const scene of sceneFile.scenes) {
      assert.notEqual(scene.name.toLowerCase(), "overview");
      assert.equal(scene.items[0].scene, "design-system:shell");
      const routes = scene.items[0].with.content.filter(
        (node) => node.entity === "node.homepage",
      );
      assert.equal(routes.length, 1);
      assert.equal(routes[0].view_mode, "full");
      assert.equal(routes[0].record, 0);
    }
  }
});

test("all seeded templates merge attributes on their root", () => {
  for (const layer of [
    "component-update",
    "shell-update",
    "screen-update",
    "entity-update",
    "pet-card-component",
  ]) {
    const components = new URL(`${layer}/components/`, suite);
    for (const name of readdirSync(components)) {
      const twig = readFileSync(
        new URL(`${name}/${name}.twig`, components),
        "utf8",
      );
      const root = twig.match(/<[a-z][^>]*>/)?.[0];
      assert.match(
        root ?? "",
        /\{\{\s*attributes\.addClass\(/,
        `${layer}/${name}: SdcTemplate root attributes`,
      );
    }
  }
});

test("shell fixtures and case expectations distinguish canonical file ID from reference source", () => {
  const file = "designbook/design-system/design-system.scenes.yml";
  for (const layer of ["shell-update", "screen-prerequisites"]) {
    const shell = parseYaml(
      readFileSync(new URL(`${layer}/${file}`, suite), "utf8"),
    );
    assert.equal(shell.id, "debo-design-system");
    assert.equal(
      shell.scenes.filter((scene) => scene.name === "shell").length,
      1,
    );
  }
  for (const name of ["design-shell", "design-shell-update"]) {
    const caseDoc = parseYaml(
      readFileSync(new URL(`cases/${name}.yaml`, suite), "utf8"),
    );
    assert.ok(caseDoc.prompt.includes("design-system:shell"));
    assert.ok(caseDoc.prompt.includes("file id debo-design-system"));
    const identity = caseDoc.assert.find((assertion) =>
      assertion.value.includes("?.id ==="),
    );
    assert.ok(identity);
    const canonical = {
      fileContents: {
        [file]: { id: "debo-design-system", scenes: [{ name: "shell" }] },
      },
    };
    assert.equal(evalAssertions([identity], canonical).passed, 1);
    canonical.fileContents[file].id = "design-system";
    assert.equal(evalAssertions([identity], canonical).passed, 0);
  }
});

test("shell update preserves the footer while allowing the requested navigation delta", () => {
  const file = "designbook/design-system/design-system.scenes.yml";
  const caseDoc = parseYaml(
    readFileSync(new URL("cases/design-shell-update.yaml", suite), "utf8"),
  );
  const before = parseYaml(
    readFileSync(new URL(`shell-update/${file}`, suite), "utf8"),
  );
  const current = structuredClone(before);
  const header = current.scenes[0].items[0].slots.header[0];
  header.props.adopt_label = "Find a pet";
  header.props.adopt_url = "/adopt";
  const preservation = caseDoc.assert.filter(
    (assertion) =>
      assertion.value.includes(file) &&
      assertion.value.includes("baselineContents"),
  );
  assert.ok(preservation.length > 0);
  const output = {
    fileContents: { [file]: current },
    baselineContents: { [file]: before },
  };
  assert.equal(
    evalAssertions(preservation, output).passed,
    preservation.length,
  );
  delete current.scenes[0].items[0].slots.footer;
  assert.ok(
    evalAssertions(preservation, output).passed < preservation.length,
    "removing the unchanged footer must fail preservation",
  );
});

const graphDocument = () => ({
  definition: {
    tasks: [
      {
        id: "component",
        type: "write-component",
        depends_on: [],
        outputs: { "component-twig": {} },
      },
      {
        id: "refresh",
        type: "build",
        depends_on: ["component"],
        outputs: { build: { required: true }, index: { required: true } },
      },
      {
        id: "mapping",
        type: "map-entity",
        depends_on: ["refresh"],
        inputs: { components: { task: "refresh", result: "index" } },
      },
      {
        id: "scene",
        type: "write-scene",
        depends_on: ["mapping", "refresh"],
        inputs: { components: { task: "refresh", result: "index" } },
      },
    ],
  },
  state: {
    tasks: {
      refresh: {
        status: "done",
        results: {
          build: {
            valid: true,
            value: {
              command: "pnpm build-storybook",
              cwd: "/theme",
              exitCode: 0,
              stdout: "Built",
            },
          },
          index: { valid: true, value: [{ id: "provider:avatar" }] },
        },
      },
    },
  },
});

test("component prerequisites require dependency edges and consumed build/index results", () => {
  assert.equal(componentPrerequisites(graphDocument()).passed, true);
  for (const damage of [
    (d) => {
      d.definition.tasks.splice(1, 1);
    },
    (d) => {
      d.definition.tasks[1].depends_on = [];
    },
    (d) => {
      d.definition.tasks[1].depends_on = ["scene"];
    },
    (d) => {
      d.definition.tasks[2].depends_on = ["component"];
    },
    (d) => {
      d.definition.tasks[3].inputs = {};
    },
    (d) => {
      d.state.tasks.refresh.results.index.value = [];
    },
    (d) => {
      d.state.tasks.refresh.results.build.value.exitCode = 1;
    },
    (d) => {
      d.definition.tasks[1].outputs.index.required = false;
    },
    (d) => {
      d.definition.tasks.push({
        id: "other",
        type: "write-component",
        depends_on: [],
      });
    },
  ]) {
    const document = graphDocument();
    damage(document);
    assert.equal(componentPrerequisites(document).passed, false);
  }
  const existing = graphDocument();
  existing.definition.tasks = existing.definition.tasks.filter(
    (t) => t.type !== "write-component",
  );
  assert.equal(componentPrerequisites(existing).passed, true);
});

test("affected cases reject a completed graph with only a final build", () => {
  for (const name of [
    "design-shell",
    "design-shell-update",
    "design-component-update",
  ]) {
    const caseDoc = parseYaml(
      readFileSync(new URL(`cases/${name}.yaml`, suite), "utf8"),
    );
    const assertion = caseDoc.assert.find((a) =>
      a.value.includes("componentPrerequisites"),
    );
    assert.ok(assertion, name);
    const document = graphDocument();
    document.definition.tasks[1].depends_on = ["scene"];
    document.definition.tasks[2].depends_on = ["component"];
    document.definition.tasks[3].depends_on = ["mapping"];
    const run = {
      complete: true,
      definitionUnchanged: true,
      componentPrerequisites: componentPrerequisites(document),
    };
    assert.equal(evalAssertions([assertion], { runs: [run] }).passed, 0, name);
    run.componentPrerequisites = componentPrerequisites(graphDocument());
    assert.equal(evalAssertions([assertion], { runs: [run] }).passed, 1, name);
  }
});
