import { validateCapturePresentation } from "./design-intake.mjs";
import { stateHash } from "./step-result.mjs";

/** Only published, completed capture workflows may exist before design planning. */
export function validateIntakeCaptures(output, rows) {
  const fixed = {};
  const references = [];
  const fail = (reason) => ({ pass: false, reason });
  if (Object.keys(output?.pendingWorkflows || {}).length)
    return fail(
      "Intake has an incomplete capture or premature design workflow",
    );
  for (const [id, document] of Object.entries(
    output?.completedWorkflows || {},
  )) {
    if (document.definition?.capture?.role !== "reference")
      return fail(`Intake executed a non-reference workflow: ${id}`);
    const publication = document.state?.capture;
    if (
      document.state?.status !== "completed" ||
      !publication?.id ||
      !publication.revision ||
      !publication.directory ||
      !Object.keys(publication.files || {}).length ||
      !Object.keys(document.state.tasks || {}).length ||
      Object.values(document.state.tasks).some((task) => task.status !== "done")
    )
      return fail(`Intake capture has no complete published revision: ${id}`);
    fixed[id] = stateHash(document);
    references.push(publication);
  }
  if (references.length && output.definitionUnchanged !== true)
    return fail("Intake capture definition changed or its snapshot is missing");
  const coverage = validateCapturePresentation(rows, output.completedWorkflows);
  if (!coverage.pass) return coverage;
  return { pass: true, fixed_workflows: fixed, references };
}
