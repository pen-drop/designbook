import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateIntakeReferences } from "../extensions/intake-reference.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "intake-reference-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return {
    rows: [{ subject: "header", "reference selector": "header" }],
    metadata: {
      "designbook/references/site/meta.yml": {
        elements: [{ id: "header", selector: "header" }],
      },
    },
    dataDir: join(root, "data"),
    evidenceDir: root,
    workspace: root,
    catalogue: {
      blocks: {
        extract: [
          {
            outputs: {
              reference: { schema: { type: "object" } },
              reference_extract: {
                schema: { $ref: "#/definitions/CompleteExtract" },
              },
            },
            schemas: {
              CompleteExtract: { type: "object", required: ["subjects"] },
            },
          },
        ],
      },
    },
  };
}

test("intake checks exact effective schemas through the CLI before returning compact validation", (t) => {
  const f = fixture(t);
  const result = validateIntakeReferences(f, (args) => {
    assert.deepEqual(args.slice(0, 3), [
      "reference",
      "validate",
      "--reference",
    ]);
    assert.equal(args[3], join(f.dataDir, "references/site"));
    const contract = JSON.parse(readFileSync(args[5], "utf8"));
    assert.deepEqual(contract.extractSchema, {
      $ref: "#/definitions/CompleteExtract",
    });
    assert.deepEqual(contract.definitions.CompleteExtract.required, [
      "subjects",
    ]);
    return JSON.stringify({ pass: true, samples: 2 });
  });
  assert.equal(result.pass, true);
  assert.equal(result.references.length, 1);
  assert.equal(result.references[0].samples, 2);
});

test("missing contract, ambiguous subject and CLI validation errors fail intake", (t) => {
  const f = fixture(t);
  assert.equal(validateIntakeReferences({ ...f, catalogue: {} }).pass, false);
  const duplicate = {
    ...f.metadata,
    "designbook/references/other/meta.yml": Object.values(f.metadata)[0],
  };
  assert.match(
    validateIntakeReferences({ ...f, metadata: duplicate }).reason,
    /ambiguous/,
  );
  const failed = validateIntakeReferences(f, () => {
    throw new Error("missing font binary");
  });
  assert.equal(failed.pass, false);
  assert.match(failed.reason, /missing font binary/);
  assert.match(
    readFileSync(join(f.evidenceDir, "reference-validation-error.txt"), "utf8"),
    /font binary/,
  );
});

test("explicit text-only intake does not invent reference requirements", (t) => {
  const f = fixture(t);
  const result = validateIntakeReferences(
    { ...f, rows: [{ "reference selector": "no reference" }], catalogue: {} },
    () => {
      throw new Error("must not run");
    },
  );
  assert.deepEqual(result, { pass: true, references: [] });
});
