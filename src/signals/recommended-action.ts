import type { AttentionLevel, RecommendedAction, Signal } from "./types.js";

export function chooseRecommendedAction(
  signals: Signal[],
  attention: AttentionLevel
): RecommendedAction {
  const ids = new Set(signals.map((signal) => signal.id));

  if (attention === "high" && (ids.has("auth_related_change") || ids.has("secret_related_change"))) {
    return "security_review";
  }

  if (
    ids.has("ci_checks_failed") ||
    ids.has("ci_checks_pending") ||
    ids.has("ci_status_unavailable")
  ) {
    return "wait_for_ci";
  }

  if (ids.has("large_pr") || ids.has("mixed_concerns")) {
    return "request_split";
  }

  if (ids.has("code_without_tests")) {
    return "ask_for_tests";
  }

  if (ids.has("dependency_manifest_changed") && ids.has("dependency_lockfile_changed")) {
    return "dependency_review";
  }

  if (ids.has("migration_changed")) {
    return "migration_review";
  }

  if (ids.has("empty_description") || ids.has("short_description_for_large_pr")) {
    return "ask_for_clarification";
  }

  return "normal_review";
}
