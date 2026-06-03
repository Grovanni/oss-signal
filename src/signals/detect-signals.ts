import {
  hasCategory,
  isDependencyLockfile,
  isDependencyManifest,
  normalizedPathIncludes,
  type ClassifiedFile
} from "../classify/classify-file.js";
import { strongFileCategories, type FileCategory } from "../classify/categories.js";
import type { GitHubPullRequestData } from "../github/types.js";

import type { Evidence, Signal } from "./types.js";

export type SignalInput = {
  data: GitHubPullRequestData;
  files: ClassifiedFile[];
  categoryCounts: Record<FileCategory, number>;
};

const authTerms = ["auth", "login", "session", "token", "jwt", "oauth"];
const secretTerms = ["secret", "credential", "credentials", "key"];
const ciDescriptionTerms = ["ci", "workflow", "workflows", "build", "action", "actions"];
const dependencyDescriptionTerms = [
  "dependency",
  "dependencies",
  "package",
  "packages",
  "npm",
  "cargo",
  "pip",
  "gem"
];

export function detectSignals(input: SignalInput): Signal[] {
  const signals: Signal[] = [];
  const fileCount = input.files.length;
  const linesChanged = input.data.pull_request.additions + input.data.pull_request.deletions;
  const largePr = fileCount > 20 || linesChanged > 800;
  const mediumPr = !largePr && (fileCount >= 6 || linesChanged >= 201);
  const body = input.data.pull_request.body.trim();
  const dependencyManifestFiles = input.files.filter(isDependencyManifest);
  const dependencyLockfiles = input.files.filter(isDependencyLockfile);
  const dependencyFiles = input.files.filter((file) => hasCategory(file, "dependencies"));
  const ciFiles = input.files.filter((file) => hasCategory(file, "ci"));
  const securityFiles = input.files.filter((file) => hasCategory(file, "security"));
  const authFiles = input.files.filter((file) => normalizedPathIncludes(file.path, authTerms));
  const secretFiles = input.files.filter((file) => isSecretRelatedPath(file.path));
  const migrationFiles = input.files.filter((file) => hasCategory(file, "migrations"));
  const configurationFiles = input.files.filter((file) => hasCategory(file, "configuration"));
  const documentationFiles = input.files.filter((file) => hasCategory(file, "documentation"));
  const testFiles = input.files.filter((file) => hasCategory(file, "tests"));
  const codeFiles = input.files.filter((file) => hasCategory(file, "code"));
  const strongCategoriesTouched = mixedConcernCategories(input.files);

  if (largePr) {
    signals.push(
      signal("large_pr", "high", "Large pull request", "This PR changes many files or lines.", [
        metadataEvidence(`${fileCount} files, +${input.data.pull_request.additions} / -${input.data.pull_request.deletions}`, "> 20 files or > 800 changed lines")
      ])
    );
  } else if (mediumPr) {
    signals.push(
      signal("medium_pr", "info", "Medium pull request", "This PR is not tiny and may need a normal review pass.", [
        metadataEvidence(`${fileCount} files, +${input.data.pull_request.additions} / -${input.data.pull_request.deletions}`, "6-20 files or 201-800 changed lines")
      ])
    );
  } else {
    signals.push(
      signal("small_pr", "info", "Small pull request", "This PR is small by file and line thresholds.", [
        metadataEvidence(`${fileCount} files, +${input.data.pull_request.additions} / -${input.data.pull_request.deletions}`, "<= 5 files and <= 200 changed lines")
      ])
    );
  }

  if (fileCount > 20) {
    signals.push(
      signal("many_files_changed", "high", "Many files changed", "The number of changed files is high.", [
        metadataEvidence(String(fileCount), "> 20 files changed")
      ])
    );
  }

  if (testFiles.length > 0) {
    signals.push(
      signal("tests_changed", "info", "Tests changed", "At least one test file changed.", fileEvidence(testFiles, "tests"))
    );
  }

  if (codeFiles.length > 0 && testFiles.length === 0) {
    signals.push(
      signal("code_without_tests", "medium", "Code changed without tests", "Code files changed but no test file was detected.", fileEvidence(codeFiles, "code without detected tests"))
    );
  }

  if (testFiles.length === fileCount && fileCount > 0) {
    signals.push(
      signal("tests_only", "info", "Tests-only change", "All changed files are classified as tests.", fileEvidence(testFiles, "all changed files are tests"))
    );
  }

  if (documentationFiles.length === fileCount && fileCount > 0) {
    signals.push(
      signal("docs_only", "info", "Documentation-only change", "All changed files are documentation.", fileEvidence(documentationFiles, "all changed files are documentation"))
    );
  } else if (documentationFiles.length > 0) {
    signals.push(
      signal("docs_changed", "info", "Documentation changed", "Documentation changed with other categories.", fileEvidence(documentationFiles, "documentation changed"))
    );
  }

  if (dependencyManifestFiles.length > 0) {
    signals.push(
      signal("dependency_manifest_changed", "medium", "Dependency manifest changed", "A dependency manifest changed.", fileEvidence(dependencyManifestFiles, "dependency manifest"))
    );
  }

  if (dependencyLockfiles.length > 0) {
    signals.push(
      signal("dependency_lockfile_changed", "medium", "Dependency lockfile changed", "A dependency lockfile changed.", fileEvidence(dependencyLockfiles, "dependency lockfile"))
    );
  }

  if (dependencyFiles.length > 0 && codeFiles.length === 0) {
    signals.push(
      signal("dependency_change_without_code", "medium", "Dependency change without code", "Dependency files changed with little or no code change detected.", fileEvidence(dependencyFiles, "dependency change without code category"))
    );
  }

  if (ciFiles.length > 0) {
    signals.push(
      signal("ci_changed", "medium", "CI changed", "A CI workflow or pipeline file changed.", fileEvidence(ciFiles, "CI path"))
    );
  }

  if (input.data.ci.state === "failure") {
    signals.push(
      signal(
        "ci_checks_failed",
        "high",
        "CI checks failed",
        "GitHub reports failing or errored checks for the PR head commit.",
        ciEvidence(input.data.ci.items.filter((item) => item.state === "failure"), "failing CI item")
      )
    );
  }

  if (input.data.ci.state === "pending") {
    signals.push(
      signal(
        "ci_checks_pending",
        "medium",
        "CI checks pending",
        "GitHub reports pending or in-progress checks for the PR head commit.",
        ciEvidence(input.data.ci.items.filter((item) => item.state === "pending"), "pending CI item")
      )
    );
  }

  if (input.data.ci.state === "unknown" && ciFiles.length > 0) {
    signals.push(
      signal(
        "ci_status_unavailable",
        "medium",
        "CI status unavailable",
        "GitHub did not expose check or status data for the PR head commit.",
        fileEvidence(ciFiles, "CI changed but GitHub CI state is unknown")
      )
    );
  }

  if (ciFiles.length > 0 && dependencyFiles.length > 0) {
    signals.push(
      signal("ci_changed_with_dependency_change", "high", "CI and dependencies changed together", "CI and dependency files changed in the same PR.", [
        ...fileEvidence(ciFiles, "CI changed", 3),
        ...fileEvidence(dependencyFiles, "dependency changed", 3)
      ])
    );
  }

  if (securityFiles.length > 0) {
    const securityLevel = authFiles.length > 0 || secretFiles.length > 0 ? "high" : "medium";
    signals.push(
      signal(
        "security_sensitive_file_changed",
        securityLevel,
        "Security-sensitive path changed",
        "This does not mean a vulnerability exists. It only indicates that extra attention may be useful.",
        fileEvidence(securityFiles, "path contains auth, secrets, credentials, policy, Dockerfile, or CI")
      )
    );
  }

  if (authFiles.length > 0) {
    signals.push(
      signal("auth_related_change", "high", "Authentication-related path changed", "A path references authentication, sessions or tokens.", fileEvidence(authFiles, "path contains auth/login/session/token/jwt/oauth"))
    );
  }

  if (secretFiles.length > 0) {
    signals.push(
      signal("secret_related_change", "high", "Secret-related path changed", "A path references secrets, env files, credentials or keys.", fileEvidence(secretFiles, "path contains secret/env/credential/key"))
    );
  }

  if (migrationFiles.length > 0) {
    signals.push(
      signal("migration_changed", "medium", "Migration or schema changed", "A migration, schema or database path changed.", fileEvidence(migrationFiles, "migration/schema/database path"))
    );
  }

  if (configurationFiles.length > 0) {
    signals.push(
      signal("configuration_changed", "info", "Configuration changed", "A configuration file changed.", fileEvidence(configurationFiles, "configuration file or directory"))
    );
  }

  if (body.length === 0) {
    signals.push(
      signal("empty_description", "medium", "Description missing", "The PR description is empty.", [
        descriptionEvidence("0 characters", "description is empty")
      ])
    );
  }

  if (largePr && body.length < 120) {
    signals.push(
      signal("short_description_for_large_pr", "high", "Short description for large PR", "The PR is large but the description is short.", [
        metadataEvidence(`${fileCount} files, ${linesChanged} changed lines`, "large PR threshold reached"),
        descriptionEvidence(`${body.length} characters`, "< 120 characters")
      ])
    );
  }

  if (ciFiles.length > 0 && !mentionsAny(body, ciDescriptionTerms)) {
    signals.push(
      signal("description_missing_ci_context", "medium", "CI context missing from description", "CI changed but the description does not mention CI, workflows or build context.", fileEvidence(ciFiles, "CI changed without matching description context"))
    );
  }

  if (dependencyFiles.length > 0 && !mentionsAny(body, dependencyDescriptionTerms)) {
    signals.push(
      signal("description_missing_dependency_context", "medium", "Dependency context missing from description", "Dependency files changed but the description does not mention dependency context.", fileEvidence(dependencyFiles, "dependency changed without matching description context"))
    );
  }

  if (strongCategoriesTouched.length >= 4) {
    signals.push(
      signal("mixed_concerns", largePr ? "high" : "medium", "Mixed concerns", "At least four strong file categories changed in the same PR.", [
        metadataEvidence(strongCategoriesTouched.join(", "), ">= 4 strong categories touched")
      ])
    );
  }

  return signals;
}

