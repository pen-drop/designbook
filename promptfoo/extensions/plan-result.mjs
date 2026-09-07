import { fixedWorkflowsUnchanged } from "./step-result.mjs";

export default function planResult(output, context) {
  const contract = context?.vars?.plan_contract;
  const fail = (reason) => ({ pass: false, score: 0, reason });
  if (!contract?.workflow || !contract.fixedWorkflows)
    return fail("Missing fixed planning workflow contract");
  if (!fixedWorkflowsUnchanged(output, contract.fixedWorkflows))
    return fail("Planning changed a completed capture workflow");
  if (
    Object.keys(output?.completedWorkflows || {}).length !==
      Object.keys(contract.fixedWorkflows).length ||
    Object.keys(output?.pendingWorkflows || {}).length !== 1
  )
    return fail("Planning changed the workflow scope");
  const document = output.pendingWorkflows[contract.workflow];
  const tasks = Object.values(document?.state?.tasks || {});
  if (
    document?.state?.status !== "pending" ||
    !tasks.length ||
    tasks.some(
      (task) =>
        task.status !== "pending" ||
        task.attempts !== 0 ||
        Object.keys(task.results || {}).length !== 0,
    )
  )
    return fail("Planning must leave every design task pending and unexecuted");
  return {
    pass: true,
    score: 1,
    reason: "Fixed capture retained; design plan pending",
  };
}
