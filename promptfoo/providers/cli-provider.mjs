/**
 * Shared workspace, artifact and evidence handling for CLI providers.
 * This uses the user's CLI subscription (OAuth auth) instead of an API key.
 *
 * Returns structured output for deterministic assertions:
 *   output.text            — raw CLI final message
 *   output.newFiles        — list of new file paths (relative to workspace)
 *   output.completedWorkflows — keyed by workflow id, parsed workflow document
 *   output.pendingWorkflows  — keyed by workflow id (indicates failure)
 *   output.fileContents    — parsed YAML/text content of new files
 *   output.fileHashes      — sha256 (hex) of every output file, computed by the
 *                            harness itself (never self-reported by the agent), so
 *                            binary artifacts (e.g. reference PNGs) can be compared
 *                            for identity/difference in a trustworthy way.
 *
 * Workspace setup:
 *   If vars contain `suite` + `case`, rebuilds the workspace and layers case fixtures automatically.
 *   For a verification phase, vars.workspace selects the already prepared workspace.
 */
import { execFile, execFileSync } from "node:child_process";
import {
  readdir,
  readFile,
  stat,
  mkdir,
  writeFile,
  mkdtemp,
} from "node:fs/promises";
import {
  readFileSync as readFileSyncFs,
  writeFileSync,
  existsSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { createRequire } from "node:module";

import {
  collectCaseArtifacts,
  collectRuns,
} from "../../.agents/skills/designbook-test/resources/eval-score.mjs";

const require = createRequire(import.meta.url);
let yaml;
try {
  yaml = require("js-yaml");
} catch {
  // fallback: try from project root
  yaml = require(join(process.cwd(), "node_modules", "js-yaml"));
}

class CliProvider {
  constructor(options = {}, runtime) {
    this.runtime = runtime;
    this.config = options.config || {};
    this.model = this.config.model || runtime.defaultModel;
    this.timeout = this.config.timeout || 3_600_000;
    this.id = () => `${runtime.name}-cli:${this.model}`;
  }

  /**
   * Set up workspace and resolve prompt from case file.
   * Returns { cwd, prompt } where prompt may override the one from config.
   */
  setupWorkspace(vars, configPrompt) {
    const suite = vars?.suite;
    const caseName = vars?.case;

    if (suite && caseName) {
      const repoRoot = resolve(process.cwd());
      const setupScript = join(repoRoot, "scripts", "setup-test.sh");
      const workspaceDir = resolve(
        repoRoot,
        vars.workspace ||
          join("promptfoo", "workspaces", `${suite}-${caseName}`),
      );

      console.log(
        `Setting up workspace: ${suite}/${caseName} → ${workspaceDir}`,
      );
      execFileSync(
        join(repoRoot, "scripts", "setup-workspace.sh"),
        [suite, "--into", workspaceDir],
        {
          cwd: repoRoot,
          stdio: "pipe",
        },
      );
      execFileSync(setupScript, [suite, caseName, "--into", workspaceDir], {
        cwd: repoRoot,
        stdio: "pipe",
      });

      if (vars.storybook_port !== undefined) {
        const port = vars.storybook_port;
        if (!Number.isInteger(port) || port < 1024 || port > 65535)
          throw new Error("Invalid Storybook port");
        const configPath = join(workspaceDir, "designbook.config.yml");
        const config = yaml.load(readFileSyncFs(configPath, "utf8"));
        config.designbook.url = `http://localhost:${port}`;
        writeFileSync(configPath, yaml.dump(config));
        const startup = execFileSync(
          process.execPath,
          [
            join(repoRoot, "packages/storybook-addon-designbook/dist/cli.js"),
            "storybook",
            "start",
            "--port",
            String(port),
          ],
          {
            cwd: workspaceDir,
            env: { ...process.env, DESIGNBOOK_HOME: workspaceDir },
            encoding: "utf8",
          },
        );
        writeFileSync(join(workspaceDir, "storybook-start.json"), startup);
      }

      if (caseName.startsWith("sync-")) {
        // Provision/import the committed DB baseline before the measured workflow.
        execFileSync(
          join(repoRoot, "scripts", "start-drupal-workspace.sh"),
          ["--workspace", workspaceDir],
          {
            cwd: repoRoot,
            stdio: "pipe",
          },
        );
      }

      // Read prompt from case file if config prompt is a placeholder
      let prompt = configPrompt;
      if (!prompt || prompt === "{{prompt}}") {
        const caseFile = join(
          repoRoot,
          "fixtures",
          suite,
          "cases",
          `${caseName}.yaml`,
        );
        if (existsSync(caseFile)) {
          const caseData = yaml.load(readFileSyncFs(caseFile, "utf-8"));
          if (caseData?.prompt) {
            prompt = caseData.prompt.replace(
              /\{\{workspace\}\}/g,
              workspaceDir,
            );
          }
        }
      } else {
        prompt = prompt.replace(/\{\{workspace\}\}/g, workspaceDir);
      }

      return { cwd: workspaceDir, prompt };
    }

    // Verification uses the same workspace without resetting its artifacts.
    const cwd = resolve(vars?.workspace || process.cwd());
    const prompt =
      configPrompt?.replace(/\{\{workspace\}\}/g, cwd) || configPrompt;
    return { cwd, prompt };
  }

  async callApi(prompt, context) {
    const evidenceRoot = resolve(
      this.config.evidenceDir || "promptfoo/reports/evidence",
    );
    await mkdir(evidenceRoot, { recursive: true });
    const evidenceDir = await mkdtemp(join(evidenceRoot, "run-"));
    let cwd, resolvedPrompt;
    try {
      ({ cwd, prompt: resolvedPrompt } = this.setupWorkspace(
        context?.vars,
        prompt,
      ));
    } catch (err) {
      await writeFile(
        join(evidenceDir, "setup-error.txt"),
        `${err.message}\n${err.stdout || ""}\n${err.stderr || ""}`,
      );
      return { error: err.message, metadata: { evidenceDir } };
    }
    await writeFile(join(evidenceDir, "prompt.txt"), resolvedPrompt);
    const started = Date.now();
    const args = this.runtime.args(cwd, resolvedPrompt, this.model);
    const label = this.runtime.label;
    const logName = `${this.runtime.name}.jsonl`;

    try {
      const raw = await new Promise((resolve, reject) => {
        console.log(
          `Running ${label} CLI in ${cwd} with model ${this.model}, timeout ${this.timeout}ms`,
        );
        const child = execFile(
          this.runtime.name,
          args,
          {
            cwd,
            timeout: this.timeout,
            maxBuffer: 50 * 1024 * 1024,
            env: { ...process.env, DESIGNBOOK_HOME: cwd },
          },
          async (err, stdout, stderr) => {
            try {
              await Promise.all([
                writeFile(join(evidenceDir, logName), stdout),
                writeFile(join(evidenceDir, "stderr.log"), stderr),
              ]);
            } catch (logError) {
              reject(logError);
              return;
            }
            if (err && err.killed) {
              reject(
                new Error(`${label} CLI timed out after ${this.timeout}ms`),
              );
            } else if (err) {
              reject(
                new Error(
                  `${label} CLI error: ${err.message}\nstderr: ${stderr}`,
                ),
              );
            } else {
              resolve(stdout);
            }
          },
        );
        // The prompt is passed as an argv value. Close stdin so the CLI does not
        // wait for an additional prompt after completing that request.
        child.stdin?.end();
      });

      const events = String(raw)
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      const {
        text,
        usage,
        modelUsage,
        usageScope,
        subagentCount,
        usageBreakdown,
      } = await this.runtime.parse(events, { evidenceDir });
      if (
        ["input_tokens", "cached_input_tokens", "output_tokens"].some(
          (key) => !Number.isSafeInteger(usage?.[key]) || usage[key] < 0,
        ) ||
        usage.cached_input_tokens > usage.input_tokens
      ) {
        throw new Error(
          `Missing or invalid ${label} token usage; inspect ${logName}`,
        );
      }

      // Collect all workspace artifacts after the run
      const artifacts = await this.collectArtifacts(cwd);

      const tokenUsage = {
        prompt: usage.input_tokens,
        completion: usage.output_tokens,
        cached: usage.cached_input_tokens,
        total: usage.input_tokens + usage.output_tokens,
        ...(Number.isSafeInteger(usage.reasoning_output_tokens)
          ? {
              completionDetails: { reasoning: usage.reasoning_output_tokens },
            }
          : {}),
      };

      const run = {
        model: this.model,
        cli: this.runtime.name,
        ...(modelUsage ? { modelUsage } : {}),
        ...(usageScope ? { usageScope, subagentCount } : {}),
        ...(usageBreakdown ? { usageBreakdown } : {}),
        workspace: cwd,
        usage,
        durationMs: Date.now() - started,
        evidenceDir,
      };
      await writeFile(
        join(evidenceDir, "run.json"),
        JSON.stringify(run, null, 2),
      );
      const logFiles = await this.walkDir(
        await this.resolveDesignbookDir(cwd),
        cwd,
        (path) => path.endsWith("dbo.log"),
      );
      for (const [i, file] of logFiles.entries()) {
        await writeFile(
          join(evidenceDir, `cli-${i}.log`),
          await readFile(join(cwd, file.path)),
        );
      }
      return {
        output: {
          text,
          ...run,
          // Remove YAML alias identity before Promptfoo persists the JSON output;
          // otherwise shared first_shot/final objects can be dropped as circular.
          ...JSON.parse(JSON.stringify(artifacts)),
        },
        metadata: { evidenceDir },
        ...(tokenUsage ? { tokenUsage } : {}),
      };
    } catch (err) {
      await writeFile(join(evidenceDir, "error.txt"), err.message);
      await writeFile(
        join(evidenceDir, "run.json"),
        JSON.stringify(
          {
            model: this.model,
            workspace: cwd,
            durationMs: Date.now() - started,
            usage: null,
            evidenceDir,
            error: err.message,
          },
          null,
          2,
        ),
      );
      return { error: err.message, metadata: { evidenceDir } };
    }
  }

  /**
   * Scan the workspace and return structured data for assertions.
   * Collects ALL files — the workspace is fresh per run, so everything is output.
   */
  async collectArtifacts(workspaceDir) {
    const designbookDir = await this.resolveDesignbookDir(workspaceDir);
    const workflowPaths = [];
    const result = {
      newFiles: [],
      completedWorkflows: {},
      pendingWorkflows: {},
      workflowErrors: [],
      definitionUnchanged: false,
      definitionErrors: [],
      fileContents: {},
      fileHashes: {},
    };

    try {
      // 1. All output files — scan workspace root, exclude noise dirs and workflow internals
      const excludeDirs = new Set([
        "node_modules",
        ".git",
        ".pnpm-store",
        "vendor",
      ]);
      const designbookRelative = relative(
        workspaceDir,
        designbookDir,
      ).replaceAll("\\", "/");
      const allOutputFiles = await this.walkDir(
        workspaceDir,
        workspaceDir,
        (rel) => {
          const parts = rel.split("/");
          if (parts.some((part) => excludeDirs.has(part))) return false;
          if (rel.startsWith(`${designbookRelative}/workflows/`)) return false;
          return true;
        },
        (rel) => !rel.split("/").some((part) => excludeDirs.has(part)),
      );

      // Keep the public artifact contract stable: files below the configured
      // Designbook home are exposed under the virtual designbook/ prefix.
      const pathMap = new Map();
      result.newFiles = allOutputFiles.map((f) => {
        const actual = f.path.replaceAll("\\", "/");
        const virtual =
          actual === designbookRelative ||
          actual.startsWith(`${designbookRelative}/`)
            ? `designbook/${actual.slice(designbookRelative.length + 1)}`
            : actual;
        pathMap.set(virtual, actual);
        return virtual;
      });

      // 2. Parse content of YAML/MD files
      for (const filePath of result.newFiles) {
        const fullPath = join(workspaceDir, pathMap.get(filePath) || filePath);
        try {
          const s = await stat(fullPath);
          if (s.size > 0 && s.size <= 8192) {
            const raw = await readFile(fullPath, "utf-8");
            if (/\.(yml|yaml)$/.test(filePath)) {
              try {
                result.fileContents[filePath] = yaml.load(raw);
              } catch {
                result.fileContents[filePath] = raw;
              }
            } else if (/\.(md|txt|css|twig|jsonata)$/.test(filePath)) {
              result.fileContents[filePath] = raw;
            }
          }
        } catch {
          // skip unreadable
        }
      }

      // 2b. Harness-computed sha256 of every output file (bytes, not text) — the
      //     tester hashes the artifact itself so assertions never trust an
      //     agent-self-reported digest. Enables identity/difference checks on
      //     binary artifacts (e.g. reference PNGs) that are too large for fileContents.
      for (const filePath of result.newFiles) {
        try {
          const bytes = await readFile(
            join(workspaceDir, pathMap.get(filePath) || filePath),
          );
          result.fileHashes[filePath] = createHash("sha256")
            .update(bytes)
            .digest("hex");
        } catch {
          // skip unreadable
        }
      }

      // Completion follows saved state. Run IDs remain exact; retries are evidence.
      for (const folder of ["changes", "archive"]) {
        const files = await this.walkDir(
          join(designbookDir, "workflows", folder),
          workspaceDir,
          () => true,
        );
        for (const f of files.filter((file) =>
          file.path.endsWith("/tasks.yml"),
        )) {
          try {
            const parsed = yaml.load(
              await readFile(join(workspaceDir, f.path), "utf-8"),
            );
            workflowPaths.push(resolve(workspaceDir, f.path));
            if (!parsed?.definition?.id || !parsed?.state?.status)
              throw new Error("Invalid workflow document");
            const target =
              parsed.state.status === "completed"
                ? result.completedWorkflows
                : result.pendingWorkflows;
            if (
              result.completedWorkflows[parsed.definition.id] ||
              result.pendingWorkflows[parsed.definition.id]
            )
              throw new Error(`Duplicate workflow id: ${parsed.definition.id}`);
            target[parsed.definition.id] = parsed;
            try {
              const before = yaml.load(
                await readFile(
                  join(workspaceDir, dirname(f.path), "definition-before.yml"),
                  "utf-8",
                ),
              );
              if (!isDeepStrictEqual(before, parsed.definition))
                throw new Error("Definition changed during execution");
            } catch (err) {
              result.definitionErrors.push({
                path: f.path,
                error: err.message,
              });
            }
          } catch (err) {
            result.workflowErrors.push({ path: f.path, error: err.message });
          }
        }
      }
    } catch (err) {
      result.workflowErrors.push({ error: err.message });
    }

    result.definitionUnchanged =
      result.definitionErrors.length === 0 &&
      result.workflowErrors.length === 0 &&
      Object.keys(result.completedWorkflows).length +
        Object.keys(result.pendingWorkflows).length >
        0;
    if (this.config.caseFile) {
      const caseDoc = yaml.load(await readFile(this.config.caseFile, "utf8"));
      const entries = JSON.parse(
        await readFile(join(workspaceDir, "case-runs.json"), "utf8"),
      );
      if (!Array.isArray(entries) || entries.length === 0)
        throw new Error("Case evidence needs a nonempty execution manifest");
      const runs = collectRuns(entries);
      if (
        !isDeepStrictEqual(
          runs.map((run) => run.path).sort(),
          workflowPaths.sort(),
        )
      )
        throw new Error(
          "Case evidence must include every saved execution path",
        );
      const artifacts = await collectCaseArtifacts(
        dirname(designbookDir),
        caseDoc,
      );
      Object.assign(result, artifacts, { runs });
      result.definitionUnchanged &&= runs.every(
        (run) => run.definitionUnchanged,
      );
    }
    return result;
  }

  /**
   * Recursively walk a directory and return file info.
   */
  async walkDir(dir, baseDir, filter, directoryFilter = () => true) {
    const results = [];
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relPath = relative(baseDir, fullPath);
        if (entry.isDirectory() && directoryFilter(relPath)) {
          const sub = await this.walkDir(
            fullPath,
            baseDir,
            filter,
            directoryFilter,
          );
          results.push(...sub);
        } else if (entry.isFile() && filter(relPath)) {
          try {
            const s = await stat(fullPath);
            results.push({ path: relPath, size: s.size });
          } catch {
            results.push({ path: relPath, size: 0 });
          }
        }
      }
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
    return results;
  }

  async resolveDesignbookDir(workspaceDir) {
    let config;
    try {
      config = yaml.load(
        await readFile(join(workspaceDir, "designbook.config.yml"), "utf-8"),
      );
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
    return resolve(workspaceDir, config?.designbook?.home || ".", "designbook");
  }
}

export default CliProvider;
