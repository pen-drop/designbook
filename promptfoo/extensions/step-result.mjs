import { createHash } from "node:crypto";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}

export const stateHash = (state) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(state)))
    .digest("hex");

/** Check batch completion and ensure the worker touched no other task's state. */
export default function stepResult(output, context) {
  const expected = context?.vars?.step_contract;
  const fail = (reason) => ({ pass: false, score: 0, reason });
  if (!expected?.taskIds?.length || !expected.stateHashes)
    return fail("Missing fixed step contract");
  const workflows = {
    ...output?.completedWorkflows,
    ...output?.pendingWorkflows,
  };
  if (Object.keys(workflows).length !== 1 || !workflows[expected.workflow])
    return fail("Executor changed the workflow scope");
  const doc = workflows[expected.workflow];
  const selected = doc.definition.tasks
    .filter((task) => task.step === expected.step)
    .map((task) => task.id);
  if (
    JSON.stringify([...selected].sort()) !==
    JSON.stringify([...expected.taskIds].sort())
  )
    return fail("Executor changed the assigned task set");
  if (
    JSON.stringify(Object.keys(doc.state.tasks).sort()) !==
    JSON.stringify(Object.keys(expected.stateHashes).sort())
  )
    return fail("Executor changed the saved task set");
  for (const [id, hash] of Object.entries(expected.stateHashes)) {
    if (selected.includes(id)) {
      if (doc.state.tasks[id]?.status !== "done")
        return fail(`Assigned task ${id} is not done`);
    } else if (stateHash(doc.state.tasks[id]) !== hash)
      return fail(`Executor changed another step's task ${id}`);
  }
  return { pass: true, score: 1, reason: "Only the assigned batch completed" };
}
