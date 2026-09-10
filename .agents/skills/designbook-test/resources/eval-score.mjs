#!/usr/bin/env node
// eval-score.mjs — the ONE eval scorer for design + sync cases. All eval-
// execution lives here (skill layer), NOT in the addon CLI. Shells the pure
// `workflow summary`, then applies the case metric + assertions.
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { execSync, execFileSync } from "node:child_process";
import vm from "node:vm";
import { resolve, isAbsolute, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { load as parseYaml } from "js-yaml";
import jsonata from "jsonata";

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : def;
}

// assertions — ported from scoring/composite.ts, faithful `output` shape.
const ASSERTION_TIMEOUT_MS = 1000;
export function evalAssertions(assertions, output) {
  let passed = 0,
    total = 0;
  const failures = [];
  for (const a of assertions) {
    if (a.type !== "javascript") continue;
    total += 1;
    const ctx = vm.createContext(
      { output },
      { codeGeneration: { strings: false, wasm: false } },
    );
    try {
      let script;
      try {
        script = new vm.Script(a.value);
      } catch {
        script = new vm.Script(`(() => { ${a.value} })()`);
      }
      if (script.runInContext(ctx, { timeout: ASSERTION_TIMEOUT_MS }))
        passed += 1;
      else failures.push(a.value);
    } catch {
      failures.push(a.value);
    }
  }
  return { passed, total, failures };
}
// Only explicitly selected case files and changed case artifacts are read. Git HEAD
// is the fresh setup-test fixture commit unless --baseline selects another commit.
export function collectArtifacts(themeDir, files, baseline = "HEAD") {
  const fileContents = {},
    baselineContents = {},
    fileHashes = {},
    baselineHashes = {};
  const parse = (file, bytes) =>
    /\.(ya?ml|json)$/.test(file)
      ? parseYaml(bytes.toString("utf8"))
      : bytes.toString("utf8");
  const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
  for (const file of [...new Set(files)]) {
    if (
      isAbsolute(file) ||
      relative(resolve(themeDir), resolve(themeDir, file)).startsWith("..")
    )
      throw new Error(`Artifact outside theme: ${file}`);
    try {
      const bytes = readFileSync(resolve(themeDir, file));
      fileHashes[file] = hash(bytes);
      fileContents[file] = parse(file, bytes);
    } catch {
      /* Missing or non-text artifact. */
    }
    try {
      const bytes = execFileSync("git", ["show", `${baseline}:${file}`], {
        cwd: themeDir,
        stdio: ["ignore", "pipe", "ignore"],
      });
      baselineHashes[file] = hash(bytes);
      baselineContents[file] = parse(file, bytes);
    } catch {
      /* New artifact. */
    }
  }
  return {
    fileContents,
    baselineContents,
    fileHashes,
    baselineHashes,
    unchangedFiles: Object.keys(baselineHashes).filter(
      (file) => fileHashes[file] === baselineHashes[file],
    ),
  };
}

