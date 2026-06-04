import type { FileCategory } from "../classify/categories.js";
import type { GitHubPullRequestOutput } from "../github/types.js";
import type {
  AttentionLevel,
  Evidence,
  PriorityFile,
  RecommendedAction,
  ReviewQuestion,
  Signal
} from "../signals/types.js";

export type DataConfidence = {
  source: "github" | "fixture";
  diff_available: boolean;
  file_count_matches_metadata: boolean;
  ci_available: boolean;
};

export type ReviewBriefJson = {
  schema_version: "review-brief.v1";
  repository: GitHubPullRequestOutput["repository"];
  pull_request: GitHubPullRequestOutput["pull_request"];
  size: {
    files: number;
    additions: number;
    deletions: number;
    diff_bytes: number;
    diff_lines: number;
  };
  ci: GitHubPullRequestOutput["ci"];
  categories: Record<FileCategory, number>;
  signals: Signal[];
  attention: AttentionLevel;
  recommended_action: RecommendedAction;
  priority_files: PriorityFile[];
  questions: ReviewQuestion[];
  data_confidence: DataConfidence;
  limitations: string[];
};

export function buildReviewBriefJson(result: GitHubPullRequestOutput): ReviewBriefJson {
  return {
    schema_version: "review-brief.v1",
    repository: result.repository,
    pull_request: result.pull_request,
    size: {
      files: result.files.count,
      additions: result.pull_request.additions,
      deletions: result.pull_request.deletions,
      diff_bytes: result.diff.bytes,
      diff_lines: result.diff.lines
    },
    ci: result.ci,
    categories: result.analysis.categories,
    signals: result.analysis.signals,
    attention: result.analysis.attention,
    recommended_action: result.analysis.recommended_action,
    priority_files: result.analysis.priority_files,
    questions: result.analysis.questions,
    data_confidence: {
      source: result.source,
      diff_available: result.diff.available,
      file_count_matches_metadata: result.files.count === result.pull_request.changed_files,
      ci_available: result.ci.state !== "unknown"
    },
    limitations: [
      ...result.limitations,
      "This brief is based on GitHub metadata, changed files and diff data. It does not replace code review.",
      "OSS Signal does not execute code, install dependencies, approve, reject or score the PR."
    ]
  };
}

export function renderReviewBriefMarkdown(result: GitHubPullRequestOutput): string {
  const brief = buildReviewBriefJson(result);
  const topSignals = brief.signals.slice(0, 5);
  const categoryLines = Object.entries(brief.categories)
    .filter(([, count]) => count > 0)
    .map(([category, count]) => `- ${category}: ${count}`);
  const priorityLines = brief.priority_files.map(
    (file, index) => `${index + 1}. ${file.path} - ${file.reason}`
  );
  const questionLines = brief.questions.map(
    (question, index) => `${index + 1}. ${question.question}`
  );

  return [
    "# PR Brief",
    "",
    "## Summary",
    `- PR: #${brief.pull_request.number} - ${brief.pull_request.title}`,
    `- Repository: ${brief.repository.full_name}`,
    `- Author: ${brief.pull_request.author ?? "unknown"}`,
    `- Target branch: ${brief.pull_request.base.ref}`,
    `- Size: ${brief.size.files} files, +${brief.size.additions} / -${brief.size.deletions} lines`,
    `- CI: ${formatCiSummary(brief.ci)}`,
    `- Attention: ${brief.attention}`,
    "",
    "## Recommended Action",
    formatAction(brief.recommended_action),
    "",
    "## CI",
    ...formatCiSection(brief.ci),
    "",
    "## Why",
    ...(topSignals.length > 0
      ? topSignals.flatMap((signal) => [
          `- ${signal.title}: ${signal.message}`,
          ...formatEvidence(signal.evidence)
        ])
      : ["- No notable deterministic signal beyond normal review context."]),
    "",
    "## Areas Touched",
    ...(categoryLines.length > 0 ? categoryLines : ["- unknown: 0"]),
    "",
    "## Priority Files",
    ...(priorityLines.length > 0 ? priorityLines : ["No priority file identified."]),
    "",
    "## Questions",
    ...(questionLines.length > 0
      ? questionLines
      : ["No specific question generated from detected signals."]),
    "",
    "## Limitations",
    ...brief.limitations.map((limitation) => `- ${limitation}`),
    ""
  ].join("\n");
}

