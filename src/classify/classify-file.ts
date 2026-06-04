import type { GitHubChangedFileSummary } from "../github/types.js";

import { createEmptyCategoryCounts, type FileCategory } from "./categories.js";

export type FileCategoryReason = {
  category: FileCategory;
  reason: string;
};

export type ClassifiedFile = GitHubChangedFileSummary & {
  categories: FileCategory[];
  reasons: FileCategoryReason[];
};

const codeExtensions = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".rb",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".php",
  ".cs",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".swift",
  ".scala",
  ".ex",
  ".exs",
  ".erl",
  ".fs",
  ".fsx",
  ".lua",
  ".sh",
  ".ps1"
]);

const dependencyManifests = new Set([
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "pipfile",
  "cargo.toml",
  "go.mod",
  "gemfile",
  "composer.json",
  "pom.xml",
  "build.gradle"
]);

const dependencyLockfiles = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "poetry.lock",
  "pipfile.lock",
  "cargo.lock",
  "go.sum",
  "gemfile.lock",
  "composer.lock"
]);

const sensitiveTerms = [
  "auth",
  "login",
  "session",
  "token",
  "jwt",
  "oauth",
  "password",
  "passwd",
  "secret",
  "crypto",
  "encrypt",
  "decrypt",
  "permission",
  "permissions",
  "role",
  "roles",
  "rbac",
  "acl",
  "policy",
  "security",
  "credential",
  "key"
];

export function classifyChangedFile(file: GitHubChangedFileSummary): ClassifiedFile {
  const path = normalizePath(file.path);
  const name = basename(path);
  const ext = extension(name);
  const reasons: FileCategoryReason[] = [];

  const add = (category: FileCategory, reason: string) => {
    if (!reasons.some((entry) => entry.category === category)) {
      reasons.push({ category, reason });
    }
  };

  if (isGeneratedPath(path, name)) {
    add("generated", "path or filename indicates generated output");
  }

  if (isDocumentationPath(path, name)) {
    add("documentation", "documentation path, filename or extension");
  }

  if (isTestPath(path, name)) {
    add("tests", "test/spec path or filename");
  }

  if (isCiPath(path, name)) {
    add("ci", "CI workflow or pipeline path");
  }

  if (isAutomationSensitivePath(path, name)) {
    add("automation", "automation path can affect CI, releases, permissions or supply chain behavior");
  }

  if (isDependencyManifestName(name) || isDependencyLockfileName(name)) {
    add("dependencies", "dependency manifest or lockfile");
  }

  if (isConfigurationPath(path, name)) {
    add("configuration", "configuration file or directory");
  }

  if (isSecuritySensitivePath(path, name)) {
    add("security", "path or filename touches auth, secrets, credentials or policy");
  }

  if (isMigrationPath(path)) {
    add("migrations", "migration, schema or database path");
  }

  if (isReleasePath(path, name)) {
    add("release", "release, changelog or version manifest");
  }

  if (isBuildPath(path, name)) {
    add("build", "build tool or build output path");
  }

  if (
    codeExtensions.has(ext) &&
    !reasons.some((entry) => ["documentation", "tests", "generated"].includes(entry.category))
  ) {
    add("code", `source extension ${ext}`);
  }

  if (reasons.length === 0) {
    add("unknown", "no deterministic category rule matched");
  }

  return {
    ...file,
    categories: reasons.map((reason) => reason.category),
    reasons
  };
}

export function classifyChangedFiles(files: GitHubChangedFileSummary[]): ClassifiedFile[] {
  return files.map(classifyChangedFile);
}

export function countCategories(files: ClassifiedFile[]): Record<FileCategory, number> {
  const counts = createEmptyCategoryCounts();

  for (const file of files) {
    for (const category of file.categories) {
      counts[category] += 1;
    }
  }

  return counts;
}

export function hasCategory(file: ClassifiedFile, category: FileCategory): boolean {
  return file.categories.includes(category);
}

export function isDependencyManifest(file: ClassifiedFile): boolean {
  return isDependencyManifestName(basename(normalizePath(file.path)));
}

