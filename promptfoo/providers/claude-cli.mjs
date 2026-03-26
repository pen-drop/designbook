/**
 * Custom promptfoo provider that uses the `claude` CLI binary.
 * This uses the user's CLI subscription (OAuth auth) instead of an API key.
 *
 * Returns structured output for deterministic assertions:
 *   output.text            — raw Claude CLI output
 *   output.newFiles        — list of new file paths (relative to workspace)
 *   output.archivedWorkflows — keyed by workflow id, parsed tasks.yml
 *   output.pendingWorkflows  — keyed by workflow id (indicates failure)
 *   output.fileContents    — parsed YAML/text content of new files
 */
import { execFile } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let yaml;
try {
  yaml = require("js-yaml");
} catch {
  // fallback: try from project root
  yaml = require(join(process.cwd(), "node_modules", "js-yaml"));
}

class ClaudeCliProvider {
  constructor(options = {}) {
    this.config = options.config || {};
    this.model = this.config.model || "claude-sonnet-4-6";
    this.timeout = this.config.timeout || 600_000;
    this.id = () => `claude-cli:${this.model}`;
  }

  async callApi(prompt, context) {
    const cwd = context?.vars?.workspace || process.cwd();
    const args = [
      "--print",
      "--model",
      this.model,
      "--max-turns",
      String(this.config.max_turns || 100),
      "--dangerously-skip-permissions",
      prompt,
    ];

    try {
      const text = await new Promise((resolve, reject) => {
        console.log(`Running Claude CLI with args: ${args.join(" ")} ::::`, this.timeout);
        execFile("claude", args, {
          cwd,
          timeout: this.timeout,
          maxBuffer: 10 * 1024 * 1024,
          env: { ...process.env },
        }, (err, stdout, stderr) => {
          if (err && err.killed) {
            reject(new Error(`claude CLI timed out after ${this.timeout}ms`));
          } else if (err) {
            reject(new Error(`claude CLI error: ${err.message}\nstderr: ${stderr}`));
          } else {
            resolve(stdout);
          }
        });
      });

      // Collect all workspace artifacts after the run
      const artifacts = await this.collectArtifacts(cwd);

      return {
        output: {
          text,
          ...artifacts,
        },
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
    const designbookDir = join(workspaceDir, "designbook");
    const result = {
      newFiles: [],
      archivedWorkflows: {},
      pendingWorkflows: {},
      fileContents: {},
    };

    try {
      // 1. All output files — scan workspace root, exclude noise dirs and workflow internals
      const excludeDirs = new Set(["node_modules", ".git", ".pnpm-store"]);
      const allOutputFiles = await this.walkDir(workspaceDir, workspaceDir, (rel) => {
        const first = rel.split("/")[0];
        if (excludeDirs.has(first)) return false;
        if (rel.startsWith("designbook/workflows/")) return false;
        return true;
      });
      result.newFiles = allOutputFiles.map((f) => f.path);

      // 2. Parse content of YAML/MD files
      for (const filePath of result.newFiles) {
        const fullPath = join(workspaceDir, filePath);
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

      // 3. Archived workflows — keyed by workflow id
      const archiveDir = join(designbookDir, "workflows", "archive");
      const archiveFiles = await this.walkDir(archiveDir, workspaceDir, () => true);
      for (const f of archiveFiles.filter((f) => f.path.endsWith("tasks.yml"))) {
        try {
          const raw = await readFile(join(workspaceDir, f.path), "utf-8");
          const parsed = yaml.load(raw);
          if (parsed?.workflow) {
            result.archivedWorkflows[parsed.workflow] = parsed;
          }
        } catch {
          // skip
        }
      }

      // 4. Pending workflows (changes/) — indicates failure
      const changesDir = join(designbookDir, "workflows", "changes");
      const changesFiles = await this.walkDir(changesDir, workspaceDir, () => true);
      for (const f of changesFiles.filter((f) => f.path.endsWith("tasks.yml"))) {
        try {
          const raw = await readFile(join(workspaceDir, f.path), "utf-8");
          const parsed = yaml.load(raw);
          if (parsed?.workflow) {
            result.pendingWorkflows[parsed.workflow] = parsed;
          }
        } catch {
          // skip
        }
      }
    } catch {
      // workspace scan failed
    }

    return result;
  }

  /**
   * Recursively walk a directory and return file info.
   */
  async walkDir(dir, baseDir, filter) {
    const results = [];
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relPath = relative(baseDir, fullPath);
        if (entry.isDirectory()) {
          const sub = await this.walkDir(fullPath, baseDir, filter);
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
}

export default function (providerPath, options) {
  return new ClaudeCliProvider(options);
}