export function componentInventory(themeDir, baseline = "HEAD") {
  const gitFiles = (args) =>
    execFileSync("git", args, { cwd: themeDir, encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean);
  const isComponent = (file) => /^components\/.*\.component\.yml$/.test(file);
  const current = [
    ...new Set([
      ...gitFiles(["ls-files"]),
      ...gitFiles(["ls-files", "--others", "--exclude-standard"]),
    ]),
  ].filter((file) => isComponent(file) && existsSync(resolve(themeDir, file)));
  const original = gitFiles(["ls-tree", "-r", "--name-only", baseline]).filter(
    isComponent,
  );
  return {
    componentIds: current.map((file) => file.split("/").at(-2)),
    baselineComponentIds: original.map((file) => file.split("/").at(-2)),
  };
}

export function executionComplete(document) {
  const tasks = document.definition?.tasks ?? [],
    state = document.state?.tasks ?? {};
  if (
    document.state?.status !== "completed" ||
    tasks.length === 0 ||
    tasks.length !== Object.keys(state).length ||
    new Set(tasks.map((task) => task.id)).size !== tasks.length
  )
    return false;
  return tasks.every((task) => {
    const current = state[task.id],
      results = current?.results ?? {};
    const required = Object.entries(task.outputs ?? {})
      .filter(([, output]) => output.required)
      .map(([key]) => key);
    return (
      current?.status === "done" &&
      Object.keys(results).length > 0 &&
      required.every(
        (key) =>
          results[key]?.valid === true &&
          Object.hasOwn(results[key], "value") &&
          (results[key].value !== null ||
            (task.outputs[key].submission === "direct" &&
              Object.keys(task.outputs[key].schema ?? {}).length === 0)),
      ) &&
      Object.values(results).every((result) => result?.valid === true)
    );
  });
}

// Case graph evidence uses stage types and explicit output/input contracts, never
// task titles or array ordering. Component batches precede mapping/scene writes.
export function componentPrerequisites(document) {
  const tasks = document.definition?.tasks ?? [];
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const writers = tasks.filter(
    (task) =>
      task.type === "write-component" ||
      Object.keys(task.outputs ?? {}).some((key) =>
        key.startsWith("component-"),
      ),
  );
  const consumers = tasks.filter(
    (task) =>
      ["map-entity", "write-scene"].includes(task.type) ||
      (task.type !== "create-scene-file" &&
        Object.keys(task.outputs ?? {}).some((key) =>
          ["entity-mapping", "scene-file"].includes(key),
        )),
  );
  const ancestors = (id, seen = new Set()) => {
    for (const parent of byId.get(id)?.depends_on ?? []) {
      if (!seen.has(parent)) {
        seen.add(parent);
        ancestors(parent, seen);
      }
    }
    return seen;
  };
  const failures = [];
  if (writers.length === 0) return { passed: true, failures };
  for (const consumer of consumers) {
    const before = ancestors(consumer.id);
    const refreshes = Object.values(consumer.inputs ?? {})
      .filter((input) => input.result === "index" && before.has(input.task))
      .map((input) => byId.get(input.task))
      .filter(Boolean);
    const covered = writers.every((writer) =>
      refreshes.some((refresh) => {
        const preceding = ancestors(refresh.id);
        const state = document.state?.tasks?.[refresh.id];
        const build = state?.results?.build;
        const index = state?.results?.index;
        return (
          preceding.has(writer.id) &&
          !preceding.has(consumer.id) &&
          refresh.outputs?.build?.required === true &&
          refresh.outputs?.index?.required === true &&
          state?.status === "done" &&
          build?.valid === true &&
          index?.valid === true &&
          build.value?.command === "pnpm build-storybook" &&
          build.value.exitCode === 0 &&
          typeof build.value.cwd === "string" &&
          build.value.cwd.length > 0 &&
          typeof build.value.stdout === "string" &&
          build.value.stdout.trim().length > 0 &&
          Array.isArray(index.value) &&
          index.value.length > 0
        );
      }),
    );
    if (!covered)
      failures.push(
        `${consumer.id}: missing component → build/index → consumer dependency and index input`,
      );
  }
  return { passed: failures.length === 0, failures };
}

// Adapt one MD plan into the workflow-document shape the harness scores against.
// The digest-excluded run-state — a task's `- [x]`/`- [ ]` checkbox — is the
// authoritative done-state, so the scorer reads the checkboxes directly rather
// than the addon parser (no cwd/CLI dependency in the skill layer). Per-task
// build/browser results no longer live in the plan (the executor writes declared
// output files and design-verify writes its score to a file), so `results` is
// empty here; completion is "every task checked off".
export function planToDocument(text, fallbackId) {
  const workflow = text.match(/^# Plan:\s*(\S+)/m)?.[1] ?? fallbackId;
  const tasks = {};
  let step = null;
  let index = 0;
  for (const line of text.split("\n")) {
    const stepMatch = line.match(/^###\s+Step:\s+(\S+)/);
    if (stepMatch) {
      step = stepMatch[1];
      continue;
    }
    const taskMatch = line.match(/^\s*-\s+\[([ xX])\]\s+(\S+)(?:\s+—\s+(.*))?$/);
    if (!taskMatch) continue;
    const done = taskMatch[1].toLowerCase() === "x";
    const id = `${step ?? "step"}:${taskMatch[2]}:${index++}`;
    tasks[id] = {
      id,
      name: taskMatch[2],
      title: (taskMatch[3] ?? "").trim(),
      step,
      status: done ? "done" : "pending",
      attempts: done ? 1 : 0,
      results: {},
    };
  }
  const values = Object.values(tasks);
  const status =
    values.length > 0 && values.every((task) => task.status === "done")
      ? "completed"
      : "pending";
  return {
    definition: {
      id: workflow,
      tasks: values.map((task) => ({ id: task.id, name: task.name, outputs: {} })),
    },
    state: { status, tasks },
  };
}

// The saved plans of a run. Durable seals live at
// `<DESIGNBOOK_DATA>/plans/<workflow>.plan.md`; ephemeral seals live under
// `plans/.ephemeral/*.plan.md`. The scorer inspects both so a leftover or
// ephemeral attempt cannot evade the gates. Workflow id comes from `# Plan:`
// in the file, falling back to the filename (same as `planToDocument`).
export function savedWorkflows(dataDir) {
  const found = [];
  const loadDir = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".plan.md")) continue;
      const path = resolve(dir, entry.name);
      try {
        found.push({
          path,
          document: planToDocument(
            readFileSync(path, "utf8"),
            entry.name.replace(/\.plan\.md$/, ""),
          ),
        });
      } catch (error) {
        found.push({ path, error: error.message });
      }
    }
  };
  const plans = resolve(dataDir, "plans");
  loadDir(plans);
  loadDir(resolve(plans, ".ephemeral"));
  return found;
}

