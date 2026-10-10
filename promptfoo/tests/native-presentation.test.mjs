import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  nativeEntries,
  compositionPresentation,
} from "../providers/native-presentation.mjs";

const repo = join(dirname(fileURLToPath(import.meta.url)), "../..");
const tree = `Scene "Signage" (standalone) sections/signage/signage.section.scenes.yml
└─ paragraph.signage [full] record 0 → test_integration_vue:signage (neu)
   ├─ prop style ← field_paragraph_style
   ├─ prop overlapping ← field_overlapping_top
   └─ slot items ← field_signage_item (reference, 3 selected records)
      └─ paragraph.signage_item [full] → test_integration_vue:signage_item (neu)
         ├─ prop title ← field_title
         ├─ prop description ← field_description
         ├─ prop icon ← field_icon
         ├─ prop links ← field_links
         ├─ prop buttonAnonymous ← field_button_anonymous
         └─ prop buttonAuthenticated ← field_button_authenticated`;

const choices =
  "Choose: run here (ephemeral), hand off (persist without execute), or cancel.";
const build =
  "_debo plan build design-entity --tasks tasks.json --name design-entity --format json";

function message(text) {
  return {
    type: "item.completed",
    item: { type: "agent_message", text },
  };
}
function command(cmd) {
  return {
    type: "item.started",
    item: { type: "command_execution", command: cmd },
  };
}

test("nativeEntries keeps assistant prose and command starts, not tool results", () => {
  const entries = nativeEntries([
    message("hello"),
    command("ls"),
    { type: "item.completed", item: { type: "command_execution", output: tree } },
  ]);
  assert.deepEqual(entries, [{ text: "hello" }, { command: "ls" }]);
});

test("accepts the exact expected tree in assistant prose before the first plan build", () => {
  const result = compositionPresentation(
    [
      command("_debo plan tree tasks.json --workflow design-entity"),
      message(`Selector table stays.\n\n${tree}`),
      command(build),
    ],
    tree,
  );
  assert.equal(result.ok, true, result.reason);
});

test("rejects a missing tree, including a no-questions request", () => {
  const result = compositionPresentation(
    [
      message("No questions. Executing the design-entity workflow now."),
      command(build),
    ],
    tree,
  );
  assert.equal(result.ok, false);
  assert.match(result.reason, /missing|not presented/i);
});

test("rejects a tree presented after the first plan build", () => {
  const result = compositionPresentation(
    [command(build), message(tree)],
    tree,
  );
  assert.equal(result.ok, false);
  assert.match(result.reason, /after|late|before/i);
});

test("rejects a paraphrased or keyword-only tree", () => {
  const keywords = compositionPresentation(
    [
      message("Composition tree: Scene Signage maps field_signage_item to items."),
      command(build),
    ],
    tree,
  );
  assert.equal(keywords.ok, false);
  const swapped = compositionPresentation(
    [
      message(
        tree
          .replaceAll("field_paragraph_style", "__TMP__")
          .replaceAll("field_overlapping_top", "field_paragraph_style")
          .replaceAll("__TMP__", "field_overlapping_top"),
      ),
      command(build),
    ],
    tree,
  );
  assert.equal(swapped.ok, false);
});

test("in ask mode the tree precedes the three choices", () => {
  const ok = compositionPresentation(
    [message(tree), message(choices), command(build)],
    tree,
    { ask: true },
  );
  assert.equal(ok.ok, true, ok.reason);
  const late = compositionPresentation(
    [message(choices), message(tree), command(build)],
    tree,
    { ask: true },
  );
  assert.equal(late.ok, false);
  assert.match(late.reason, /choice|ask/i);
});

test("a tree that exists only as command output is not presentation", () => {
  const result = compositionPresentation(
    [
      command("_debo plan tree tasks.json --workflow design-entity"),
      {
        type: "item.completed",
        item: { type: "command_execution", output: tree },
      },
      command(build),
    ],
    tree,
  );
  assert.equal(result.ok, false);
});

const workflows = [
  "design-entity",
  "design-component",
  "design-screen",
  "design-shell",
];

test("all four design intakes reach write-planning.md and do not duplicate the tree", () => {
  for (const name of workflows) {
    const skill = readFileSync(
      join(repo, `.agents/skills/designbook/skills/${name}/SKILL.md`),
      "utf8",
    );
    assert.match(skill, /resources\/intake\.md/);
    const intake = readFileSync(
      join(repo, `.agents/skills/designbook/skills/${name}/resources/intake.md`),
      "utf8",
    );
    assert.match(intake, /write-planning\.md/);
    assert.doesNotMatch(intake, /plan tree/);
  }
  const planning = readFileSync(
    join(repo, ".agents/skills/designbook/design/resources/write-planning.md"),
    "utf8",
  );
  assert.match(planning, /plan tree/);
  const building = readFileSync(
    join(repo, ".agents/skills/designbook/resources/workflow-building.md"),
    "utf8",
  );
  assert.match(building, /plan tree/);
  assert.match(building, /ask/i);
});

test("composition-presentation extension reads native logs and the expected tree", async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import(
    "node:fs"
  );
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { default: assertPresentation } = await import(
    "../extensions/composition-presentation.mjs"
  );
  const dir = mkdtempSync(join(tmpdir(), "composition-presentation-"));
  try {
    mkdirSync(join(dir, "evidence"));
    writeFileSync(
      join(dir, "evidence/codex.jsonl"),
      [
        JSON.stringify(message(tree)),
        JSON.stringify(command(build)),
      ].join("\n"),
    );
    const ok = assertPresentation(
      { evidenceDir: join(dir, "evidence"), workspace: dir },
      { vars: { composition_tree: tree, plan_contract: { workflow: "design-entity" } } },
    );
    assert.equal(ok.pass, true, ok.reason);
    const missing = assertPresentation(
      { evidenceDir: join(dir, "missing"), workspace: dir },
      { vars: { composition_tree: tree, plan_contract: { workflow: "design-entity" } } },
    );
    assert.equal(missing.pass, false);
    const skipped = assertPresentation(
      { evidenceDir: join(dir, "evidence") },
      { vars: { plan_contract: { workflow: "vision" } } },
    );
    assert.equal(skipped.pass, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("GAIA spec publication copies sealed-plan tree with path, revision and digest", () => {
  const skill = readFileSync(
    join(
      repo,
      ".agents/skills/designbook-gaia/skills/debo-designbook-design/SKILL.md",
    ),
    "utf8",
  );
  assert.match(skill, /plan tree/);
  assert.match(skill, /digest/i);
  assert.match(skill, /revision/i);
});
