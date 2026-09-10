import { nativeEntries } from "./native-presentation.mjs";
import { writeContextLog } from "./context-log.mjs";
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
  auditDefinitionSnapshots,
  snapshotExistingDefinitions,
} from "../scripts/definition-snapshots.mjs";

import {
  collectCaseArtifacts,
  collectRuns,
  savedWorkflows,
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

      // Storybook is never pre-started or pinned to a port here: the executing
      // agent always starts it via `storybook start`, which assigns a free port
      // and records it in storybook.json for `storybook status` to read back.

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
    let cwd, resolvedPrompt, intakeHandoff;
    try {
      ({ cwd, prompt: resolvedPrompt } = this.setupWorkspace(
        context?.vars,
        prompt,
      ));
      if (this.config.intakeHandoffInput) {
        intakeHandoff = JSON.parse(
          await readFile(this.config.intakeHandoffInput, "utf8"),
        );
        if (intakeHandoff.pass !== true || intakeHandoff.workspace !== cwd)
          throw new Error(
            "Execution requires a passing intake for this workspace",
          );
      }
      if (this.config.definitionSnapshotDir)
        snapshotExistingDefinitions(
          savedWorkflows(await this.resolveDesignbookDir(cwd)),
          this.config.definitionSnapshotDir,
        );
    } catch (err) {
      await writeFile(
        join(evidenceDir, "setup-error.txt"),
        `${err.message}\n${err.stdout || ""}\n${err.stderr || ""}`,
      );
      return { error: err.message, metadata: { evidenceDir } };
    }
    await writeFile(join(evidenceDir, "prompt.txt"), resolvedPrompt);
    const started = Date.now();
    const args = this.runtime.args(
      cwd,
      resolvedPrompt,
      this.model,
      this.config,
    );
    const label = this.runtime.label;
    const logName = `${this.runtime.name}.jsonl`;
    let measured;
    let contextLog;

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
            env: {
              ...process.env,
              DESIGNBOOK_HOME: cwd,
              DESIGNBOOK_PROMPTFOO_DRIVER: "1",
              ...(this.config.definitionSnapshotDir
                ? {
                    DESIGNBOOK_DEFINITION_SNAPSHOTS:
                      this.config.definitionSnapshotDir,
                  }
                : {}),
            },
          },
          async (err, stdout, stderr) => {
            try {
              await Promise.all([
                writeFile(join(evidenceDir, logName), stdout),
                writeFile(join(evidenceDir, "stderr.log"), stderr),
              ]);
              contextLog = await writeContextLog(
                this.runtime.name,
                stdout,
                evidenceDir,
              );
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
        if (this.config.requireDesignIntake) {
          let pending = "";
          child.stdout?.setEncoding("utf8");
          child.stdout?.on("data", (chunk) => {
            pending += chunk.toString();
            const lines = pending.split(/\r?\n/);
            pending = lines.pop();
            for (const line of lines) {
              let event;
              try {
                event = JSON.parse(line);
              } catch {
                continue;
              }
              for (const entry of nativeEntries([event]))
                if (entry.text) console.log(entry.text);
            }
          });
        }
        // Large work orders must not become argv entries (OS per-argument limit).
        // A rejected/early-exiting CLI can close its pipe before consuming input.
        child.stdin?.on("error", (error) => {
          if (error.code !== "EPIPE") reject(error);
        });
        child.stdin?.end(
          this.runtime.promptViaStdin ? resolvedPrompt : undefined,
        );
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

      measured = {
        usage,
        modelUsage,
        usageScope,
        subagentCount,
        usageBreakdown,
      };

      // Collect all workspace artifacts after the run
      const artifacts = await this.collectArtifacts(cwd);

      if (this.config.intakeOnly && this.config.intakeHandoffOutput) {
        // Transport the model's presentation verbatim. Skills and the CLI own
        // reference selection, publication and domain validation.
        const catalogue = JSON.parse(
          await readFile(this.config.intakeCatalogue, "utf8"),
        );
        if (!catalogue.config?.data)
          throw new Error("Missing intake catalogue data directory");
        await writeFile(
          this.config.intakeHandoffOutput,
          JSON.stringify(
            {
              pass: true,
              workspace: cwd,
              text:
                nativeEntries(events)
                  .filter((entry) => entry.text)
                  .map((entry) => entry.text)
                  .join("\n\n") || text,
              native_log: join(evidenceDir, logName),
              catalogue: this.config.intakeCatalogue,
            },
            null,
            2,
          ),
          { flag: "wx" },
        );
      }

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
        contextLog,
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
      // A process/collection failure must not erase valid native terminal usage.
      // Incomplete or invalid logs stay unknown; never infer missing counters.
      if (!measured) {
        try {
          const events = (await readFile(join(evidenceDir, logName), "utf8"))
            .split(/\r?\n/)
            .filter(Boolean)
            .map(JSON.parse);
          const parsed = await this.runtime.parse(events, {
            evidenceDir,
            allowFailure: true,
          });
          const usage = parsed.usage;
          if (
            ["input_tokens", "cached_input_tokens", "output_tokens"].every(
              (key) => Number.isSafeInteger(usage?.[key]) && usage[key] >= 0,
            ) &&
            usage.cached_input_tokens <= usage.input_tokens
          ) {
            const { text: _text, ...measurement } = parsed;
            measured = measurement;
          }
        } catch {
          // The original error and raw logs remain the failure evidence.
        }
      }
      await writeFile(join(evidenceDir, "error.txt"), err.message);
      const run = {
        model: this.model,
        cli: this.runtime.name,
        workspace: cwd,
        durationMs: Date.now() - started,
        usage: null,
        contextLog,
        ...measured,
        evidenceDir,
        error: err.message,
      };
      await writeFile(
        join(evidenceDir, "run.json"),
        JSON.stringify(run, null, 2),
      );
      return {
        error: err.message,
        metadata: { evidenceDir, run },
        ...(measured
          ? {
              tokenUsage: {
                prompt: measured.usage.input_tokens,
                completion: measured.usage.output_tokens,
                cached: measured.usage.cached_input_tokens,
                total:
                  measured.usage.input_tokens + measured.usage.output_tokens,
              },
            }
          : {}),
      };
    }
  }

  /**
   * Scan the workspace and return structured data for assertions.
   * Collects ALL files — the workspace is fresh per run, so everything is output.
   */
  async collectArtifacts(workspaceDir) {
    const designbookDir = await this.resolveDesignbookDir(workspaceDir);
    const workflowPaths = [];
    let workflowDocuments = [];
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
      workflowDocuments = savedWorkflows(designbookDir);
      for (const { path, document: parsed, error } of workflowDocuments) {
        const file = relative(workspaceDir, path);
        try {
          if (error) throw new Error(error);
          workflowPaths.push(path);
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
                join(workspaceDir, dirname(file), "definition-before.yml"),
                "utf-8",
              ),
            );
            if (!isDeepStrictEqual(before, parsed.definition))
              throw new Error("Definition changed during execution");
          } catch (err) {
            result.definitionErrors.push({
              path: file,
              error: err.message,
            });
          }
        } catch (err) {
          result.workflowErrors.push({ path: file, error: err.message });
        }
      }
    } catch (err) {
      result.workflowErrors.push({ error: err.message });
    }

    if (this.config.definitionSnapshotDir)
      result.definitionErrors.push(
        ...auditDefinitionSnapshots(
          workflowDocuments,
          this.config.definitionSnapshotDir,
        ),
      );
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
