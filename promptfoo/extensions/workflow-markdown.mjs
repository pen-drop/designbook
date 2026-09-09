/** Fixture setup builds the addon before any saved workflows are exported. */
export async function workflowMarkdown(document) {
  const renderer = await import("../../packages/storybook-addon-designbook/dist/workflow-markdown.js");
  return renderer.workflowMarkdown(document);
}
