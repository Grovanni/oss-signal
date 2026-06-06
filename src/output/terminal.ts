import type { GitHubPullRequestOutput } from "../github/types.js";

import type { WrittenOutputs } from "./write-outputs.js";

export function renderTerminalSummary(
  result: GitHubPullRequestOutput,
  written: WrittenOutputs
): string {
  const signals = result.analysis.signals
    .slice(0, 3)
    .map((signal) => signal.id)
    .join(", ");
  const outputs = written.files.map((file) => file.path).join(", ");

  return [
    `PR Signal: ${result.repository.full_name}#${result.pull_request.number}`,
    `Attention: ${result.analysis.attention}`,
    `Action: ${result.analysis.recommended_action}`,
    `Size: ${result.files.count} files, +${result.pull_request.additions} / -${result.pull_request.deletions}`,
    `CI: ${formatCiSummary(result)}`,
    `Signals: ${signals || "none"}`,
    `Outputs: ${outputs || "none"}`
  ].join("\n");
}

function formatCiSummary(result: GitHubPullRequestOutput): string {
  if (result.ci.total === 0) {
    return result.ci.state;
  }

  const nonCriticalFailedItems = result.ci.items.filter(isNonCriticalFailedCiItem);
  const actionableFailedItems = result.ci.items.filter(isActionableFailedCiItem);

  if (
    result.ci.state === "failure" &&
    actionableFailedItems.length === 0 &&
    nonCriticalFailedItems.length > 0
  ) {
    return `non-critical (${nonCriticalFailedItems.length} cancelled/skipped/neutral, ${result.ci.pending} pending)`;
  }

  return `${result.ci.state} (${result.ci.failed} failed, ${result.ci.pending} pending)`;
}

function isActionableFailedCiItem(item: GitHubPullRequestOutput["ci"]["items"][number]): boolean {
  return item.state === "failure" && !isNonCriticalFailedCiItem(item);
}

function isNonCriticalFailedCiItem(item: GitHubPullRequestOutput["ci"]["items"][number]): boolean {
  return (
    item.state === "failure" &&
    ["cancelled", "skipped", "neutral"].includes(item.conclusion?.toLowerCase() ?? "")
  );
}
