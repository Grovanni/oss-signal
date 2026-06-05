import type { GitHubChangedFileSummary } from "../github/types.js";
import {
  defaultOssSignalConfig,
  matchesConfiguredPath,
  type OssSignalConfig
} from "../config/config.js";

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
  ".rake",
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
  "build.gradle",
  ".pre-commit-config.yaml",
  ".pre-commit-config.yml",
  "renovate.json",
  "renovate.json5",
  ".renovaterc",
  ".renovaterc.json",
  ".renovaterc.yaml",
  ".renovaterc.yml",
  "dependency-policy.json",
  "dependency_policy.json"
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
  "composer.lock",
  "uv.lock"
]);

const authPathTerms = new Set([
  "auth",
  "authn",
  "authz",
  "authentication",
  "authorization",
  "authorize",
  "authorized",
  "login",
  "logins",
  "session",
  "sessions",
  "token",
  "tokens",
  "jwt",
  "oauth",
  "oauth2"
]);

const secretPathTerms = new Set([
  "password",
  "passwords",
  "passwd",
  "secret",
  "secrets",
  "credential",
  "credentials"
]);

const securityPathTerms = new Set([
  "crypto",
  "cryptography",
  "encrypt",
  "encrypted",
  "encryption",
  "decrypt",
  "decrypted",
  "decryption",
  "permission",
  "permissions",
  "role",
  "roles",
  "rbac",
  "acl",
  "policy",
  "policies",
  "security",
  "secure",
  "tls",
  "ssl",
  "signing",
  "signature",
  "signatures"
]);

const strongSecurityAnchorTerms = new Set([
  "auth",
  "authn",
  "authz",
  "authentication",
  "authorization",
  "authorize",
  "authorized",
  "login",
  "logins",
  "jwt",
  "oauth",
  "oauth2",
  "password",
  "passwords",
  "passwd",
  "secret",
  "secrets",
  "credential",
  "credentials",
  "crypto",
  "cryptography",
  "encrypt",
  "encrypted",
  "encryption",
  "decrypt",
  "decrypted",
  "decryption",
  "permission",
  "permissions",
  "rbac",
  "acl",
  "tls",
  "ssl",
  "signing",
  "signature"
]);

const keyContextTerms = new Set([
  "api",
  "access",
  "private",
  "public",
  "secret",
  "secrets",
  "credential",
  "credentials",
  "token",
  "tokens",
  "jwt",
  "oauth",
  "oauth2",
  "env",
  "security",
  "secure",
  "password",
  "passwd",
  "crypto",
  "encrypt",
  "encrypted",
  "encryption",
  "decrypt",
  "decrypted",
  "decryption"
]);

