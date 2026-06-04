import {
  hasCategory,
  hasAuthSensitivePathTerm,
  hasSecretSensitivePathTerm,
  isDependencyLockfile,
  isDependencyManifest,
  isLocalizationCatalogPath,
  type ClassifiedFile
} from "../classify/classify-file.js";
import { strongFileCategories, type FileCategory } from "../classify/categories.js";
import type { OssSignalConfig } from "../config/config.js";
import type { GitHubPullRequestData } from "../github/types.js";

import type { Evidence, Signal } from "./types.js";

export type SignalInput = {
  data: GitHubPullRequestData;
  files: ClassifiedFile[];
  categoryCounts: Record<FileCategory, number>;
  config: OssSignalConfig;
};

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
  const additions = input.files.reduce((total, file) => total + file.additions, 0);
  const deletions = input.files.reduce((total, file) => total + file.deletions, 0);
  const linesChanged = additions + deletions;
  const thresholds = input.config.attention_thresholds;
  const largePr =
    fileCount > thresholds.large_files_changed || linesChanged > thresholds.large_lines_changed;
  const mediumPr =
    !largePr &&
    (fileCount >= thresholds.medium_files_changed ||
      linesChanged >= thresholds.medium_lines_changed);
  const body = input.data.pull_request.body.trim();
  const titleAndBody = `${input.data.pull_request.title} ${body}`.toLowerCase();
  const dependencyManifestFiles = input.files.filter(isDependencyManifest);
  const dependencyLockfiles = input.files.filter(isDependencyLockfile);
  const dependencyFiles = input.files.filter((file) => hasCategory(file, "dependencies"));
  const ciFiles = input.files.filter((file) => hasCategory(file, "ci"));
  const automationFiles = input.files.filter((file) => hasCategory(file, "automation"));
  const securityFiles = input.files.filter((file) => hasCategory(file, "security"));
  const authFiles = input.files.filter((file) => isAuthRelatedPath(file.path));
  const secretFiles = input.files.filter((file) => isSecretRelatedPath(file.path));
  const migrationFiles = input.files.filter((file) => hasCategory(file, "migrations"));
  const configurationFiles = input.files.filter((file) => hasCategory(file, "configuration"));
  const documentationFiles = input.files.filter((file) => hasCategory(file, "documentation"));
  const testFiles = input.files.filter((file) => hasCategory(file, "tests"));
  const codeFiles = input.files.filter((file) => hasCategory(file, "code"));
  const releaseFiles = input.files.filter((file) => hasCategory(file, "release"));
  const localizationCatalogFiles = input.files.filter((file) =>
    isLocalizationCatalogPath(file.path)
  );
  const localizationCatalogRefresh = isLocalizationCatalogRefresh(
    input.files,
    localizationCatalogFiles
  );
  const persistenceFiles = input.files.filter((file) => isPersistenceDataFormatPath(file.path));
  const releaseVersionUpdate = isReleaseVersionUpdate(
    input.files,
    codeFiles,
    dependencyFiles,
    releaseFiles,
    titleAndBody
  );
  const reportsPersistenceDataFormat = shouldReportPersistenceDataFormatChange(
    codeFiles,
    persistenceFiles,
    titleAndBody
  );
  const failedCiItems = input.data.ci.items.filter((item) => item.state === "failure");
  const actionableFailedCiItems = failedCiItems.filter(isActionableCiFailure);
  const nonActionableFailedCiItems = failedCiItems.filter((item) => !isActionableCiFailure(item));
  const strongCategoriesTouched = mixedConcernCategories(input.files);
  const dominantDatabaseChange = isDominantDatabaseChange(input.files, migrationFiles);

  if (largePr && !localizationCatalogRefresh) {
    signals.push(
      signal("large_pr", "high", "Large pull request", "This PR changes many files or lines.", [
        metadataEvidence(
          `${fileCount} analyzed files, +${additions} / -${deletions}`,
          `> ${thresholds.large_files_changed} files or > ${thresholds.large_lines_changed} changed lines`
        )
      ])
    );
  } else if (mediumPr || (largePr && localizationCatalogRefresh)) {
    signals.push(
      signal(
        "medium_pr",
        "info",
        "Medium pull request",
        "This PR is not tiny and may need a normal review pass.",
        [
          metadataEvidence(
            `${fileCount} analyzed files, +${additions} / -${deletions}`,
            `>= ${thresholds.medium_files_changed} files or >= ${thresholds.medium_lines_changed} changed lines`
          )
        ]
      )
    );
  } else {
    signals.push(
      signal(
        "small_pr",
        "info",
        "Small pull request",
        "This PR is small by file and line thresholds.",
        [
          metadataEvidence(
            `${fileCount} analyzed files, +${additions} / -${deletions}`,
            `< ${thresholds.medium_files_changed} files and < ${thresholds.medium_lines_changed} changed lines`
          )
        ]
      )
    );
  }

  if (fileCount > thresholds.large_files_changed && !localizationCatalogRefresh) {
    signals.push(
      signal(
        "many_files_changed",
        "high",
        "Many files changed",
        "The number of changed files is high.",
        [metadataEvidence(String(fileCount), `> ${thresholds.large_files_changed} files changed`)]
      )
    );
  }

  if (localizationCatalogFiles.length > 0) {
    signals.push(
      signal(
        "localization_catalog_change",
        "info",
        localizationCatalogRefresh
          ? "Localization catalog refresh"
          : "Localization catalog changed",
        localizationCatalogRefresh
          ? "Changed files are predominantly localization catalogs."
          : "At least one localization catalog changed.",
        fileEvidence(localizationCatalogFiles, "localization catalog")
      )
    );
  }

  if (testFiles.length > 0) {
    signals.push(
      signal(
        "tests_changed",
        "info",
        "Tests changed",
        "At least one test file changed.",
        fileEvidence(testFiles, "tests")
      )
    );
  }

  if (codeFiles.length > 0 && testFiles.length === 0 && !releaseVersionUpdate) {
    signals.push(
      signal(
        "code_without_tests",
        "medium",
        "Code changed without tests",
        "Code files changed but no test file was detected.",
        fileEvidence(codeFiles, "code without detected tests")
      )
    );
  }

  if (testFiles.length === fileCount && fileCount > 0) {
    signals.push(
      signal(
        "tests_only",
        "info",
        "Tests-only change",
        "All changed files are classified as tests.",
        fileEvidence(testFiles, "all changed files are tests")
      )
    );
  }

  if (documentationFiles.length === fileCount && fileCount > 0) {
    signals.push(
      signal(
        "docs_only",
        "info",
        "Documentation-only change",
        "All changed files are documentation.",
        fileEvidence(documentationFiles, "all changed files are documentation")
      )
    );
  } else if (documentationFiles.length > 0) {
    signals.push(
      signal(
        "docs_changed",
        "info",
        "Documentation changed",
        "Documentation changed with other categories.",
        fileEvidence(documentationFiles, "documentation changed")
      )
    );
  }

  if (dependencyManifestFiles.length > 0) {
    signals.push(
      signal(
        "dependency_manifest_changed",
        "medium",
        "Dependency manifest changed",
        "A dependency manifest changed.",
        fileEvidence(dependencyManifestFiles, "dependency manifest")
      )
    );
  }

  if (dependencyLockfiles.length > 0) {
    signals.push(
      signal(
        "dependency_lockfile_changed",
        "medium",
        "Dependency lockfile changed",
        "A dependency lockfile changed.",
        fileEvidence(dependencyLockfiles, "dependency lockfile")
      )
    );
  }

  if (dependencyFiles.length > 0 && codeFiles.length === 0) {
    signals.push(
      signal(
        "dependency_change_without_code",
        "medium",
        "Dependency change without code",
        "Dependency files changed with little or no code change detected.",
        fileEvidence(dependencyFiles, "dependency change without code category")
      )
    );
  }

  if (releaseVersionUpdate) {
    signals.push(
      signal(
        "release_version_update",
        "info",
        "Release/version update",
        "The title and changed files look like a coherent version or release update.",
        releaseEvidence(releaseFiles, dependencyFiles)
      )
    );
  }

  if (ciFiles.length > 0) {
    signals.push(
      signal(
        "ci_changed",
        "medium",
        "CI changed",
        "A CI workflow or pipeline file changed.",
        fileEvidence(ciFiles, "CI path")
      )
    );
  }

  if (input.data.ci.state === "failure" && actionableFailedCiItems.length > 0) {
    signals.push(
      signal(
        "ci_checks_failed",
        "high",
        "CI checks failed",
        "GitHub reports failing or errored checks for the PR head commit.",
        ciEvidence(actionableFailedCiItems, "failing CI item")
      )
    );
  } else if (input.data.ci.state === "failure" && nonActionableFailedCiItems.length > 0) {
    signals.push(
      signal(
        "ci_checks_noncritical",
        "info",
        "Cancelled/skipped CI items reported",
        "GitHub only reports cancelled, skipped or neutral CI items for the PR head commit.",
        ciEvidence(nonActionableFailedCiItems, "non-critical CI item")
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
        ciEvidence(
          input.data.ci.items.filter((item) => item.state === "pending"),
          "pending CI item"
        )
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
      signal(
        "ci_changed_with_dependency_change",
        input.data.ci.state === "success" ? "medium" : "high",
        "CI and dependencies changed together",
        "CI and dependency files changed in the same PR.",
        [
          ...fileEvidence(ciFiles, "CI changed", 3),
          ...fileEvidence(dependencyFiles, "dependency changed", 3)
        ]
      )
    );
  }

  if (automationFiles.length > 0) {
    signals.push(
      signal(
        "automation_sensitive_file_changed",
        "medium",
        "Automation-sensitive workflow changed",
        "Automation files can affect CI, releases, permissions or supply chain behavior.",
        fileEvidence(automationFiles, "automation path")
      )
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
        fileEvidence(
          securityFiles,
          "path contains auth, session, token, secret, credential, crypto, permission or security"
        )
      )
    );
  }

  if (authFiles.length > 0) {
    signals.push(
      signal(
        "auth_related_change",
        "high",
        "Authentication-related path changed",
        "A path references authentication, sessions or tokens.",
        fileEvidence(authFiles, "path contains auth/login/session/token/jwt/oauth")
      )
    );
  }

  if (secretFiles.length > 0) {
    signals.push(
      signal(
        "secret_related_change",
        "high",
        "Secret-related path changed",
        "A path references secrets, env files, credentials or keys.",
        fileEvidence(secretFiles, "path contains secret/env/credential/key")
      )
    );
  }

  if (migrationFiles.length > 0) {
    signals.push(
      signal(
        "migration_changed",
        "medium",
        "Migration or schema changed",
        "A migration, schema or database path changed.",
        fileEvidence(migrationFiles, "migration/schema/database path")
      )
    );
  }

  if (dominantDatabaseChange) {
    signals.push(
      signal(
        "dominant_database_change",
        "medium",
        "Database/schema-dominant change",
        "Migration, schema or database paths dominate the changed-file evidence.",
        fileEvidence(migrationFiles, "dominant migration/schema/database path")
      )
    );
  }

  if (reportsPersistenceDataFormat) {
    signals.push(
      signal(
        "persistence_data_format_change",
        "medium",
        "Persistence or data format change",
        "Paths or PR text reference persisted data, serialization or file-format behavior.",
        persistenceEvidence(persistenceFiles)
      )
    );
  }

  if (configurationFiles.length > 0) {
    signals.push(
      signal(
        "configuration_changed",
        "info",
        "Configuration changed",
        "A configuration file changed.",
        fileEvidence(configurationFiles, "configuration file or directory")
      )
    );
  }

  if (body.length === 0) {
    signals.push(
      signal("empty_description", "medium", "Description missing", "The PR description is empty.", [
        descriptionEvidence("0 characters", "description is empty")
      ])
    );
  }

  if (largePr && !localizationCatalogRefresh && body.length < 120) {
    signals.push(
      signal(
        "short_description_for_large_pr",
        "high",
        "Short description for large PR",
        "The PR is large but the description is short.",
        [
          metadataEvidence(
            `${fileCount} files, ${linesChanged} changed lines`,
            "large PR threshold reached"
          ),
          descriptionEvidence(`${body.length} characters`, "< 120 characters")
        ]
      )
    );
  }

  if (ciFiles.length > 0 && !mentionsAny(body, ciDescriptionTerms)) {
    signals.push(
      signal(
        "description_missing_ci_context",
        "medium",
        "CI context missing from description",
        "CI changed but the description does not mention CI, workflows or build context.",
        fileEvidence(ciFiles, "CI changed without matching description context")
      )
    );
  }

  if (
    dependencyFiles.length > 0 &&
    !releaseVersionUpdate &&
    !mentionsAny(body, dependencyDescriptionTerms)
  ) {
    signals.push(
      signal(
        "description_missing_dependency_context",
        "medium",
        "Dependency context missing from description",
        "Dependency files changed but the description does not mention dependency context.",
        fileEvidence(dependencyFiles, "dependency changed without matching description context")
      )
    );
  }

  if (
    shouldReportMixedConcerns(
      strongCategoriesTouched,
      largePr,
      releaseVersionUpdate,
      localizationCatalogRefresh
    )
  ) {
    signals.push(
      signal(
        "mixed_concerns",
        largePr ? "high" : "medium",
        "Mixed concerns",
        "At least four strong file categories changed in the same PR.",
        [metadataEvidence(strongCategoriesTouched.join(", "), ">= 4 strong categories touched")]
      )
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

function releaseEvidence(
  releaseFiles: ClassifiedFile[],
  dependencyFiles: ClassifiedFile[]
): Evidence[] {
  const evidence = [
    ...fileEvidence(releaseFiles, "release or version path", 3),
    ...fileEvidence(dependencyFiles, "dependency manifest or lockfile", 2)
  ];

  return evidence.length > 0
    ? evidence
    : [metadataEvidence("PR title/body", "mentions release or version update")];
}

function persistenceEvidence(files: ClassifiedFile[]): Evidence[] {
  const evidence = fileEvidence(files, "persistence/storage/data-format path", 5);

  return evidence.length > 0
    ? evidence
    : [metadataEvidence("PR title/body", "mentions persistence/storage/data-format terms")];
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

    if (hasCategory(file, "automation")) {
      categories.add("automation");
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

function isReleaseVersionUpdate(
  files: ClassifiedFile[],
  codeFiles: ClassifiedFile[],
  dependencyFiles: ClassifiedFile[],
  releaseFiles: ClassifiedFile[],
  titleAndBody: string
): boolean {
  if (files.length === 0 || dependencyFiles.length === 0 || releaseFiles.length === 0) {
    return false;
  }

  if (!mentionsReleaseOrVersion(titleAndBody)) {
    return false;
  }

  const unrelatedFiles = files.filter(
    (file) =>
      !hasCategory(file, "release") &&
      !hasCategory(file, "dependencies") &&
      !hasCategory(file, "documentation") &&
      !hasCategory(file, "tests") &&
      !hasCategory(file, "generated")
  );

  return codeFiles.length <= 3 && unrelatedFiles.length <= 3;
}

function mentionsReleaseOrVersion(text: string): boolean {
  return /\b(v?\d+\.\d+(?:\.\d+)?|release|version|bump|changelog)\b/.test(text);
}

function isLocalizationCatalogRefresh(
  files: ClassifiedFile[],
  localizationCatalogFiles: ClassifiedFile[]
): boolean {
  if (files.length === 0 || localizationCatalogFiles.length === 0) {
    return false;
  }

  return localizationCatalogFiles.length / files.length >= 0.8;
}

function shouldReportPersistenceDataFormatChange(
  codeFiles: ClassifiedFile[],
  persistenceFiles: ClassifiedFile[],
  titleAndBody: string
): boolean {
  return (
    persistenceFiles.length > 0 ||
    (codeFiles.length > 0 && mentionsPersistenceDataFormat(titleAndBody))
  );
}

function isPersistenceDataFormatPath(path: string): boolean {
  const normalized = path.replace(/\\/g, "/").toLowerCase();
  return mentionsPersistenceDataFormat(normalized);
}

function mentionsPersistenceDataFormat(text: string): boolean {
  return [
    "hdf5",
    "hdf",
    "hdfstore",
    "pytables",
    "parquet",
    "pickle",
    "feather",
    "orc",
    "serialization",
    "serialized",
    "deserialization",
    "deserialized",
    "persisted",
    "persistence",
    "storage",
    "data format",
    "data-format",
    "data_format",
    "file format",
    "file-format",
    "file_format"
  ].some((term) => text.includes(term));
}

function isActionableCiFailure(item: { conclusion: string | null }): boolean {
  const conclusion = item.conclusion?.toLowerCase();
  return !conclusion || !["cancelled", "skipped", "neutral"].includes(conclusion);
}

function isDominantDatabaseChange(
  files: ClassifiedFile[],
  migrationFiles: ClassifiedFile[]
): boolean {
  if (files.length === 0 || migrationFiles.length === 0) {
    return false;
  }

  return migrationFiles.length >= 3 && migrationFiles.length / files.length >= 0.1;
}

function shouldReportMixedConcerns(
  categories: FileCategory[],
  largePr: boolean,
  releaseVersionUpdate: boolean,
  localizationCatalogRefresh: boolean
): boolean {
  if (
    categories.length < 4 ||
    !hasCoreReviewConcern(categories) ||
    releaseVersionUpdate ||
    localizationCatalogRefresh
  ) {
    return false;
  }

  if (largePr) {
    return true;
  }

  if (isCohesiveCodeSupportChange(categories)) {
    return false;
  }

  return independentReviewSurfaceCount(categories) >= 3;
}

function isCohesiveCodeSupportChange(categories: FileCategory[]): boolean {
  const cohesiveSupportCategories = new Set<FileCategory>([
    "code",
    "tests",
    "documentation",
    "dependencies",
    "release"
  ]);

  return (
    categories.includes("code") &&
    categories.includes("tests") &&
    categories.every((category) => cohesiveSupportCategories.has(category))
  );
}

function independentReviewSurfaceCount(categories: FileCategory[]): number {
  let surfaces = 0;

  if (categories.includes("code")) {
    surfaces += 1;
  }

  if (categories.includes("migrations")) {
    surfaces += 1;
  }

  if (categories.includes("security")) {
    surfaces += 1;
  }

  if (categories.includes("ci") || categories.includes("automation")) {
    surfaces += 1;
  }

  if (categories.includes("dependencies") || categories.includes("configuration")) {
    surfaces += 1;
  }

  return surfaces;
}

function hasCoreReviewConcern(categories: FileCategory[]): boolean {
  return categories.some(
    (category) => category === "code" || category === "migrations" || category === "security"
  );
}

function isSecurityConcernPath(path: string): boolean {
  return isAuthRelatedPath(path) || isSecretRelatedPath(path);
}

function isAuthRelatedPath(path: string): boolean {
  return !isLocalizationCatalogPath(path) && hasAuthSensitivePathTerm(path);
}

function isSecretRelatedPath(path: string): boolean {
  return !isLocalizationCatalogPath(path) && hasSecretSensitivePathTerm(path);
}
