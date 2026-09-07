export default function designMainResult(output) {
  const tasks = Object.values(output?.completedWorkflows || {}).flatMap(
    (workflow) => Object.values(workflow.state?.tasks || {}),
  );
  const builds = tasks.flatMap((task) =>
    task.results?.build ? [task.results.build] : [],
  );
  const checks = tasks.flatMap((task) =>
    task.results?.checks ? [task.results.checks] : [],
  );
  const text = (value) => typeof value === "string" && value.trim().length > 0;
  if (
    !builds.length ||
    builds.some(
      (result) =>
        result.valid !== true ||
        result.value?.exitCode !== 0 ||
        !text(result.value?.cwd) ||
        !text(result.value?.stdout) ||
        !result.value?.command?.includes("build-storybook"),
    )
  )
    return {
      pass: false,
      score: 0,
      reason: "Rendered design requires successful recorded Storybook builds",
    };
  if (
    !checks.length ||
    checks.some(
      (result) =>
        result.valid !== true ||
        !Array.isArray(result.value) ||
        !result.value.length ||
        result.value.some(
          (check) =>
            !text(check.url) ||
            check.result?.ok !== true ||
            !check.observations ||
            !Object.keys(check.observations).length,
        ),
    )
  )
    return {
      pass: false,
      score: 0,
      reason:
        "Rendered design requires successful recorded browser observations",
    };
  return {
    pass: true,
    score: 1,
    reason: "Recorded builds and browser checks passed",
  };
}