export function isDependencyLockfile(file: ClassifiedFile): boolean {
  return isDependencyLockfileName(basename(normalizePath(file.path)));
}

export function normalizedPathIncludes(path: string, terms: string[]): boolean {
  const normalized = normalizePath(path);
  return terms.some((term) => normalized.includes(term));
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").toLowerCase();
}

function basename(path: string): string {
  return path.split("/").at(-1) ?? path;
}

function extension(name: string): string {
  const index = name.lastIndexOf(".");
  return index > 0 ? name.slice(index) : "";
}

function isDocumentationPath(path: string, name: string): boolean {
  return (
    path.startsWith("docs/") ||
    ["readme", "changelog", "contributing"].some((prefix) => name.startsWith(prefix)) ||
    [".md", ".rst", ".adoc"].includes(extension(name))
  );
}

function isTestPath(path: string, name: string): boolean {
  return (
    path.startsWith("test/") ||
    path.startsWith("tests/") ||
    path.startsWith("spec/") ||
    path.includes("/test/") ||
    path.includes("/tests/") ||
    path.includes("/spec/") ||
    path.includes("__tests__") ||
    name.includes(".test.") ||
    name.includes(".spec.") ||
    name.startsWith("test-") ||
    name.startsWith("spec-")
  );
}

function isCiPath(path: string, name: string): boolean {
  return (
    path.startsWith(".github/workflows/") ||
    name === ".gitlab-ci.yml" ||
    path.startsWith(".circleci/") ||
    name === ".travis.yml" ||
    name === "azure-pipelines.yml" ||
    name === "jenkinsfile" ||
    path.includes("buildkite")
  );
}

function isConfigurationPath(path: string, name: string): boolean {
  return (
    name === ".env.example" ||
    path.startsWith("config/") ||
    name.endsWith(".config.js") ||
    name.endsWith(".config.ts") ||
    name.endsWith(".toml") ||
    name.endsWith(".yaml") ||
    name.endsWith(".yml") ||
    name.endsWith(".ini") ||
    name === ".eslintrc" ||
    name === ".prettierrc" ||
    name === ".editorconfig" ||
    name === "tsconfig.json"
  );
}

function isSecuritySensitivePath(path: string, name: string): boolean {
  return (
    sensitiveTerms.some((term) => path.includes(term)) ||
    name === ".env" ||
    name === ".env.example" ||
    name === "dockerfile"
  );
}

function isAutomationSensitivePath(path: string, name: string): boolean {
  return (
    path.startsWith(".github/workflows/") ||
    path.startsWith(".github/actions/") ||
    name === "action.yml" ||
    name === "action.yaml"
  );
}

function isMigrationPath(path: string): boolean {
  return (
    path.includes("migration") ||
    path.includes("migrations") ||
    path.includes("schema") ||
    path.includes("db/migrate") ||
    path.includes("prisma/migrations") ||
    path.includes("alembic")
  );
}

function isReleasePath(path: string, name: string): boolean {
  return (
    name.startsWith("changelog") ||
    name.startsWith("release") ||
    path.startsWith(".changeset/") ||
    path.includes("version") ||
    ["package.json", "cargo.toml", "pyproject.toml"].includes(name)
  );
}

function isBuildPath(path: string, name: string): boolean {
  return (
    path.startsWith("dist/") ||
    path.startsWith("build/") ||
    name === "dockerfile" ||
    name === "makefile" ||
    name === "webpack.config.js" ||
    name === "vite.config.ts" ||
    name === "rollup.config.js"
  );
}

function isGeneratedPath(path: string, name: string): boolean {
  return (
    path.includes("generated") ||
    path.startsWith("dist/") ||
    path.startsWith("build/") ||
    path.startsWith("coverage/") ||
    path.startsWith("snapshots/") ||
    name.endsWith(".snap")
  );
}

function isDependencyManifestName(name: string): boolean {
  return dependencyManifests.has(name);
}

function isDependencyLockfileName(name: string): boolean {
  return dependencyLockfiles.has(name);
}