// Snapshot every declared file, including verification artifacts outside the theme.
export function collectOutputHashes(document) {
  const hashes = {};
  for (const task of document.definition?.tasks ?? []) {
    for (const output of Object.values(task.outputs ?? {})) {
      if (!output.path) continue;
      try {
        hashes[output.path] = createHash("sha256")
          .update(readFileSync(output.path))
          .digest("hex");
      } catch {
        // A required missing output fails integrity; optional absent outputs are ignored.
      }
    }
  }
  return hashes;
}

export function artifactIntegrity(document, hashes) {
  const tasks = document.definition?.tasks ?? [];
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const dependsOn = (task, id, seen = new Set()) => {
    if (!task || seen.has(task.id)) return false;
    seen.add(task.id);
    return (task.depends_on ?? []).some(
      (dep) => dep === id || dependsOn(byId.get(dep), id, seen),
    );
  };
  const writers = new Map();
  const failures = [];
  for (const task of tasks) {
    for (const [key, output] of Object.entries(task.outputs ?? {})) {
      if (!output.path) continue;
      const result = document.state?.tasks?.[task.id]?.results?.[key];
      if (!result && !output.required) continue;
      if (!result?.valid || !/^[a-f0-9]{64}$/.test(result.sha256 ?? ""))
        failures.push({
          path: output.path,
          task: task.id,
          reason: "Missing validated file hash",
        });
      const entries = writers.get(output.path) ?? [];
      entries.push({ task, result });
      writers.set(output.path, entries);
    }
  }
  for (const [path, entries] of writers) {
    const latest = entries.filter(
      (entry) =>
        !entries.some(
          (other) => other !== entry && dependsOn(other.task, entry.task.id),
        ),
    );
    if (latest.length !== 1) {
      failures.push({
        path,
        reason: "File writers lack a unique final dependency",
      });
    } else if (!hashes?.[path] || hashes[path] !== latest[0].result?.sha256) {
      failures.push({
        path,
        task: latest[0].task.id,
        reason: "Final file differs from validated output or is missing",
      });
    }
  }
  return { passed: failures.length === 0, failures };
}

