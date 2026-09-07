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

export function collectRuns(entries, summarize = () => undefined) {
  const paths = new Set();
  return entries.map((entry) => {
    const path = resolve(entry.workflow);
    if (paths.has(path)) throw new Error(`Repeated execution path: ${path}`);
    paths.add(path);
    const document = parseYaml(readFileSync(path, "utf8"));
    const before = entry.definitionBefore
      ? parseYaml(readFileSync(entry.definitionBefore, "utf8"))
      : null;
    return {
      path,
      document,
      summary: summarize(path),
      complete: executionComplete(document),
      definitionUnchanged:
        before !== null &&
        JSON.stringify(document.definition) === JSON.stringify(before),
      evidence: entry.evidence
        ? JSON.parse(readFileSync(entry.evidence, "utf8"))
        : null,
      artifacts: entry.artifactSnapshot
        ? JSON.parse(readFileSync(entry.artifactSnapshot, "utf8"))
        : null,
    };
  });
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
  for (const folder of ["changes", "archive"]) {
    const root = `${dataDir}/workflows/${folder}`;
    if (!existsSync(root)) continue;
    for (const name of readdirSync(root)) {
      const file = `${root}/${name}/tasks.yml`;
      if (!existsSync(file)) continue;
      const doc = parseYaml(readFileSync(file, "utf8"));
      (doc.state.status === "completed"
        ? completedWorkflows
        : pendingWorkflows)[doc.definition.id] = doc;
    }
  }
  const artifacts = await collectCaseArtifacts(
    themeDir,
    caseDoc,
    arg("baseline", "HEAD"),
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
