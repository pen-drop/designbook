import { join, relative, resolve } from "node:path";

/** Artifact locations come from effective configuration, never arbitrary path-name matches. */
export function planArtifactContract(workspace, config, fileHashes) {
  if (!fileHashes || typeof fileHashes !== "object")
    throw new Error("Missing intake artifact hash inventory");
  const virtual = (path) => {
    const insideData = relative(config.data, path).replaceAll("\\", "/");
    return !insideData.startsWith("../") && insideData !== ".."
      ? `designbook/${insideData}`.replace(/\/$/, "")
      : relative(workspace, path).replaceAll("\\", "/");
  };
  const directories = [
    config.data,
    config["dirs.components"],
    config["css.dir"],
    config["dirs.css.tokens"],
    config["dirs.css.themes"],
    ...(config["designbook.home"]
      ? [join(config["designbook.home"], "public")]
      : []),
  ];
  const prefixes = [
    ...new Set(
      directories
        .filter(Boolean)
        .map((path) => `${virtual(resolve(workspace, path))}/`),
    ),
  ];
  const files = [config["css.app"]]
    .filter(Boolean)
    .map((path) => virtual(resolve(workspace, path)));
  // Writing the sealed plan IS the plan phase's job, so the plan engine's own
  // output dir (`<data>/plans/`) is excluded from the application-artifact watch
  // set — the old engine excluded its `workflows/` dir for the same reason.
  const exclude = [`${virtual(resolve(workspace, config.data))}/plans/`];
  const contract = { prefixes, files, exclude };
  return { ...contract, hashes: select(fileHashes, contract) };
}

function select(hashes, contract) {
  const exclude = contract.exclude || [];
  return Object.fromEntries(
    Object.entries(hashes)
      .filter(
        ([path]) =>
          (contract.files.includes(path) ||
            contract.prefixes.some((prefix) => path.startsWith(prefix))) &&
          !exclude.some((prefix) => path.startsWith(prefix)),
      )
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

export default function planArtifacts(output, context) {
  const contract = context?.vars?.plan_artifacts;
  if (!contract || !output?.fileHashes)
    return {
      pass: false,
      score: 0,
      reason: "Missing fixed planning artifact inventory",
    };
  const current = select(output.fileHashes, contract);
  const changed = [
    ...new Set([...Object.keys(current), ...Object.keys(contract.hashes)]),
  ].filter((path) => current[path] !== contract.hashes[path]);
  return changed.length
    ? {
        pass: false,
        score: 0,
        reason: `Planning changed application artifacts: ${changed.join(", ")}`,
      }
    : {
        pass: true,
        score: 1,
        reason: "Planning preserved the intake's application artifacts",
      };
}
