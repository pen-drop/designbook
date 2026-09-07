import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Validate enriched references before freezing them; expose no complete extraction in the handoff. */
export function validateIntakeReferences(
  { rows, metadata, dataDir, catalogue, evidenceDir, workspace },
  run,
) {
  const selected = rows.filter(
    (row) => row["reference selector"] !== "no reference",
  );
  if (!selected.length) return { pass: true, references: [] };
  const contracts = new Map();
  for (const block of Object.values(catalogue?.blocks || {}).flat()) {
    if (block.outputs?.reference && block.outputs?.reference_extract) {
      const contract = {
        referenceSchema: block.outputs.reference.schema,
        extractSchema: block.outputs.reference_extract.schema,
        definitions: block.schemas,
      };
      contracts.set(JSON.stringify(contract), contract);
    }
  }
  if (contracts.size !== 1)
    return {
      pass: false,
      reason:
        "Intake needs one unambiguous effective reference/extract schema contract",
    };
  const paths = new Set();
  for (const row of selected) {
    const matches = Object.entries(metadata).filter(([, meta]) =>
      meta.elements?.some(
        (element) =>
          element.id === row.subject &&
          (element.selector || "full page") === row["reference selector"],
      ),
    );
    if (matches.length !== 1)
      return {
        pass: false,
        reason: `Intake reference is missing or ambiguous for ${row.subject}`,
      };
    paths.add(
      dirname(join(dataDir, matches[0][0].slice("designbook/".length))),
    );
  }
  const contractPath = join(evidenceDir, "reference-contract.json");
  writeFileSync(
    contractPath,
    JSON.stringify([...contracts.values()][0], null, 2),
  );
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
        invoke([
          "reference",
          "validate",
          "--reference",
          reference,
          "--contract",
          contractPath,
        ]),
      );
      if (result.pass !== true)
        throw new Error("Reference CLI did not return a passing validation");
      references.push({ reference, ...result });
    }
    return { pass: true, references };
  } catch (error) {
    const detail = String(error.stderr || error.message);
    writeFileSync(join(evidenceDir, "reference-validation-error.txt"), detail);
    return {
      pass: false,
      reason: `Enriched reference validation failed: ${detail.slice(0, 1500)}`,
      references,
    };
  }
}
