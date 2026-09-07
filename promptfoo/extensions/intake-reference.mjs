import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Validate enriched references before freezing them; expose no complete extraction in the handoff. */
export function validateIntakeReferences(
  { rows, metadata, dataDir, publications, evidenceDir, workspace },
  run,
) {
  const selected = rows.filter(
    (row) => row["reference selector"] !== "no reference",
  );
  if (!selected.length) return { pass: true, references: [] };
  const paths = new Set();
  for (const row of selected) {
    const matches = Object.entries(metadata).filter(
      ([, meta]) =>
        meta.role === "reference" &&
        meta.elements?.some(
          (element) =>
            element.id === row.subject &&
            element.locator?.value === row["reference selector"],
        ),
    );
    if (matches.length !== 1)
      return {
        pass: false,
        reason: `Intake reference is missing or ambiguous for ${row.subject}`,
      };
    const [path, meta] = matches[0];
    const element = meta.elements.find((entry) => entry.id === row.subject);
    for (const view of row.breakpoints.split(/[\s,]+/).filter(Boolean)) {
      if (
        !element.views?.some(
          (entry) => entry.id === view || entry.breakpoint === view,
        )
      )
        return {
          pass: false,
          reason: `Intake reference omits view ${view} for ${row.subject}`,
        };
    }
    const directory = dirname(join(dataDir, path.slice("designbook/".length)));
    if (
      !publications?.some(
        (entry) => resolve(entry.directory) === resolve(directory),
      )
    )
      return {
        pass: false,
        reason: `Intake reference has no completed capture publication for ${row.subject}`,
      };
    paths.add(directory);
  }
  const invoke =
    run ||
    ((args) =>
      execFileSync(
        "node",
        [
          join(repo, "packages/storybook-addon-designbook/dist/cli.js"),
          ...args,
        ],
        {
          cwd: workspace,
          encoding: "utf8",
          maxBuffer: 5 * 1024 * 1024,
          stdio: ["ignore", "pipe", "pipe"],
        },
      ));
  const references = [];
  try {
    for (const reference of paths) {
      const result = JSON.parse(
        invoke(["reference", "validate", "--reference", reference]),
      );
      if (result.pass !== true)
        throw new Error("Reference CLI did not return a passing validation");
      const publication = publications.find(
        (entry) => resolve(entry.directory) === resolve(reference),
      );
      if (
        result.binding?.id !== publication.id ||
        result.binding?.revision !== publication.revision
      )
        throw new Error(
          "Reference publication binding differs from the completed capture",
        );
      references.push({ reference, ...result });
    }
    return { pass: true, references };
  } catch (error) {
    const detail = String(error.stderr || error.message);
    writeFileSync(join(evidenceDir, "reference-validation-error.txt"), detail);
    return {
      pass: false,
      reason: `Published reference validation failed: ${detail.slice(0, 1500)}`,
      references,
    };
  }
}
