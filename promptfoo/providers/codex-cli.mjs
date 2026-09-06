/**
 * Custom promptfoo provider that uses the Codex CLI binary.
 * This uses the user's CLI subscription (OAuth auth) instead of an API key.
 *
 * Returns structured output for deterministic assertions:
 *   output.text            — raw Codex CLI final message
 *   output.newFiles        — list of new file paths (relative to workspace)
 *   output.completedWorkflows — keyed by workflow id, parsed workflow document
 *   output.archivedWorkflows — compatibility alias for completedWorkflows
 *   output.pendingWorkflows  — keyed by workflow id (indicates failure)
 *   output.fileContents    — parsed YAML/text content of new files
 *   output.fileHashes      — sha256 (hex) of every output file, computed by the
 *                            harness itself (never self-reported by the agent), so
 *                            binary artifacts (e.g. reference PNGs) can be compared
 *                            for identity/difference in a trustworthy way.
 *
 * Workspace setup:
 *   If vars contain `suite` + `case`, runs scripts/setup-test.sh automatically.
 *   Otherwise falls back to vars.workspace (legacy).
 */
import { execFile, execFileSync } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import { readFileSync as readFileSyncFs, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let yaml;
try {
  yaml = require("js-yaml");
} catch {
  // fallback: try from project root
  yaml = require(join(process.cwd(), "node_modules", "js-yaml"));
}

class CodexCliProvider {
  constructor(options = {}) {
    // Promptfoo versions pass provider settings either as `options.config`
    // or directly as the second argument. Accept both so the configured
    // timeout/model are actually honored by the CLI process.
    this.config = options.config || options || {};
    this.model = this.config.model || "gpt-5.6-luna";
    this.timeout = this.config.timeout || 3_600_000;
    this.id = () => `codex-cli:${this.model}`;
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
      const workspaceDir = join(repoRoot, "promptfoo", "workspaces", `${suite}-${caseName}`);

      console.log(`Setting up workspace: ${suite}/${caseName} → ${workspaceDir}`);
      execFileSync(setupScript, [suite, caseName, "--into", workspaceDir], {
        cwd: repoRoot,
        stdio: "pipe",
      });

      // Read prompt from case file if config prompt is a placeholder
      let prompt = configPrompt;
      if (!prompt || prompt === "{{prompt}}") {
        const caseFile = join(repoRoot, "fixtures", suite, "cases", `${caseName}.yaml`);
        if (existsSync(caseFile)) {
          const caseData = yaml.load(readFileSyncFs(caseFile, "utf-8"));
          if (caseData?.prompt) {
            prompt = caseData.prompt.replace(/\{\{workspace\}\}/g, workspaceDir);
          }
        }
      } else {
        prompt = prompt.replace(/\{\{workspace\}\}/g, workspaceDir);
      }

      return { cwd: workspaceDir, prompt };
    }

    // Legacy: workspace path directly in vars
    const cwd = vars?.workspace || process.cwd();
    const prompt = configPrompt?.replace(/\{\{workspace\}\}/g, cwd) || configPrompt;
    return { cwd, prompt };
  }

  async callApi(prompt, context) {
    const { cwd, prompt: resolvedPrompt } = this.setupWorkspace(context?.vars, prompt);
    const args = [
      "exec",
      "--json",
      "--ephemeral",
      "--dangerously-bypass-approvals-and-sandbox",
      "--skip-git-repo-check",
      "--model",
      this.model,
      "-C",
      cwd,
      resolvedPrompt,
    ];

    try {
      const raw = await new Promise((resolve, reject) => {
        console.log(`Running Codex CLI in ${cwd} with model ${this.model}, timeout ${this.timeout}ms`);
        const child = execFile("codex", args, {
          cwd,
          timeout: this.timeout,
          maxBuffer: 50 * 1024 * 1024,
          env: { ...process.env },
        }, (err, stdout, stderr) => {
          if (err && err.killed) {
            reject(new Error(`Codex CLI timed out after ${this.timeout}ms`));
          } else if (err) {
            reject(new Error(`Codex CLI error: ${err.message}\nstderr: ${stderr}`));
          } else {
            resolve(stdout);
          }
        });
        // The prompt is passed as an argv value. Close stdin so Codex does not
        // wait for an additional prompt after completing that request.
        child.stdin?.end();
      });

      const events = String(raw)
        .split(/\r?\n/)
        .filter(Boolean)
        .flatMap((line) => {
          try { return [JSON.parse(line)]; } catch { return []; }
        });
      const messages = events
        .filter((event) => event?.type === "item.completed" && event.item?.type === "agent_message")
        .map((event) => {
          if (typeof event.item.text === "string") return event.item.text;
          if (Array.isArray(event.item.content)) {
            return event.item.content
              .filter((part) => typeof part?.text === "string")
              .map((part) => part.text)
              .join("\n");
          }
          return "";
        })
        .filter(Boolean);
      const usage = events.findLast((event) => event?.type === "turn.completed" && event.usage)?.usage;
      const text = messages.at(-1) || String(raw);

      // Collect all workspace artifacts after the run
      const artifacts = await this.collectArtifacts(cwd);

      const tokenUsage = usage ? {
        prompt: usage.input_tokens || 0,
        completion: usage.output_tokens || 0,
        cached: usage.cached_input_tokens || 0,
        total: (usage.input_tokens || 0) + (usage.output_tokens || 0),
        numRequests: 1,
        completionDetails: { reasoning: usage.reasoning_output_tokens || 0 },
      } : undefined;

      return {
        output: {
          text,
          usage,
          ...artifacts,
        },
        ...(tokenUsage ? { tokenUsage } : {}),
      };
    } catch (err) {
      return { error: err.message };
    }
  }

  /**
   * Scan the workspace and return structured data for assertions.
   * Collects ALL files — the workspace is fresh per run, so everything is output.
   */
  async collectArtifacts(workspaceDir) {
    const designbookDir = await this.resolveDesignbookDir(workspaceDir);
    const result = {
      newFiles: [],
      completedWorkflows: {},
      archivedWorkflows: {},
      pendingWorkflows: {},
      fileContents: {},
      fileHashes: {},
    };

    try {
      // 1. All output files — scan workspace root, exclude noise dirs and workflow internals
      const excludeDirs = new Set(["node_modules", ".git", ".pnpm-store", "vendor"]);
      const designbookRelative = relative(workspaceDir, designbookDir).replaceAll("\\", "/");
      const allOutputFiles = await this.walkDir(workspaceDir, workspaceDir, (rel) => {
        const parts = rel.split("/");
        if (parts.some((part) => excludeDirs.has(part))) return false;
        if (rel.startsWith(`${designbookRelative}/workflows/`)) return false;
        return true;
      }, (rel) => !rel.split("/").some((part) => excludeDirs.has(part)));

      // Keep the public artifact contract stable: files below the configured
      // Designbook home are exposed under the virtual designbook/ prefix.
      const pathMap = new Map();
      result.newFiles = allOutputFiles.map((f) => {
        const actual = f.path.replaceAll("\\", "/");
        const virtual = actual === designbookRelative || actual.startsWith(`${designbookRelative}/`)
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
          const bytes = await readFile(join(workspaceDir, pathMap.get(filePath) || filePath));
          result.fileHashes[filePath] = createHash("sha256").update(bytes).digest("hex");
        } catch {
          // skip unreadable
        }
      }

      // 3. Read both the current and archived static workflow documents.
      // The current contract is { definition, state }; older fixtures used
      // { workflow, ... }. Completed documents are exposed under the key used
      // by the assertions, while incomplete current documents remain pending.
      const parseWorkflowDir = async (dir, source) => {
        const files = await this.walkDir(dir, workspaceDir, () => true);
        for (const f of files.filter((file) => file.path.endsWith("tasks.yml"))) {
          try {
            const parsed = yaml.load(await readFile(join(workspaceDir, f.path), "utf-8"));
            const id = parsed?.definition?.id || parsed?.workflow;
            if (!id) continue;
            const complete = source === "archive" || parsed?.state?.status === "completed";
            const canonicalId = this.canonicalWorkflowId(id);
            if (complete) {
              result.completedWorkflows[id] = parsed;
              result.completedWorkflows[canonicalId] = parsed;
            } else {
              result.pendingWorkflows[id] = parsed;
              result.pendingWorkflows[canonicalId] = parsed;
            }
          } catch {
            // skip malformed workflow documents
          }
        }
      };

      await parseWorkflowDir(join(designbookDir, "workflows", "changes"), "changes");
      await parseWorkflowDir(join(designbookDir, "workflows", "archive"), "archive");
      // A retry can leave an earlier failed document in changes/. Once the
      // canonical workflow has completed, that stale pending entry no longer
      // represents the run's outcome.
      for (const id of Object.keys(result.pendingWorkflows)) {
        if (result.completedWorkflows[id] || result.completedWorkflows[this.canonicalWorkflowId(id)]) {
          delete result.pendingWorkflows[id];
        }
      }
      result.archivedWorkflows = result.completedWorkflows;
    } catch {
      // workspace scan failed
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
          const sub = await this.walkDir(fullPath, baseDir, filter, directoryFilter);
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
    } catch {
      // dir doesn't exist
    }
    return results;
  }

  async resolveDesignbookDir(workspaceDir) {
    const candidates = [join(workspaceDir, "designbook")];
    try {
      const config = yaml.load(await readFile(join(workspaceDir, "designbook.config.yml"), "utf-8"));
      if (config?.designbook?.home) candidates.push(join(workspaceDir, config.designbook.home, "designbook"));
    } catch {
      // Use conventional locations when no config can be read.
    }
    candidates.push(join(workspaceDir, "web", "themes", "custom", "test_integration_drupal", "designbook"));
    // Prefer the directory that actually contains workflow state when a
    // workspace has both a root-level definition staging directory and the
    // configured Drupal Designbook home.
    for (const candidate of candidates) {
      for (const subdir of ["workflows/archive", "workflows/changes"]) {
        try {
          const info = await stat(join(candidate, subdir));
          if (info.isDirectory()) return candidate;
        } catch {
          // continue
        }
      }
    }
    for (const candidate of candidates) {
      try {
        const info = await stat(candidate);
        if (info.isDirectory()) return candidate;
      } catch {
        // continue
      }
    }
    return candidates[0];
  }

  canonicalWorkflowId(id) {
    const names = [
      "design-verify", "design-component", "design-screen", "design-entity",
      "design-shell", "design-guidelines", "design-guideline", "data-model",
      "sample-data", "css-generate", "sync-verify", "sync-to", "sync-scene",
      "shape-section", "sections", "tokens", "vision", "repair",
    ];
    return names.find((name) => id === name || id.startsWith(`${name}-`)) || id;
  }
}

export default function (providerPath, options) {
  // Promptfoo instantiates JavaScript providers with the provider options as
  // the first constructor argument. Keep the two-argument form working for
  // direct callers as well.
  return new CodexCliProvider(options || providerPath || {});
}
