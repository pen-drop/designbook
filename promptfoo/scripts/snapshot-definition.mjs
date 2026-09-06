#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import yaml from "js-yaml";

const path = process.argv[2];
if (!path) throw new Error("Usage: snapshot-definition.mjs <saved-tasks.yml>");
const document = yaml.load(readFileSync(path, "utf8"));
if (!document?.definition)
  throw new Error("Expected a saved workflow document");
// JSON is valid YAML and preserves embedded multiline strings exactly.
writeFileSync(
  join(dirname(path), "definition-before.yml"),
  JSON.stringify(document.definition, null, 2) + "\n",
  { flag: "wx" },
);