function signal(
  id: string,
  level: Signal["level"],
  title: string,
  message: string,
  evidence: Evidence[]
): Signal {
  return {
    id,
    level,
    title,
    message,
    evidence
  };
}

function fileEvidence(files: ClassifiedFile[], reason: string, limit = 5): Evidence[] {
  return files.slice(0, limit).map((file) => ({
    kind: "file",
    value: file.path,
    reason
  }));
}

function ciEvidence(
  items: Array<{ kind: string; name: string; status: string; conclusion: string | null }>,
  reason: string
): Evidence[] {
  const evidence = items.slice(0, 5).map((item) => ({
    kind: "metadata" as const,
    value: `${item.kind}:${item.name}`,
    reason: `${reason}; status=${item.status}; conclusion=${item.conclusion ?? "none"}`
  }));

  return evidence.length > 0 ? evidence : [metadataEvidence("github-ci", "GitHub CI state")];
}

function metadataEvidence(value: string, reason: string): Evidence {
  return {
    kind: "metadata",
    value,
    reason
  };
}

function descriptionEvidence(value: string, reason: string): Evidence {
  return {
    kind: "description",
    value,
    reason
  };
}

function mixedConcernCategories(files: ClassifiedFile[]): FileCategory[] {
  const categories = new Set<FileCategory>();

  for (const file of files) {
    addCategoryIfPresent(categories, file, "code");
    addCategoryIfPresent(categories, file, "tests");
    addCategoryIfPresent(categories, file, "documentation");
    addCategoryIfPresent(categories, file, "dependencies");
    addCategoryIfPresent(categories, file, "migrations");
    addCategoryIfPresent(categories, file, "release");

    if (hasCategory(file, "ci")) {
      categories.add("ci");
    }

    if (hasCategory(file, "configuration") && !hasCategory(file, "ci")) {
      categories.add("configuration");
    }

    if (hasCategory(file, "security") && isSecurityConcernPath(file.path)) {
      categories.add("security");
    }
  }

  return strongFileCategories.filter((category) => categories.has(category));
}

function addCategoryIfPresent(
  categories: Set<FileCategory>,
  file: ClassifiedFile,
  category: FileCategory
): void {
  if (hasCategory(file, category)) {
    categories.add(category);
  }
}

function mentionsAny(text: string, terms: string[]): boolean {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function isSecurityConcernPath(path: string): boolean {
  return normalizedPathIncludes(path, authTerms) || isSecretRelatedPath(path);
}

function isSecretRelatedPath(path: string): boolean {
  const normalized = path.replace(/\\/g, "/").toLowerCase();
  const segments = normalized.split("/");
  const filename = segments.at(-1) ?? normalized;

  return (
    filename === ".env" ||
    filename.startsWith(".env.") ||
    segments.includes("env") ||
    secretTerms.some((term) => normalized.includes(term))
  );
}
