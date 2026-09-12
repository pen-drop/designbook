import test from "node:test";
import assert from "node:assert/strict";
import designMainResult from "../extensions/design-main-result.mjs";

const evidence = () => ({
  completedWorkflows: {
    main: {
      state: {
        tasks: {
          validate: {
            results: {
              build: {
                valid: true,
                value: {
                  command: "pnpm build-storybook",
                  cwd: "/workspace",
                  exitCode: 0,
                  stdout: "Build completed",
                },
              },
              checks: {
                valid: true,
                value: [
                  {
                    url: "http://localhost:6118/iframe.html?id=shell",
                    result: { ok: true },
                    observations: { header: "visible" },
                  },
                ],
              },
            },
          },
        },
      },
    },
  },
});

test("completed state alone cannot pass rendered-design acceptance", () => {
  assert.equal(
    designMainResult({
      completedWorkflows: { main: { state: { status: "completed" } } },
    }).pass,
    false,
  );
  const output = evidence();
  assert.equal(designMainResult(output).pass, true);
  output.completedWorkflows.main.state.tasks.validate.results.build.value.exitCode = 1;
  assert.equal(designMainResult(output).pass, false);
});

test("missing, invalid or failed browser observations fail the main gate", () => {
  for (const checks of [
    [],
    [
      {
        url: "http://localhost",
        result: { ok: false },
        observations: { error: true },
      },
    ],
    [{ url: "http://localhost", result: { ok: true }, observations: {} }],
  ]) {
    const output = evidence();
    output.completedWorkflows.main.state.tasks.validate.results.checks.value =
      checks;
    assert.equal(designMainResult(output).pass, false);
  }
});
