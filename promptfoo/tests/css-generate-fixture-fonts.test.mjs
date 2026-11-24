import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "../..");

function fontDeclarations(css) {
  return [...css.matchAll(/--font-[A-Za-z0-9-]+\s*:\s*([^;]+);/g)].map(
    ([, value]) => value.trim(),
  );
}

test("vue-web css-generate --font-* tokens are concrete families", () => {
  const css = readFileSync(
    join(
      repo,
      "fixtures/vue-web/css-generate/css/tokens/primitive-font.src.css",
    ),
    "utf8",
  );
  const values = fontDeclarations(css);
  assert.ok(values.length > 0, "expected --font-* declarations");
  for (const value of values) {
    assert.doesNotMatch(
      value,
      /\{/,
      `unresolved alias in --font-* value: ${value}`,
    );
  }
  assert.match(css, /--font-heading\s*:/);
});

test("vue-web css-generate font jsonata walks primitive.fontFamily", () => {
  const jsonata = readFileSync(
    join(
      repo,
      "fixtures/vue-web/css-generate/designbook/designbook-css-tailwind/generate-primitive-font.jsonata",
    ),
    "utf8",
  );
  assert.match(jsonata, /primitive\.fontFamily/);
  assert.doesNotMatch(jsonata, /primitive\.typography/);
});

test("vue-web css-generate fixture wires app.src.css to token index", () => {
  const app = readFileSync(
    join(repo, "fixtures/vue-web/css-generate/css/app.src.css"),
    "utf8",
  );
  assert.match(app, /@import\s+["']\.\/tokens\/index\.src\.css["']/);
});

test("stale primitive.typography jsonata is gone from vue-web css-generate", () => {
  assert.equal(
    existsSync(
      join(
        repo,
        "fixtures/vue-web/css-generate/designbook/designbook-css-tailwind/generate-primitive-typography.jsonata",
      ),
    ),
    false,
  );
});
