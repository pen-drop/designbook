/**
 * Custom promptfoo provider that uses the `claude` CLI binary.
 * This uses the user's CLI subscription (OAuth auth) instead of an API key.
 */
import { execFile } from "node:child_process";

class ClaudeCliProvider {
  constructor(options = {}) {
    this.config = options.config || {};
    this.model = this.config.model || "claude-opus-4-6";
    this.timeout = this.config.timeout || 300_000;
    this.id = () => `claude-cli:${this.model}`;
  }

  async callApi(prompt, context) {
    const cwd = context?.vars?.workspace || process.cwd();
    const args = [
      "--print",
      "--model",
      this.model,
      "--max-turns",
      String(this.config.max_turns || 50),
      "--dangerously-skip-permissions",
      prompt,
    ];

    try {
      const output = await new Promise((resolve, reject) => {
        const proc = execFile("claude", args, {
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

      return { output };
    } catch (err) {
      return { error: err.message };
    }
  }
}

export default function (providerPath, options) {
  return new ClaudeCliProvider(options);
}