export function renderAgentContextMarkdown(result: GitHubPullRequestOutput): string {
  const brief = buildReviewBriefJson(result);
  const signalLines = brief.signals
    .slice(0, 8)
    .map((signal) => `- ${signal.id} (${signal.level}): ${signal.title}`);
  const priorityLines = brief.priority_files.map((file) => `- ${file.path}: ${file.reason}`);
  const questionLines = brief.questions.map((question) => `- ${question.question}`);

  return [
    "# Agent Context",
    "",
    "## Review Objective",
    "Use this context to decide where human review attention should go first. Do not treat it as an approval, rejection or quality score.",
    "",
    "## Known Facts",
    `- Repository: ${brief.repository.full_name}`,
    `- PR: #${brief.pull_request.number} - ${brief.pull_request.title}`,
    `- Author: ${brief.pull_request.author ?? "unknown"}`,
    `- Branches: ${brief.pull_request.head.ref} -> ${brief.pull_request.base.ref}`,
    `- Size: ${brief.size.files} files, +${brief.size.additions} / -${brief.size.deletions} lines`,
    `- CI: ${formatCiSummary(brief.ci)}`,
    `- Attention: ${brief.attention}`,
    `- Recommended action: ${brief.recommended_action}`,
    "",
    "## Priority Files",
    ...(priorityLines.length > 0 ? priorityLines : ["- None identified."]),
    "",
    "## Signals",
    ...(signalLines.length > 0 ? signalLines : ["- No signal emitted."]),
    "",
    "## Suggested Questions",
    ...(questionLines.length > 0 ? questionLines : ["- No specific question generated."]),
    "",
    "## Constraints",
    "- Do not execute code from the PR.",
    "- Do not install dependencies from the analyzed repository.",
    "- Do not infer intent beyond the evidence listed in the brief.",
    "- Read the diff before making review conclusions.",
    "",
    "## Data Limits",
    ...brief.limitations.map((limitation) => `- ${limitation}`),
    ""
  ].join("\n");
}

function formatEvidence(evidence: Evidence[]): string[] {
  return evidence.slice(0, 3).map((entry) => `  - Evidence: ${entry.value} (${entry.reason})`);
}

function formatCiSummary(ci: GitHubPullRequestOutput["ci"]): string {
  if (ci.total === 0) {
    return `${ci.state} (no GitHub CI items found)`;
  }

  const nonCriticalFailedItems = ci.items.filter(isNonCriticalFailedCiItem);
  const actionableFailedItems = ci.items.filter(isActionableFailedCiItem);

  if (
    ci.state === "failure" &&
    actionableFailedItems.length === 0 &&
    nonCriticalFailedItems.length > 0
  ) {
    return `non-critical (${ci.total} checks/statuses: ${ci.successful} successful, ${nonCriticalFailedItems.length} cancelled/skipped/neutral, ${ci.pending} pending)`;
  }

  return `${ci.state} (${ci.total} checks/statuses: ${ci.successful} successful, ${ci.failed} failed, ${ci.pending} pending)`;
}

function formatCiSection(ci: GitHubPullRequestOutput["ci"]): string[] {
  const lines = [`- State: ${formatCiSummary(ci)}`];
  const attentionItems = ci.items.filter(isActionableAttentionCiItem).slice(0, 5);

  if (attentionItems.length > 0) {
    lines.push(
      ...attentionItems.map(
        (item) => `- ${item.name}: ${item.state} (${item.status}/${item.conclusion ?? "none"})`
      )
    );
    return lines;
  }

  const nonCriticalFailedItems = ci.items.filter(isNonCriticalFailedCiItem).slice(0, 5);

  if (nonCriticalFailedItems.length > 0) {
    lines.push("- Only cancelled, skipped or neutral GitHub CI items were reported.");
    lines.push(
      ...nonCriticalFailedItems.map(
        (item) => `- ${item.name}: ${item.conclusion ?? "non-critical"} (${item.status})`
      )
    );
    return lines;
  }

  if (ci.state === "success") {
    lines.push("- No failed or pending GitHub CI item detected.");
  } else {
    lines.push("- CI data unavailable or no status/check run reported by GitHub.");
  }

  return lines;
}

function isActionableAttentionCiItem(
  item: GitHubPullRequestOutput["ci"]["items"][number]
): boolean {
  return item.state === "pending" || isActionableFailedCiItem(item);
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

function formatAction(action: RecommendedAction): string {
  switch (action) {
    case "ask_for_tests":
      return "Ask for tests before a complete review.";
    case "ask_for_reproduction":
      return "Ask for reproduction details before a complete review.";
    case "ask_for_clarification":
      return "Ask for clarification before a complete review.";
    case "request_split":
      return "Consider asking whether this PR can be split before deep review.";
    case "security_review":
      return "Route attention to a security-sensitive review path first.";
    case "wait_for_ci":
      return "Wait for CI or inspect CI context before deep review.";
    case "dependency_review":
      return "Review dependency changes before normal code review.";
    case "migration_review":
      return "Review migration and rollback context before normal code review.";
    case "normal_review":
      return "Proceed with normal review.";
  }
}
