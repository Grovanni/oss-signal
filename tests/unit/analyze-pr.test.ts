import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { analyzePullRequestData } from "../../src/analyze/analyze-pr.js";
import { mergePrSignalConfig } from "../../src/config/config.js";
import { loadGitHubPullRequestFixture } from "../../src/github/fixtures.js";
import { parseGitHubPullRequestUrl } from "../../src/github/parse-url.js";
import type {
  GitHubChangedFileSummary,
  GitHubCiSummary,
  GitHubPullRequestData
} from "../../src/github/types.js";

describe("analyzePullRequestData", () => {
  it("keeps a small code-with-tests PR low attention", async () => {
    const data = await loadGitHubPullRequestFixture(
      join("tests", "fixtures", "github-basic"),
      parseGitHubPullRequestUrl("https://github.com/org/repo/pull/123")
    );

    const analysis = analyzePullRequestData(data);

    expect(analysis.categories.code).toBe(1);
    expect(analysis.categories.tests).toBe(1);
    expect(signalIds(analysis.signals)).toContain("small_pr");
    expect(signalIds(analysis.signals)).toContain("tests_changed");
    expect(signalIds(analysis.signals)).not.toContain("code_without_tests");
    expect(analysis.attention).toBe("low");
    expect(analysis.recommended_action).toBe("normal_review");
    expect(analysis.priority_files[0]?.path).toBe("src/github/parse-url.ts");
  });

  it("routes auth code without tests to security review", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        body: "Fix session handling.",
        files: [changedFile("src/auth/session.ts", 42)]
      })
    );

    expect(signalIds(analysis.signals)).toEqual(
      expect.arrayContaining([
        "code_without_tests",
        "security_sensitive_file_changed",
        "auth_related_change"
      ])
    );
    expect(analysis.attention).toBe("high");
    expect(analysis.recommended_action).toBe("security_review");
    expect(analysis.questions.map((question) => question.signal_id)).toContain(
      "code_without_tests"
    );
  });

  it("routes manifest and lockfile changes to dependency review", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        body: "Update dependency versions for compatibility.",
        files: [changedFile("package.json", 8), changedFile("package-lock.json", 120)]
      })
    );

    expect(signalIds(analysis.signals)).toEqual(
      expect.arrayContaining(["dependency_manifest_changed", "dependency_lockfile_changed"])
    );
    expect(analysis.attention).toBe("medium");
    expect(analysis.recommended_action).toBe("dependency_review");
  });

  it("routes dependency-only manifest changes to dependency review", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        body: "Update dependency metadata.",
        files: [changedFile("package.json", 8)]
      })
    );

    expect(signalIds(analysis.signals)).toEqual(
      expect.arrayContaining(["dependency_manifest_changed", "dependency_change_without_code"])
    );
    expect(analysis.recommended_action).toBe("dependency_review");
  });

  it("routes large PRs to request split", () => {
    const files = Array.from({ length: 21 }, (_, index) =>
      changedFile(`src/module-${index}.ts`, 10)
    );
    const analysis = analyzePullRequestData(
      dataWith({
        body: "Short.",
        files,
        additions: 900,
        deletions: 20
      })
    );

    expect(signalIds(analysis.signals)).toEqual(
      expect.arrayContaining(["large_pr", "many_files_changed", "short_description_for_large_pr"])
    );
    expect(analysis.attention).toBe("high");
    expect(analysis.recommended_action).toBe("request_split");
  });

  it("keeps large cohesive dependency manifest and lockfile updates out of request_split", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "Update dependency lockfile",
        body: "Refresh dependency versions.",
        files: [changedFile("package.json", 20), changedFile("package-lock.json", 1200)],
        ci: ciWith("success")
      })
    );

    expect(signalIds(analysis.signals)).toContain("cohesive_mechanical_batch");
    expect(signalIds(analysis.signals)).not.toContain("large_pr");
    expect(analysis.attention).toBe("medium");
    expect(analysis.recommended_action).toBe("dependency_review");
  });

  it("keeps docs-heavy asset and archive refresh batches out of request_split", () => {
    const docs = Array.from({ length: 22 }, (_, index) =>
      changedFile(`docs/reference/page-${index}.md`, 50)
    );
    const assets = Array.from({ length: 22 }, (_, index) =>
      changedFile(`assets/icons/icon-${index}.svg`, 3)
    );
    const archiveData = Array.from({ length: 22 }, (_, index) =>
      changedFile(`data/archive/snapshot-${index}.json`, 4)
    );

    for (const [title, files] of [
      ["Update reference documentation", docs],
      ["Optimize image assets", assets],
      ["Refresh archive data", archiveData]
    ] as const) {
      const analysis = analyzePullRequestData(
        dataWith({
          title,
          body: title,
          files,
          ci: ciWith("success")
        })
      );

      expect(signalIds(analysis.signals)).toContain("cohesive_mechanical_batch");
      expect(signalIds(analysis.signals)).not.toContain("large_pr");
      expect(analysis.attention).toBe("medium");
      expect(analysis.recommended_action).not.toBe("request_split");
    }
  });

  it("detects truly mixed independent concerns and limits questions", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        body: "Update code, database schema, dependencies and workflow.",
        files: [
          changedFile("src/app.ts", 30),
          changedFile("tests/app.test.ts", 12),
          changedFile("docs/usage.md", 4),
          changedFile("package.json", 6),
          changedFile("db/schema.rb", 8),
          changedFile(".github/workflows/ci.yml", 5)
        ],
        ci: ciWith("success")
      })
    );

    expect(signalIds(analysis.signals)).toContain("mixed_concerns");
    expect(analysis.recommended_action).toBe("request_split");
    expect(analysis.questions.length).toBeLessThanOrEqual(5);
  });

  it("does not request split for a small cohesive code test docs and package update", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        body: "Update ESLint rule, matching tests and package metadata.",
        files: [
          changedFile("src/rules/no-example.ts", 16),
          changedFile("tests/rules/no-example.test.ts", 20),
          changedFile("docs/rules/no-example.md", 4),
          changedFile("package.json", 2),
          changedFile("CHANGELOG.md", 2)
        ],
        ci: ciWith("success")
      })
    );

    expect(signalIds(analysis.signals)).not.toContain("mixed_concerns");
    expect(analysis.recommended_action).not.toBe("request_split");
  });

  it("routes CI-only workflow changes to wait_for_ci instead of security review", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        body: "Updates CI workflow.",
        files: [changedFile(".github/workflows/ci.yml", 12)]
      })
    );

    expect(signalIds(analysis.signals)).toEqual(
      expect.arrayContaining([
        "ci_changed",
        "automation_sensitive_file_changed",
        "ci_status_unavailable"
      ])
    );
    expect(signalIds(analysis.signals)).not.toContain("security_sensitive_file_changed");
    expect(analysis.categories.security).toBe(0);
    expect(analysis.categories.automation).toBe(1);
    expect(analysis.attention).toBe("medium");
    expect(analysis.recommended_action).toBe("wait_for_ci");
  });

  it("does not wait for CI-only workflow changes when GitHub CI passed", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        body: "Updates CI workflow.",
        files: [changedFile(".github/workflows/ci.yml", 12)],
        ci: ciWith("success")
      })
    );

    expect(signalIds(analysis.signals)).toContain("ci_changed");
    expect(signalIds(analysis.signals)).toContain("automation_sensitive_file_changed");
    expect(signalIds(analysis.signals)).not.toContain("security_sensitive_file_changed");
    expect(signalIds(analysis.signals)).not.toContain("ci_status_unavailable");
    expect(signalIds(analysis.signals)).not.toContain("mixed_concerns");
    expect(analysis.recommended_action).toBe("normal_review");
  });

  it("does not treat Dockerfile-only changes as app security-sensitive", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        body: "Update runtime image.",
        files: [changedFile("Dockerfile", 12)]
      })
    );

    expect(analysis.categories.automation).toBe(1);
    expect(analysis.categories.build).toBe(1);
    expect(analysis.categories.security).toBe(0);
    expect(signalIds(analysis.signals)).toContain("automation_sensitive_file_changed");
    expect(signalIds(analysis.signals)).toContain("container_image_update");
    expect(signalIds(analysis.signals)).not.toContain("security_sensitive_file_changed");
    expect(analysis.recommended_action).toBe("dependency_review");
  });

  it("does not treat environment as an env secret path", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        body: "Update dependencies.",
        files: [changedFile("playground/environment-react-ssr/package.json", 6)]
      })
    );

    expect(signalIds(analysis.signals)).not.toContain("secret_related_change");
  });

  it("does not ask for generic tests on coherent release version bumps", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "Version 19.2.7",
        body: "Release version 19.2.7.",
        files: [
          changedFile("package.json", 8),
          changedFile("packages/react/package.json", 8),
          changedFile("packages/react/src/ReactVersion.js", 3)
        ]
      })
    );

    expect(signalIds(analysis.signals)).toContain("release_version_update");
    expect(signalIds(analysis.signals)).not.toContain("code_without_tests");
    expect(signalIds(analysis.signals)).not.toContain("mixed_concerns");
    expect(analysis.recommended_action).toBe("dependency_review");
  });

  it("does not ask for tests on small source wording or docstring-only changes", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "DOC: align docstring wording",
        body: "Docstring wording only.",
        files: [changedFile("pandas/core/frame.py", 18)],
        ci: ciWith("success")
      })
    );

    expect(signalIds(analysis.signals)).toContain("source_wording_change");
    expect(signalIds(analysis.signals)).not.toContain("code_without_tests");
    expect(analysis.attention).toBe("low");
    expect(analysis.recommended_action).toBe("normal_review");
  });

  it("does not let an empty description dominate small docs tests or changelog changes", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "Fix typo in changelog",
        body: "",
        files: [changedFile("CHANGELOG.md", 2)],
        ci: ciWith("success")
      })
    );

    expect(signalIds(analysis.signals)).toContain("empty_description");
    expect(signalIds(analysis.signals)).toContain("docs_only");
    expect(analysis.recommended_action).toBe("normal_review");
  });

  it("still asks for clarification on empty substantial build or automation changes", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "Update runtime image",
        body: "",
        files: [changedFile("Dockerfile", 18)],
        ci: ciWith("success")
      })
    );

    expect(signalIds(analysis.signals)).toContain("automation_sensitive_file_changed");
    expect(analysis.recommended_action).toBe("ask_for_clarification");
  });

  it("recognizes e2e test files and avoids code-without-tests routing", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "Add smoke e2e coverage",
        body: "",
        files: [changedFile("src/examples-smoke.e2e.ts", 24)],
        ci: ciWith("success")
      })
    );

    expect(analysis.categories.tests).toBe(1);
    expect(signalIds(analysis.signals)).toContain("tests_only");
    expect(signalIds(analysis.signals)).not.toContain("code_without_tests");
    expect(analysis.recommended_action).toBe("normal_review");
  });

  it("does not route localization catalogs under auth to security review", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        body: "Update translations.",
        files: [
          changedFile("django/contrib/auth/locale/fr/LC_MESSAGES/django.po", 12),
          changedFile("django/contrib/auth/locale/fr/LC_MESSAGES/django.mo", 12)
        ]
      })
    );

    expect(analysis.categories.security).toBe(0);
    expect(signalIds(analysis.signals)).not.toContain("security_sensitive_file_changed");
    expect(signalIds(analysis.signals)).not.toContain("auth_related_change");
    expect(analysis.recommended_action).toBe("normal_review");
  });

  it("does not route non-auth session tests or docs paths to security review", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "Refine session tests",
        body: "Update protocol session coverage.",
        files: [
          changedFile("testing/test_session.py", 12),
          changedFile("docs/en/mkdocs.env.yml", 2)
        ],
        ci: ciWith("success")
      })
    );

    expect(analysis.categories.security).toBe(0);
    expect(signalIds(analysis.signals)).not.toContain("security_sensitive_file_changed");
    expect(signalIds(analysis.signals)).not.toContain("auth_related_change");
    expect(signalIds(analysis.signals)).not.toContain("secret_related_change");
    expect(analysis.recommended_action).toBe("normal_review");
  });

  it("does not route env names samples fixtures or third party licenses to security review", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "Update env examples and fixture data",
        body: "Refresh examples and test data.",
        files: [
          changedFile("setup_env.sh", 1),
          changedFile("src/vite-env.d.ts", 1),
          changedFile(".env.sample", 1),
          changedFile("tests/fixtures/secret.json", 4),
          changedFile("LICENSE-THIRD-PARTY", 2)
        ],
        ci: ciWith("success")
      })
    );

    expect(analysis.categories.security).toBe(0);
    expect(signalIds(analysis.signals)).not.toContain("security_sensitive_file_changed");
    expect(signalIds(analysis.signals)).not.toContain("secret_related_change");
    expect(analysis.recommended_action).not.toBe("security_review");
  });

  it("does not route weak session token policy or asset wording to security review", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "Update session UI token parser policy slides and assets",
        body: "Update UI text, parser naming, slides and icons.",
        files: [
          changedFile("src/ui/session-panel.tsx", 2),
          changedFile("src/parser/token.ts", 2),
          changedFile("src/security/context.ts", 2),
          changedFile("src/security/memory.ts", 2),
          changedFile("slides/security-policy.pptx", 2),
          changedFile("assets/security-token-icon.svg", 2)
        ],
        ci: ciWith("success")
      })
    );

    expect(analysis.categories.security).toBe(0);
    expect(signalIds(analysis.signals)).not.toContain("security_sensitive_file_changed");
    expect(signalIds(analysis.signals)).not.toContain("auth_related_change");
    expect(analysis.recommended_action).not.toBe("security_review");
  });

  it("keeps real env and credential configuration security-sensitive", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "Update credential configuration",
        body: "Update credential loading.",
        files: [changedFile(".env", 2), changedFile("config/credentials.yml", 2)]
      })
    );

    expect(analysis.categories.security).toBe(2);
    expect(signalIds(analysis.signals)).toContain("security_sensitive_file_changed");
    expect(signalIds(analysis.signals)).toContain("secret_related_change");
    expect(analysis.recommended_action).toBe("security_review");
  });

  it("does not let security-named dependency manifests dominate dependency updates", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "Update security package dependencies",
        body: "Bump vendored dependency metadata.",
        files: [
          changedFile("staging/src/k8s.io/pod-security-admission/go.mod", 5),
          changedFile("staging/src/k8s.io/pod-security-admission/go.sum", 20)
        ],
        ci: ciWith("success")
      })
    );

    expect(analysis.categories.security).toBe(0);
    expect(signalIds(analysis.signals)).not.toContain("security_sensitive_file_changed");
    expect(analysis.recommended_action).toBe("dependency_review");
  });

  it("treats Java QA and integration conventions as tests", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "Update QA integration tests",
        body: "Refresh muted integration test coverage.",
        files: [
          changedFile("server/src/test/java/org/example/FooIT.java", 12),
          changedFile("qa/rolling-upgrade/src/test/java/FooITCase.java", 10),
          changedFile("muted-tests/FooTestCase.java", 4),
          changedFile("src/internalClusterTest/java/FooTests.java", 8)
        ],
        ci: ciWith("success")
      })
    );

    expect(analysis.categories.tests).toBe(4);
    expect(signalIds(analysis.signals)).toContain("tests_only");
    expect(signalIds(analysis.signals)).not.toContain("code_without_tests");
    expect(analysis.recommended_action).toBe("normal_review");
  });

  it("keeps direct permission and policy code on security review", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "Tighten permission policy",
        body: "Update permission policy.",
        files: [changedFile("src/policies/permissions.ts", 22)]
      })
    );

    expect(signalIds(analysis.signals)).toContain("security_sensitive_file_changed");
    expect(signalIds(analysis.signals)).toContain("strong_security_context_changed");
    expect(analysis.attention).toBe("high");
    expect(analysis.recommended_action).toBe("security_review");
  });

  it("routes explicit vulnerability text from title or body to security review", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "Snyk security upgrade for CVE-2026-1234",
        body: "Fix vulnerable transitive dependency.",
        files: [changedFile("package.json", 8), changedFile("package-lock.json", 120)],
        ci: ciWith("success")
      })
    );

    expect(signalIds(analysis.signals)).toContain("explicit_security_advisory");
    expect(analysis.attention).toBe("high");
    expect(analysis.recommended_action).toBe("security_review");
  });

  it("keeps failed CI ahead of weak lexical security vocabulary", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "Update session UI copy",
        body: "Adjust session panel wording.",
        files: [changedFile("src/ui/session-panel.tsx", 3)],
        ci: ciWith("failure")
      })
    );

    expect(signalIds(analysis.signals)).toContain("ci_checks_failed");
    expect(signalIds(analysis.signals)).not.toContain("security_sensitive_file_changed");
    expect(analysis.recommended_action).toBe("wait_for_ci");
  });

  it("keeps explicit security context visible when CI also failed", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "Fix GHSA-abcd-1234-wxyz auth bypass",
        body: "Security advisory follow-up.",
        files: [changedFile("package.json", 8), changedFile("package-lock.json", 120)],
        ci: ciWith("failure")
      })
    );

    expect(signalIds(analysis.signals)).toContain("explicit_security_advisory");
    expect(signalIds(analysis.signals)).toContain("ci_checks_failed");
    expect(analysis.recommended_action).toBe("security_review");
  });

  it("does not route tiny comment-only auth edits to security review when CI is green", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "Fix auth hasher comment wording",
        body: "Comment wording only.",
        files: [changedFile("src/auth/hashers.py", 1)],
        ci: ciWith("success")
      })
    );

    expect(signalIds(analysis.signals)).toContain("security_sensitive_file_changed");
    expect(signalIds(analysis.signals)).toContain("source_wording_change");
    expect(analysis.recommended_action).toBe("normal_review");
  });

  it("keeps large localization catalog refreshes low attention when CI passed", () => {
    const files = Array.from({ length: 13 }, (_, index) =>
      changedFile(`django/contrib/auth/locale/lang-${index}/LC_MESSAGES/django.po`, 120)
    );
    const analysis = analyzePullRequestData(
      dataWith({
        title: "[6.1.x] Updated source translation catalogs.",
        body: "Updated translations.",
        files,
        ci: ciWith("success")
      })
    );

    expect(signalIds(analysis.signals)).toContain("localization_catalog_change");
    expect(signalIds(analysis.signals)).not.toContain("large_pr");
    expect(signalIds(analysis.signals)).not.toContain("short_description_for_large_pr");
    expect(analysis.categories.security).toBe(0);
    expect(analysis.attention).toBe("low");
    expect(analysis.recommended_action).toBe("normal_review");
  });

  it("does not treat documentation migration guides as database migrations", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        body: "Update migration guide.",
        files: [changedFile("docs/guide/migration.md", 10)]
      })
    );

    expect(analysis.categories.migrations).toBe(0);
    expect(signalIds(analysis.signals)).not.toContain("migration_changed");
    expect(analysis.recommended_action).toBe("normal_review");
  });

  it("does not route tests-only migration folders or JSON schemas to migration review", () => {
    const testsOnly = analyzePullRequestData(
      dataWith({
        title: "Update migration test coverage",
        body: "Refine migration tests.",
        files: [changedFile("tests/migrations/test_runner.py", 12)],
        ci: ciWith("success")
      })
    );

    expect(testsOnly.categories.migrations).toBe(0);
    expect(signalIds(testsOnly.signals)).not.toContain("migration_changed");
    expect(testsOnly.recommended_action).toBe("normal_review");

    const jsonSchema = analyzePullRequestData(
      dataWith({
        title: "Update JSON schema metadata",
        body: "Adjust table schema metadata.",
        files: [changedFile("schemas/user.schema.json", 12)],
        ci: ciWith("success")
      })
    );

    expect(jsonSchema.categories.migrations).toBe(0);
    expect(signalIds(jsonSchema.signals)).toContain("persistence_data_format_change");
    expect(signalIds(jsonSchema.signals)).not.toContain("migration_changed");
    expect(jsonSchema.recommended_action).toBe("normal_review");
  });

  it("routes Rails database rake tasks to migration review", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "Add support for multiple databases to rails db:abort_if_pending_migrations",
        body: "Update the database rake task and tests.",
        files: [
          changedFile("activerecord/lib/active_record/railties/databases.rake", 26),
          changedFile("railties/test/application/rake/multi_dbs_test.rb", 26),
          changedFile("activerecord/CHANGELOG.md", 4)
        ]
      })
    );

    expect(analysis.categories.migrations).toBe(1);
    expect(signalIds(analysis.signals)).toContain("migration_changed");
    expect(analysis.attention).toBe("medium");
    expect(analysis.recommended_action).toBe("migration_review");
  });

  it("prefers migration review over security when database fixtures dominate", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "Remove experimental JS migrations",
        body: "Update migration fixtures and schema config.",
        files: [
          changedFile("db/schema.rb", 10),
          changedFile("db/fixtures/users.yml", 10),
          changedFile(
            "packages/client/src/__tests__/integration/errors/default-foreign-key-error-mysql/prisma.config.ts",
            10
          ),
          changedFile("packages/migrate/src/SchemaEngineCLI.ts", 10),
          changedFile("packages/client/tests/e2e/env-var-security/prisma.config.ts", 10)
        ]
      })
    );

    expect(signalIds(analysis.signals)).toContain("dominant_database_change");
    expect(signalIds(analysis.signals)).not.toContain("auth_related_change");
    expect(analysis.recommended_action).toBe("migration_review");
  });

  it("does not treat AUTHORS or storage key tests as security-sensitive", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        body: "Update tests and authors.",
        files: [
          changedFile("AUTHORS", 1),
          changedFile("pandas/tests/io/pytables/test_keys.py", 12),
          changedFile("testing/test_config.py", 10)
        ],
        ci: ciWith("success")
      })
    );

    expect(analysis.categories.security).toBe(0);
    expect(signalIds(analysis.signals)).not.toContain("security_sensitive_file_changed");
    expect(signalIds(analysis.signals)).not.toContain("auth_related_change");
    expect(signalIds(analysis.signals)).not.toContain("secret_related_change");
    expect(analysis.recommended_action).toBe("normal_review");
  });

  it("does not wait for only cancelled or skipped CI items", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        body: "Update tests.",
        files: [changedFile("tests/unit/test_append.py", 10)],
        ci: ciWithItems("failure", [
          {
            kind: "check_run",
            name: "publish",
            state: "failure",
            status: "completed",
            conclusion: "cancelled",
            url: null
          },
          {
            kind: "check_run",
            name: "Upload nightly packages to Anaconda",
            state: "failure",
            status: "completed",
            conclusion: "cancelled",
            url: null
          }
        ])
      })
    );

    expect(signalIds(analysis.signals)).toContain("ci_checks_noncritical");
    expect(signalIds(analysis.signals)).not.toContain("ci_checks_failed");
    expect(analysis.attention).toBe("low");
    expect(analysis.recommended_action).toBe("normal_review");
  });

  it("adds a cautious persistence/data-format signal without changing review action", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "BUG: HDF5 pandas_version attr should be updated",
        body: "Fix PyTables persisted format metadata.",
        files: [
          changedFile("pandas/io/pytables.py", 20),
          changedFile("pandas/tests/io/pytables/test_store.py", 10),
          changedFile("doc/source/whatsnew/v3.0.0.rst", 4)
        ]
      })
    );

    expect(signalIds(analysis.signals)).toContain("persistence_data_format_change");
    expect(analysis.attention).toBe("medium");
    expect(analysis.recommended_action).toBe("normal_review");
  });

  it("detects HDF/PyTables persistence context in tests-only changes", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "TST: add legacy file generation and tests for HDF5",
        body: "Add legacy storage compatibility tests.",
        files: [
          changedFile("pandas/tests/io/pytables/test_keys.py", 12),
          changedFile("pandas/tests/io/pytables/generate_legacy_storage_files.py", 8)
        ],
        ci: ciWith("success")
      })
    );

    expect(signalIds(analysis.signals)).toContain("persistence_data_format_change");
    expect(signalIds(analysis.signals)).not.toContain("secret_related_change");
    expect(analysis.attention).toBe("medium");
    expect(analysis.recommended_action).toBe("normal_review");
  });

  it("keeps cohesive test dependency and green CI updates out of request_split", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        body: "Update dependency test workflow.",
        files: [
          changedFile("pyproject.toml", 6),
          changedFile(".github/workflows/test.yml", 12),
          changedFile(".github/workflows/publish.yml", 12),
          changedFile("tests/test_fastapi_cli.py", 8)
        ],
        ci: ciWith("success")
      })
    );

    expect(signalIds(analysis.signals)).not.toContain("mixed_concerns");
    expect(analysis.attention).toBe("medium");
    expect(analysis.recommended_action).toBe("dependency_review");
  });

  it("routes pre-commit pin updates through dependency review", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "Bump pre-commit hook versions",
        body: "",
        files: [changedFile(".pre-commit-config.yaml", 6)],
        ci: ciWith("success")
      })
    );

    expect(signalIds(analysis.signals)).toContain("dependency_manifest_changed");
    expect(analysis.recommended_action).toBe("dependency_review");
  });

  it("does not ask for tests on very small low-risk source metadata changes with green CI", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "Add file extension to type table",
        body: "Update the file extension table.",
        files: [changedFile("src/filetypes/extensions.py", 4)],
        ci: ciWith("success")
      })
    );

    expect(signalIds(analysis.signals)).toContain("source_wording_change");
    expect(signalIds(analysis.signals)).not.toContain("code_without_tests");
    expect(analysis.recommended_action).toBe("normal_review");
  });

  it("does not ask for tests on incidental generated requirements updates with green CI", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "Fix spelling in requirements generator",
        body: "Spelling-only generator update.",
        files: [
          changedFile("scripts/generate_requirements.py", 2),
          changedFile("requirements-dev.txt", 1)
        ],
        ci: ciWith("success")
      })
    );

    expect(signalIds(analysis.signals)).toContain("source_wording_change");
    expect(signalIds(analysis.signals)).toContain("dependency_manifest_changed");
    expect(signalIds(analysis.signals)).not.toContain("code_without_tests");
    expect(analysis.recommended_action).toBe("normal_review");
  });

  it("routes container image and HelmRelease updates away from unknown normal review", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "Update container image tag",
        body: "Bump the runtime image.",
        files: [changedFile("deploy/prod/helmrelease.yaml", 6)],
        ci: ciWith("success")
      })
    );

    expect(signalIds(analysis.signals)).toContain("container_image_update");
    expect(analysis.recommended_action).toBe("dependency_review");
  });

  it("does not request split for coherent release note only updates", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        title: "Version 2.4.1 release notes",
        body: "",
        files: [
          changedFile(".changeset/fix-one.md", 2),
          changedFile(".changeset/fix-two.md", 2),
          changedFile("CHANGELOG.md", 4)
        ],
        ci: ciWith("success")
      })
    );

    expect(signalIds(analysis.signals)).toContain("release_version_update");
    expect(signalIds(analysis.signals)).not.toContain("mixed_concerns");
    expect(analysis.recommended_action).toBe("normal_review");
  });

  it("prioritizes dependency files before CI workflows in dependency-heavy PRs", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        body: "Updates dependencies and workflows.",
        files: [
          changedFile(".github/workflows/ci.yml", 20),
          changedFile("package.json", 4),
          changedFile("pnpm-lock.yaml", 120)
        ]
      })
    );

    expect(analysis.priority_files[0]?.path).toBe("pnpm-lock.yaml");
    expect(analysis.priority_files[1]?.path).toBe("package.json");
  });

  it("routes failing GitHub CI checks to wait_for_ci", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        body: "Update dependency versions for compatibility.",
        files: [changedFile("package.json", 8), changedFile("package-lock.json", 120)],
        ci: ciWith("failure")
      })
    );

    expect(signalIds(analysis.signals)).toContain("ci_checks_failed");
    expect(analysis.attention).toBe("high");
    expect(analysis.recommended_action).toBe("wait_for_ci");
  });

  it("routes pending GitHub CI checks to wait_for_ci", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        body: "Update source code.",
        files: [changedFile("src/app.ts", 12), changedFile("tests/app.test.ts", 6)],
        ci: ciWith("pending")
      })
    );

    expect(signalIds(analysis.signals)).toContain("ci_checks_pending");
    expect(analysis.recommended_action).toBe("wait_for_ci");
  });

  it("keeps direct security-sensitive changes above failing CI in action priority", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        body: "Fix session token handling.",
        files: [
          changedFile("src/auth/session-token.ts", 18),
          changedFile("tests/session.test.ts", 8)
        ],
        ci: ciWith("failure")
      })
    );

    expect(signalIds(analysis.signals)).toEqual(
      expect.arrayContaining([
        "security_sensitive_file_changed",
        "auth_related_change",
        "ci_checks_failed"
      ])
    );
    expect(analysis.recommended_action).toBe("security_review");
  });

  it("uses configured size thresholds without changing default behavior", () => {
    const config = mergePrSignalConfig({
      attention_thresholds: {
        medium_files_changed: 10,
        medium_lines_changed: 500,
        large_files_changed: 30,
        large_lines_changed: 1200
      }
    });
    const files = Array.from({ length: 6 }, (_, index) => changedFile(`docs/page-${index}.md`, 10));
    const analysis = analyzePullRequestData(
      dataWith({
        body: "Update docs.",
        files
      }),
      config
    );

    expect(signalIds(analysis.signals)).toContain("small_pr");
    expect(signalIds(analysis.signals)).not.toContain("medium_pr");
  });

  it("uses configured paths for security-sensitive classification", () => {
    const config = mergePrSignalConfig({
      paths: {
        security: ["app/identity/**"]
      }
    });
    const analysis = analyzePullRequestData(
      dataWith({
        body: "Update identity lookup.",
        files: [changedFile("app/identity/profile.ts", 12), changedFile("tests/profile.test.ts", 4)]
      }),
      config
    );

    expect(analysis.categories.security).toBe(1);
    expect(signalIds(analysis.signals)).toContain("security_sensitive_file_changed");
  });

  it("omits configured ignore paths from signal analysis", () => {
    const config = mergePrSignalConfig({
      ignore_paths: ["docs/generated/**"]
    });
    const analysis = analyzePullRequestData(
      dataWith({
        body: "Regenerate docs.",
        files: Array.from({ length: 25 }, (_, index) =>
          changedFile(`docs/generated/page-${index}.md`, 10)
        )
      }),
      config
    );

    expect(analysis.classified_files).toHaveLength(0);
    expect(signalIds(analysis.signals)).toContain("small_pr");
    expect(signalIds(analysis.signals)).not.toContain("large_pr");
  });
});