export function collectRuns(entries, summarize = () => undefined) {
  const paths = new Set();
  const runs = entries.map((entry, index) => {
    const path = resolve(entry.workflow);
    if (paths.has(path)) throw new Error(`Repeated execution path: ${path}`);
    paths.add(path);
    const document = parseYaml(readFileSync(path, "utf8"));
    const before = entry.definitionBefore
      ? parseYaml(readFileSync(entry.definitionBefore, "utf8"))
      : null;
    const artifacts = entry.artifactSnapshot
      ? JSON.parse(readFileSync(entry.artifactSnapshot, "utf8"))
      : null;
    const integrity = artifactIntegrity(
      document,
      index === entries.length - 1 && !artifacts
        ? collectOutputHashes(document)
        : artifacts?.outputHashes,
    );
    return {
      path,
      document,
      summary: summarize(path),
      complete: executionComplete(document) && integrity.passed,
      artifactIntegrity: integrity,
      componentPrerequisites: componentPrerequisites(document),
      definitionUnchanged:
        before !== null &&
        JSON.stringify(document.definition) === JSON.stringify(before),
      evidence: entry.evidence
        ? JSON.parse(readFileSync(entry.evidence, "utf8"))
        : null,
      artifacts,
    };
  });
  const laterPaths = new Set();
  for (const run of [...runs].reverse()) {
    const current = collectOutputHashes(run.document);
    const finalHashes = { ...run.artifacts?.outputHashes };
    const declaredPaths = run.document.definition.tasks.flatMap((task) =>
      Object.entries(task.outputs ?? {}).flatMap(([key, output]) =>
        output.path &&
        (output.required || run.document.state.tasks[task.id]?.results?.[key])
          ? [output.path]
          : [],
      ),
    );
    for (const path of declaredPaths) {
      if (!laterPaths.has(path)) finalHashes[path] = current[path];
    }
    const final = artifactIntegrity(run.document, finalHashes);
    run.artifactIntegrity.failures.push(...final.failures);
    run.artifactIntegrity.passed &&= final.passed;
    run.complete &&= final.passed;
    for (const path of declaredPaths) laterPaths.add(path);
  }
  return runs;
}

