import type { AttentionLevel, RecommendedAction, Signal } from "./types.js";

export function chooseRecommendedAction(
  signals: Signal[],
  attention: AttentionLevel
): RecommendedAction {
  const ids = new Set(signals.map((signal) => signal.id));

  if (ids.has("dominant_database_change") && !ids.has("auth_related_change")) {
    return "migration_review";
  }

  if (
    attention === "high" &&
    (ids.has("auth_related_change") ||
      ids.has("secret_related_change") ||
      ids.has("security_sensitive_file_changed"))
  ) {
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

  if (shouldAskForAutomationClarification(ids)) {
    return "ask_for_clarification";
  }

  if (ids.has("code_without_tests")) {
    return "ask_for_tests";
  }

  if (
    ids.has("dependency_manifest_changed") ||
    ids.has("dependency_lockfile_changed") ||
    ids.has("dependency_change_without_code") ||
    ids.has("container_image_update")
  ) {
    return "dependency_review";
  }

  if (ids.has("migration_changed")) {
    return "migration_review";
  }

  if (ids.has("short_description_for_large_pr") || shouldAskForClarification(ids)) {
    return "ask_for_clarification";
  }

  return "normal_review";
}

function shouldAskForClarification(ids: Set<string>): boolean {
  if (!ids.has("empty_description")) {
    return false;
  }

  return [
    "large_pr",
    "many_files_changed",
    "mixed_concerns",
    "ci_status_unavailable",
    "ci_changed",
    "automation_sensitive_file_changed",
    "dependency_manifest_changed",
    "dependency_lockfile_changed",
    "dependency_change_without_code",
    "container_image_update",
    "migration_changed",
    "dominant_database_change",
    "security_sensitive_file_changed",
    "configuration_changed"
  ].some((id) => ids.has(id));
}

function shouldAskForAutomationClarification(ids: Set<string>): boolean {
  return (
    ids.has("empty_description") &&
    ids.has("automation_sensitive_file_changed") &&
    !ids.has("dependency_manifest_changed") &&
    !ids.has("dependency_lockfile_changed")
  );
}