function signalIds(signals: Array<{ id: string }>): string[] {
  return signals.map((signal) => signal.id);
}

function dataWith(options: {
  title?: string;
  body: string;
  files: GitHubChangedFileSummary[];
  additions?: number;
  deletions?: number;
  ci?: GitHubCiSummary;
}): GitHubPullRequestData {
  const additions =
    options.additions ?? options.files.reduce((total, file) => total + file.additions, 0);
  const deletions =
    options.deletions ?? options.files.reduce((total, file) => total + file.deletions, 0);

  return {
    schema_version: "github-pr.v1",
    source: "fixture",
    repository: {
      owner: "org",
      name: "repo",
      full_name: "org/repo",
      html_url: "https://github.com/org/repo"
    },
    pull_request: {
      number: 123,
      title: options.title ?? "Synthetic PR",
      body: options.body,
      author: "contributor",
      html_url: "https://github.com/org/repo/pull/123",
      state: "open",
      draft: false,
      created_at: "2026-06-01T10:00:00Z",
      updated_at: "2026-06-02T10:00:00Z",
      merged_at: null,
      head: {
        ref: "feature",
        sha: "1111111111111111111111111111111111111111",
        repo_full_name: "contributor/repo"
      },
      base: {
        ref: "main",
        sha: "2222222222222222222222222222222222222222",
        repo_full_name: "org/repo"
      },
      commits: 1,
      additions,
      deletions,
      changed_files: options.files.length
    },
    files: options.files,
    diff: {
      format: "unified",
      text: "",
      bytes: 0,
      lines: 0
    },
    ci: options.ci ?? ciWith("unknown"),
    limitations: []
  };
}

