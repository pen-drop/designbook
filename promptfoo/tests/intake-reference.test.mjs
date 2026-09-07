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
    rows: [
      {
        subject: "header",
        "reference selector": "node-42",
        breakpoints: "mobile-frame, xl",
      },
    ],
    metadata: {
      "designbook/references/site/rev/meta.yml": {
        role: "reference",
        elements: [
          {
            id: "header",
            locator: { kind: "figma-node", value: "node-42" },
            views: [
              { id: "mobile-frame" },
              { id: "desktop-frame", breakpoint: "xl" },
            ],
          },
        ],
      },
    },
    publications: [
      {
        id: "site",
        revision: "rev",
        directory: join(root, "data/references/site/rev"),
      },
    ],
    dataDir: join(root, "data"),
    evidenceDir: root,
    workspace: root,
  };
}

test("intake validates the published writer contract through the source-neutral CLI", (t) => {
  const f = fixture(t);
  const result = validateIntakeReferences(f, (args) => {
    assert.deepEqual(args, [
      "reference",
      "validate",
      "--reference",
      f.publications[0].directory,
    ]);
    return JSON.stringify({
      pass: true,
      binding: f.publications[0],
      samples: 2,
    });
  });
  assert.equal(result.pass, true);
  assert.equal(result.references[0].samples, 2);
});

test("missing publication, view, ambiguous locator and CLI failures block intake", (t) => {
  const f = fixture(t);
  assert.match(
    validateIntakeReferences({ ...f, publications: [] }).reason,
    /no completed capture/,
  );
  assert.match(
    validateIntakeReferences({
      ...f,
      rows: [{ ...f.rows[0], breakpoints: "missing" }],
    }).reason,
    /omits view/,
  );
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
  assert.match(
    readFileSync(join(f.evidenceDir, "reference-validation-error.txt"), "utf8"),
    /missing font binary/,
  );
  assert.equal(
    validateIntakeReferences(f, () =>
      JSON.stringify({
        pass: true,
        binding: { id: "site", revision: "another" },
      }),
    ).pass,
    false,
  );
});

test("explicit text-only intake does not invent reference requirements", (t) => {
  const f = fixture(t);
  const result = validateIntakeReferences(
    { ...f, rows: [{ "reference selector": "no reference" }] },
    () => {
      throw new Error("must not run");
    },
  );
  assert.deepEqual(result, { pass: true, references: [] });
});
