// Under the MD-plan engine the executor records completion as a checked-off task
// (`- [x]`) and writes each task's declared output files; per-task build/browser
// results no longer live in the plan. So a rendered design's main phase is judged
// by completion — every task of the executed plan is done — and its visual
// fidelity is measured separately by the design-verify score file (verify phase).
export default function designMainResult(output) {
  const workflows = Object.values(output?.completedWorkflows || {});
  const tasks = workflows.flatMap((workflow) =>
    Object.values(workflow.state?.tasks || {}),
  );
  if (!workflows.length || !tasks.length)
    return {
      pass: false,
      score: 0,
      reason: "No completed design plan with executed tasks",
    };
  const unfinished = tasks.filter((task) => task.status !== "done");
  if (unfinished.length)
    return {
      pass: false,
      score: 0,
      reason: `Design plan has ${unfinished.length} unfinished task(s): ${unfinished
        .map((task) => task.name)
        .join(", ")}`,
    };
  return {
    pass: true,
    score: 1,
    reason: "Design plan fully executed (every task done)",
  };
}