export function classifyChangedFile(
  file: GitHubChangedFileSummary,
  config: OssSignalConfig = defaultOssSignalConfig
): ClassifiedFile {
  const path = normalizePath(file.path);
  const name = basename(path);
  const ext = extension(name);
  const reasons: FileCategoryReason[] = [];

  const add = (category: FileCategory, reason: string) => {
    if (!reasons.some((entry) => entry.category === category)) {
      reasons.push({ category, reason });
    }
  };

  if (
    isGeneratedPath(path, name) ||
    isCompiledLocalizationCatalog(name) ||
    matchesConfiguredPath(config, "generated", path)
  ) {
    add(
      "generated",
      isGeneratedPath(path, name)
        ? "path or filename indicates generated output"
        : isCompiledLocalizationCatalog(name)
          ? "compiled localization catalog"
          : "configured generated path"
    );
  }

  if (
    isDocumentationPath(path, name) ||
    isTextLocalizationCatalog(path, name) ||
    matchesConfiguredPath(config, "documentation", path)
  ) {
    add(
      "documentation",
      isDocumentationPath(path, name)
        ? "documentation path, filename or extension"
        : isTextLocalizationCatalog(path, name)
          ? "localization catalog"
          : "configured documentation path"
    );
  }

  if (isTestPath(path, name) || matchesConfiguredPath(config, "tests", path)) {
    add("tests", isTestPath(path, name) ? "test/spec path or filename" : "configured test path");
  }

  if (isCiPath(path, name) || matchesConfiguredPath(config, "ci", path)) {
    add("ci", isCiPath(path, name) ? "CI workflow or pipeline path" : "configured CI path");
  }

  if (isAutomationSensitivePath(path, name) || matchesConfiguredPath(config, "automation", path)) {
    add(
      "automation",
      isAutomationSensitivePath(path, name)
        ? "automation path can affect CI, releases, permissions or supply chain behavior"
        : "configured automation path"
    );
  }

  if (
    isDependencyManifestName(name) ||
    isDependencyLockfileName(name) ||
    matchesConfiguredPath(config, "dependencies", path)
  ) {
    add(
      "dependencies",
      isDependencyManifestName(name) || isDependencyLockfileName(name)
        ? "dependency manifest or lockfile"
        : "configured dependency path"
    );
  }

  if (isConfigurationPath(path, name) || matchesConfiguredPath(config, "configuration", path)) {
    add(
      "configuration",
      isConfigurationPath(path, name)
        ? "configuration file or directory"
        : "configured configuration path"
    );
  }

  if (isSecuritySensitivePath(path, name) || matchesConfiguredPath(config, "security", path)) {
    add(
      "security",
      isSecuritySensitivePath(path, name)
        ? "path or filename touches auth, secrets, credentials or policy"
        : "configured security-sensitive path"
    );
  }

  if (isMigrationPath(path, name) || matchesConfiguredPath(config, "migrations", path)) {
    add(
      "migrations",
      isMigrationPath(path, name)
        ? "migration, schema or database path"
        : "configured migration path"
    );
  }

  if (isReleasePath(path, name) || matchesConfiguredPath(config, "release", path)) {
    add(
      "release",
      isReleasePath(path, name)
        ? "release, changelog or version manifest"
        : "configured release path"
    );
  }

  if (isBuildPath(path, name) || matchesConfiguredPath(config, "build", path)) {
    add(
      "build",
      isBuildPath(path, name) ? "build tool or build output path" : "configured build path"
    );
  }

  if (
    (codeExtensions.has(ext) || matchesConfiguredPath(config, "code", path)) &&
    !reasons.some((entry) => ["documentation", "tests", "generated"].includes(entry.category))
  ) {
    add("code", codeExtensions.has(ext) ? `source extension ${ext}` : "configured code path");
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

export function classifyChangedFiles(
  files: GitHubChangedFileSummary[],
  config: OssSignalConfig = defaultOssSignalConfig
): ClassifiedFile[] {
  return files.map((file) => classifyChangedFile(file, config));
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

export function isLocalizationCatalogPath(
  path: string,
  name = basename(normalizePath(path))
): boolean {
  const normalizedPath = normalizePath(path);
  const normalizedName = normalizePath(name);

  return (
    normalizedPath.includes("/locale/") ||
    normalizedPath.includes("/locales/") ||
    normalizedPath.includes("/lc_messages/") ||
    [".po", ".pot", ".mo"].includes(extension(normalizedName))
  );
}

export function hasAuthSensitivePathTerm(path: string): boolean {
  return hasAnyPathToken(path, authPathTerms);
}

export function hasSecretSensitivePathTerm(path: string): boolean {
  const normalized = normalizePath(path);
  const name = basename(normalized);
  const tokens = pathTokens(normalized);

  return (
    isRealEnvFileName(name) ||
    hasAnyToken(tokens, secretPathTerms) ||
    hasContextualKeyToken(tokens)
  );
}

export function hasSecuritySensitivePathTerm(path: string): boolean {
  return (
    hasAuthSensitivePathTerm(path) ||
    hasSecretSensitivePathTerm(path) ||
    hasAnyPathToken(path, securityPathTerms)
  );
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

function pathTokens(path: string): string[] {
  return normalizePath(path)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function hasAnyPathToken(path: string, terms: Set<string>): boolean {
  return hasAnyToken(pathTokens(path), terms);
}

function hasAnyToken(tokens: string[], terms: Set<string>): boolean {
  return tokens.some((token) => terms.has(token));
}

function hasContextualKeyToken(tokens: string[]): boolean {
  return (
    (tokens.includes("key") || tokens.includes("keys")) && hasAnyToken(tokens, keyContextTerms)
  );
}

function isDocumentationPath(path: string, name: string): boolean {
  return (
    path.startsWith("docs/") ||
    ["readme", "changelog", "contributing", "authors", "license", "licence", "notice"].some(
      (prefix) => name.startsWith(prefix)
    ) ||
    [".md", ".rst", ".adoc"].includes(extension(name))
  );
}

function isTextLocalizationCatalog(path: string, name: string): boolean {
  return isLocalizationCatalogPath(path, name) && [".po", ".pot"].includes(extension(name));
}

function isCompiledLocalizationCatalog(name: string): boolean {
  return extension(name) === ".mo";
}

function isTestPath(path: string, name: string): boolean {
  if (isCiPath(path, name)) {
    return false;
  }

  return (
    path.startsWith("test/") ||
    path.startsWith("tests/") ||
    path.startsWith("testing/") ||
    path.startsWith("test_project/") ||
    path.startsWith("test-project/") ||
    path.startsWith("testsuite/") ||
    path.startsWith("qa/") ||
    path.startsWith("src/test/") ||
    path.startsWith("spec/") ||
    path.startsWith("e2e/") ||
    path.includes("/test/") ||
    path.includes("/tests/") ||
    path.includes("/testing/") ||
    path.includes("/test_project/") ||
    path.includes("/test-project/") ||
    path.includes("/testsuite/") ||
    path.includes("/qa/") ||
    path.includes("/src/test/") ||
    path.includes("internalclustertest") ||
    path.includes("muted-tests") ||
    path.includes("testfixtures") ||
    path.includes("test-fixtures") ||
    path.includes("/fixtures/") ||
    path.includes("/spec/") ||
    path.includes("/e2e/") ||
    path.includes("__tests__") ||
    path.includes("__tests_dts__") ||
    name.includes(".test.") ||
    name.includes(".spec.") ||
    name.includes(".e2e.") ||
    name.endsWith("_test.go") ||
    name.endsWith("_test.py") ||
    name.endsWith("test.java") ||
    name.endsWith("tests.java") ||
    name.endsWith("testcase.java") ||
    name.endsWith("it.java") ||
    name.endsWith("itcase.java") ||
    name.endsWith("test.kt") ||
    name.endsWith("tests.kt") ||
    name.endsWith("test.cs") ||
    name.endsWith("tests.cs") ||
    name.endsWith("test.fs") ||
    name.endsWith("tests.fs") ||
    name.endsWith("test.fsx") ||
    name.endsWith("tests.fsx") ||
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
    name === ".env.sample" ||
    name === ".env.template" ||
    name === ".pre-commit-config.yaml" ||
    name === ".pre-commit-config.yml" ||
    name === "renovate.json" ||
    name === "renovate.json5" ||
    name.startsWith(".renovaterc") ||
    name === "dependency-policy.json" ||
    name === "dependency_policy.json" ||
    name === "node.gyp" ||
    name.endsWith(".gyp") ||
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
  if (isLocalizationCatalogPath(path, name) || isDocumentationPath(path, name)) {
    return false;
  }

  if (isDependencyPolicyPath(name) || isDependencyManifestName(name) || isDependencyLockfileName(name)) {
    return false;
  }

  if (isExampleEnvFileName(name)) {
    return false;
  }

  if (isNonProductionSecurityContext(path, name)) {
    return false;
  }

  if (isWeakSecurityReviewContext(path, name) && !hasStrongSecurityAnchor(path)) {
    return false;
  }

  if (isRealEnvFileName(name)) {
    return true;
  }

  return hasSecuritySensitivePathTerm(path);
}

function isAutomationSensitivePath(path: string, name: string): boolean {
  return (
    path.startsWith(".github/workflows/") ||
    path.startsWith(".github/actions/") ||
    name === "dockerfile" ||
    name.startsWith("dockerfile.") ||
    name === "action.yml" ||
    name === "action.yaml"
  );
}

function isMigrationPath(path: string, name: string): boolean {
  if (
    isDocumentationPath(path, name) ||
    isLocalizationCatalogPath(path, name) ||
    isGeneratedFixturePath(path, name)
  ) {
    return false;
  }

  const tokens = pathTokens(path);

  if (isTestPath(path, name) && hasMigrationTerm(tokens) && !hasDatabaseFixtureEvidence(path)) {
    return false;
  }

  return (
    path.includes("db/migrate") ||
    path.startsWith("db/") ||
    path.includes("/db/fixtures/") ||
    path.includes("prisma/migrations") ||
    path.includes("alembic") ||
    hasRuntimeMigrationToolingTerm(tokens) ||
    isDatabaseSchemaPath(path, name)
  );
}

function isDatabaseSchemaPath(path: string, name: string): boolean {
  const tokens = pathTokens(path);

  return (
    name === "schema.rb" ||
    name === "structure.sql" ||
    (name.endsWith(".prisma") && !isNonRuntimeFixturePath(path)) ||
    tokens.includes("datasource") ||
    tokens.includes("datasources") ||
    (tokens.includes("foreign") && (tokens.includes("key") || tokens.includes("keys"))) ||
    (name.endsWith(".rake") &&
      hasAnyToken(
        tokens,
        new Set(["db", "database", "databases", "migration", "migrations", "schema", "schemas"])
      ))
  );
}

function isReleasePath(path: string, name: string): boolean {
  const tokens = pathTokens(path);

  return (
    name.startsWith("changelog") ||
    name.startsWith("release") ||
    path.startsWith(".changeset/") ||
    tokens.includes("version") ||
    tokens.includes("versions") ||
    tokens.includes("release") ||
    tokens.includes("releases") ||
    ["package.json", "cargo.toml", "pyproject.toml"].includes(name)
  );
}

function isBuildPath(path: string, name: string): boolean {
  return (
    path.startsWith("dist/") ||
    path.startsWith("build/") ||
    name === "dockerfile" ||
    name.startsWith("dockerfile.") ||
    name === "makefile" ||
    name === "node.gyp" ||
    name.endsWith(".gyp") ||
    name === "configure.py" ||
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

function isWeakSecurityReviewContext(path: string, name: string): boolean {
  const tokens = pathTokens(path);

  return (
    [".css", ".scss", ".sass", ".less", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".snap"].includes(
      extension(name)
    ) ||
    hasAnyToken(
      tokens,
      new Set([
        "ui",
        "css",
        "style",
        "styles",
        "theme",
        "themes",
        "asset",
        "assets",
        "image",
        "images",
        "icon",
        "icons",
        "snapshot",
        "snapshots",
        "path",
        "paths",
        "context",
        "contexts",
        "memory",
        "memories",
        "parser",
        "parsers",
        "lexer",
        "lexers",
        "slide",
        "slides",
        "presentation",
        "presentations"
      ])
    )
  );
}

function hasStrongSecurityAnchor(path: string): boolean {
  const tokens = pathTokens(path);

  return hasAnyToken(tokens, strongSecurityAnchorTerms);
}

function isDependencyManifestName(name: string): boolean {
  return (
    dependencyManifests.has(name) ||
    /^requirements[-_.].+\.txt$/.test(name) ||
    /^.+[-_.]requirements\.txt$/.test(name)
  );
}

function isDependencyLockfileName(name: string): boolean {
  return dependencyLockfiles.has(name);
}

function isDependencyPolicyPath(name: string): boolean {
  return name === "dependency-policy.json" || name === "dependency_policy.json";
}

function isRealEnvFileName(name: string): boolean {
  return name === ".env" || (name.startsWith(".env.") && !isExampleEnvFileName(name));
}

function isExampleEnvFileName(name: string): boolean {
  return (
    name === ".env.example" ||
    name === ".env.sample" ||
    name === ".env.template" ||
    name.endsWith(".env.example") ||
    name.endsWith(".env.sample") ||
    name.endsWith(".env.template")
  );
}

function isNonProductionSecurityContext(path: string, name: string): boolean {
  const tokens = pathTokens(path);

  return (
    isTestPath(path, name) ||
    isNonRuntimeFixturePath(path) ||
    hasAnyToken(
      tokens,
      new Set([
        "example",
        "examples",
        "sample",
        "samples",
        "data",
        "testdata",
        "compiler",
        "protocol",
        "quic",
        "http2",
        "http",
        "esql"
      ])
    )
  );
}

function isNonRuntimeFixturePath(path: string): boolean {
  const tokens = pathTokens(path);

  return hasAnyToken(tokens, new Set(["fixture", "fixtures", "generated", "example", "examples"]));
}

function isGeneratedFixturePath(path: string, name: string): boolean {
  return isGeneratedPath(path, name) && isNonRuntimeFixturePath(path);
}

function hasMigrationTerm(tokens: string[]): boolean {
  return hasAnyToken(tokens, new Set(["migrate", "migration", "migrations"]));
}

function hasDatabaseFixtureEvidence(path: string): boolean {
  const tokens = pathTokens(path);

  return (
    path.startsWith("db/") ||
    path.includes("/db/fixtures/") ||
    (hasAnyToken(tokens, new Set(["db", "database", "databases"])) &&
      hasAnyToken(tokens, new Set(["fixture", "fixtures", "schema", "schemas"]))) ||
    (tokens.includes("foreign") && (tokens.includes("key") || tokens.includes("keys")))
  );
}

function hasRuntimeMigrationToolingTerm(tokens: string[]): boolean {
  return (
    hasAnyToken(tokens, new Set(["migrate", "migration", "migrations"])) &&
    !hasAnyToken(tokens, new Set(["test", "tests", "testing", "testsuite", "fixture", "fixtures"]))
  );
}