function ciWithItems(
  state: GitHubCiSummary["state"],
  items: GitHubCiSummary["items"]
): GitHubCiSummary {
  return {
    head_sha: "1111111111111111111111111111111111111111",
    state,
    total: items.length,
    successful: items.filter((item) => item.state === "success").length,
    failed: items.filter((item) => item.state === "failure").length,
    pending: items.filter((item) => item.state === "pending").length,
    skipped: items.filter((item) => item.conclusion === "skipped").length,
    items
  };
}

function ciWith(state: GitHubCiSummary["state"]): GitHubCiSummary {
  const item =
    state === "unknown"
      ? []
      : [
          {
            kind: "check_run" as const,
            name: state === "failure" ? "test" : "build",
            state,
            status: state === "pending" ? "in_progress" : "completed",
            conclusion: state === "failure" ? "failure" : state === "success" ? "success" : null,
            url: null
          }
        ];

  return {
    head_sha: "1111111111111111111111111111111111111111",
    state,
    total: item.length,
    successful: state === "success" ? 1 : 0,
    failed: state === "failure" ? 1 : 0,
    pending: state === "pending" ? 1 : 0,
    skipped: 0,
    items: item
  };
}

function changedFile(path: string, changes: number): GitHubChangedFileSummary {
  return {
    path,
    previous_path: null,
    status: "modified",
    additions: changes,
    deletions: 0,
    changes,
    patch_available: true,
    blob_url: null,
    raw_url: null
  };
}