export async function collectCaseArtifacts(
  themeDir,
  caseDoc,
  baseline = "HEAD",
) {
  const gitFiles = (args) =>
    execFileSync("git", args, { cwd: themeDir, encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean);
  const newFiles = gitFiles(["ls-files", "--others", "--exclude-standard"]);
  const modifiedFiles = gitFiles(["diff", baseline, "--name-only"]);
  const selected = caseDoc.evidence?.files ?? [];
  const changed = [...newFiles, ...modifiedFiles].filter(
    (file) =>
      /^(components|designbook|css)\//.test(file) &&
      !file.startsWith("designbook/workflows/"),
  );
  const artifacts = collectArtifacts(
    themeDir,
    [...selected, ...changed],
    baseline,
  );
  const { componentIds, baselineComponentIds } = componentInventory(
    themeDir,
    baseline,
  );
  const mappingResults = {};
  for (const mapping of caseDoc.evidence?.mappings ?? []) {
    const source = artifacts.fileContents[mapping.file],
      records = artifacts.fileContents[mapping.data];
    try {
      mappingResults[mapping.file] = await jsonata(source).evaluate(
        records[mapping.record ?? 0],
      );
    } catch {
      mappingResults[mapping.file] = null;
    }
  }
  return {
    newFiles,
    modifiedFiles,
    ...artifacts,
    componentIds,
    baselineComponentIds,
    mappingResults,
  };
}

async function main() {
  const summaryCmd = arg(
    "summary-cmd",
    "npx storybook-addon-designbook workflow summary",
  );
  const workflow = arg("workflow");
  const caseFile = arg("case");
  const dataDir = arg("data-dir", ".designbook"); // only read for sync cases
  const drushCmd = arg("drush-cmd", "ddev drush");

  const caseDoc = parseYaml(readFileSync(caseFile, "utf-8")) ?? {};
  const quote = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;
  const summary = JSON.parse(
    execSync(`${summaryCmd} ${quote(workflow)}`, { encoding: "utf-8" }),
  );

  const themeDir = arg("theme-dir", process.cwd());
  const completedWorkflows = {},
    pendingWorkflows = {};
  for (const { path, document: doc, error } of savedWorkflows(dataDir)) {
    if (error || !doc?.definition?.id || !doc?.state?.status)
      throw new Error(`${path}: ${error || "Invalid workflow document"}`);
    if (
      completedWorkflows[doc.definition.id] ||
      pendingWorkflows[doc.definition.id]
    )
      throw new Error(`Duplicate workflow id: ${doc.definition.id} (${path})`);
    (doc.state.status === "completed" ? completedWorkflows : pendingWorkflows)[
      doc.definition.id
    ] = doc;
  }
  const artifacts = await collectCaseArtifacts(
    themeDir,
    caseDoc,
    arg("baseline", "HEAD"),
  );
  artifacts.outputHashes = collectOutputHashes(
    parseYaml(readFileSync(workflow, "utf8")),
  );
  if (arg("snapshot"))
    writeFileSync(arg("snapshot"), JSON.stringify(artifacts, null, 2));
  const entries = arg("runs")
    ? JSON.parse(readFileSync(arg("runs"), "utf8"))
    : [
        {
          workflow,
          definitionBefore: arg("definition-before"),
          evidence: arg("evidence"),
        },
      ];
  const runs = collectRuns(entries, (path) =>
    JSON.parse(execSync(`${summaryCmd} ${quote(path)}`, { encoding: "utf8" })),
  );
  for (const run of runs)
    if (run.path === resolve(workflow) && !run.artifacts)
      run.artifacts = artifacts;
  const before = arg("definition-before");
  const document = parseYaml(readFileSync(workflow, "utf8"));
  const definitionUnchanged = before
    ? JSON.stringify(document.definition) ===
      JSON.stringify(parseYaml(readFileSync(before, "utf8")))
    : false;
  const assertOutput = {
    ...summary,
    completedWorkflows,
    pendingWorkflows,
    ...artifacts,
    runs,
    definitionUnchanged,
    text: arg("transcript", ""),
  };
  const assertions = evalAssertions(caseDoc.assert ?? [], assertOutput);

  // sync cases: merge validate_pass_rate + cim_ok (tasks.yml) + existence_rate (drush)
  let metricInput = summary;
  const expected = caseDoc.expected_config ?? [];
  if (expected.length > 0) {
    const tasks = parseYaml(readFileSync(workflow, "utf-8")) ?? {};
    const units = Object.values(tasks.state.tasks).flatMap((t) => {
      const e = t.results?.["config-file"];
      return e ? [e] : [];
    });
    const validate_pass_rate =
      units.length > 0
        ? units.filter((e) => e.valid === true).length / units.length
        : 0;
    let cim_ok = false;
    for (const t of Object.values(tasks.state.tasks)) {
      for (const e of Object.values(t.results ?? {})) {
        if (
          e &&
          typeof e.value === "object" &&
          e.value !== null &&
          "cim_ok" in e.value
        )
          cim_ok = e.value.cim_ok === true;
      }
    }
    const configExists = (name) => {
      try {
        execSync(`${drushCmd} config:get '${name}' --format=json`, {
          stdio: "pipe",
        });
        return true;
      } catch {
        return false;
      }
    };
    const existence_rate =
      expected.filter(configExists).length / expected.length;
    metricInput = { ...summary, validate_pass_rate, cim_ok, existence_rate };
  }

  const expr = caseDoc.metric ?? "flowRate";
  const metric = await jsonata(expr).evaluate(metricInput);
  console.log(
    JSON.stringify({
      ...metricInput,
      assertions,
      metric: typeof metric === "number" ? metric : null,
    }),
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await main();
