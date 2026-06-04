import { describe, expect, it } from "vitest";

import { classifyChangedFile } from "../../src/classify/classify-file.js";
import type { GitHubChangedFileSummary } from "../../src/github/types.js";

describe("classifyChangedFile", () => {
  it("classifies source code and security-sensitive paths", () => {
    expect(classifyChangedFile(file("src/auth/session.ts")).categories).toEqual([
      "security",
      "code"
    ]);
  });

  it("classifies dependency manifests and lockfiles", () => {
    expect(classifyChangedFile(file("package.json")).categories).toEqual([
      "dependencies",
      "release"
    ]);
    expect(classifyChangedFile(file("package-lock.json")).categories).toEqual(["dependencies"]);
  });

  it("classifies CI workflow files as CI, configuration and automation-sensitive", () => {
    expect(classifyChangedFile(file(".github/workflows/ci.yml")).categories).toEqual([
      "ci",
      "automation",
      "configuration"
    ]);
  });

  it("classifies Dockerfile as automation-sensitive build context, not app security", () => {
    expect(classifyChangedFile(file("Dockerfile")).categories).toEqual(["automation", "build"]);
  });

  it("classifies documentation, tests, migrations and generated files", () => {
    expect(classifyChangedFile(file("docs/guide.md")).categories).toEqual(["documentation"]);
    expect(classifyChangedFile(file("AUTHORS")).categories).toEqual(["documentation"]);
    expect(classifyChangedFile(file("tests/unit/parser.test.ts")).categories).toEqual(["tests"]);
    expect(classifyChangedFile(file("testing/test_assertrewrite.py")).categories).toEqual([
      "tests"
    ]);
    expect(
      classifyChangedFile(file("packages/vite/src/node/__tests_dts__/importGlob.ts")).categories
    ).toEqual(["tests"]);
    expect(classifyChangedFile(file("test/session.js")).categories).toEqual(["tests"]);
    expect(classifyChangedFile(file("docs/guide/migration.md")).categories).toEqual([
      "documentation"
    ]);
    expect(classifyChangedFile(file("prisma/migrations/001_init.sql")).categories).toEqual([
      "migrations"
    ]);
    expect(classifyChangedFile(file("dist/generated/client.js")).categories).toEqual([
      "generated",
      "build"
    ]);
  });

  it("classifies common database schema and rake task paths as migrations", () => {
    expect(
      classifyChangedFile(file("activerecord/lib/active_record/railties/databases.rake")).categories
    ).toEqual(["migrations", "code"]);
    expect(classifyChangedFile(file("db/schema.rb")).categories).toEqual(["migrations", "code"]);
    expect(classifyChangedFile(file("db/fixtures/users.yml")).categories).toEqual([
      "tests",
      "configuration",
      "migrations"
    ]);
  });

  it("recognizes common test naming conventions across ecosystems", () => {
    expect(classifyChangedFile(file("src/examples-smoke.e2e.ts")).categories).toEqual(["tests"]);
    expect(classifyChangedFile(file("pkg/http/client_test.go")).categories).toEqual(["tests"]);
    expect(classifyChangedFile(file("src/App.Tests.cs")).categories).toEqual(["tests"]);
    expect(classifyChangedFile(file("server/src/test/java/org/example/FooIT.java")).categories).toEqual([
      "tests"
    ]);
    expect(classifyChangedFile(file("qa/rolling-upgrade/src/test/java/FooITCase.java")).categories).toEqual([
      "tests"
    ]);
    expect(classifyChangedFile(file("muted-tests/FooTestCase.java")).categories).toEqual([
      "tests"
    ]);
    expect(classifyChangedFile(file("src/internalClusterTest/java/FooTests.java")).categories).toEqual([
      "tests"
    ]);
    expect(classifyChangedFile(file("testfixtures/Foo.java")).categories).toEqual(["tests"]);
    expect(classifyChangedFile(file("integration/test_project/Program.cs")).categories).toEqual([
      "tests"
    ]);
    expect(classifyChangedFile(file("testsuite/parser/ParserSpec.java")).categories).toEqual([
      "tests"
    ]);
    expect(classifyChangedFile(file(".github/workflows/test-redistribute.yml")).categories).toEqual([
      "ci",
      "automation",
      "configuration"
    ]);
  });

  it("classifies container and tooling update files as build/dependency context", () => {
    expect(classifyChangedFile(file("Dockerfile.windows")).categories).toEqual([
      "automation",
      "build"
    ]);
    expect(classifyChangedFile(file("configure.py")).categories).toEqual(["build", "code"]);
    expect(classifyChangedFile(file("node.gyp")).categories).toEqual(["configuration", "build"]);
    expect(classifyChangedFile(file(".pre-commit-config.yaml")).categories).toEqual([
      "dependencies",
      "configuration"
    ]);
    expect(classifyChangedFile(file("renovate.json")).categories).toEqual([
      "dependencies",
      "configuration"
    ]);
    expect(classifyChangedFile(file("dependency-policy.json")).categories).toEqual([
      "dependencies",
      "configuration"
    ]);
  });

  it("does not classify localization catalogs under auth as app security-sensitive", () => {
    expect(
      classifyChangedFile(file("django/contrib/auth/locale/en/LC_MESSAGES/django.po")).categories
    ).toEqual(["documentation"]);
    expect(
      classifyChangedFile(file("django/contrib/auth/locale/en/LC_MESSAGES/django.mo")).categories
    ).toEqual(["generated"]);
  });

  it("matches narrow security terms without treating oracle as acl", () => {
    expect(classifyChangedFile(file("django/db/backends/oracle/operations.py")).categories).toEqual(
      ["code"]
    );
    expect(classifyChangedFile(file("src/policies/acl.ts")).categories).toEqual([
      "security",
      "code"
    ]);
  });

  it("keeps docs tests fixtures and protocol sessions out of automatic security routing", () => {
    expect(classifyChangedFile(file("docs/en/mkdocs.env.yml")).categories).toEqual([
      "documentation",
      "configuration"
    ]);
    expect(classifyChangedFile(file("LICENSE-THIRD-PARTY")).categories).toEqual([
      "documentation"
    ]);
    expect(classifyChangedFile(file("setup_env.sh")).categories).toEqual(["code"]);
    expect(classifyChangedFile(file("src/vite-env.d.ts")).categories).toEqual(["code"]);
    expect(classifyChangedFile(file(".env.example")).categories).toEqual(["configuration"]);
    expect(classifyChangedFile(file(".env.sample")).categories).toEqual(["configuration"]);
    expect(classifyChangedFile(file(".env")).categories).toEqual(["security"]);
    expect(classifyChangedFile(file("tests/fixtures/.env")).categories).toEqual(["tests"]);
    expect(classifyChangedFile(file("tests/fixtures/secret.json")).categories).toEqual(["tests"]);
    expect(classifyChangedFile(file("packages/security/package.json")).categories).toEqual([
      "dependencies",
      "release"
    ]);
    expect(classifyChangedFile(file("testing/test_session.py")).categories).toEqual(["tests"]);
    expect(classifyChangedFile(file("test/protocol/session.spec.ts")).categories).toEqual([
      "tests"
    ]);
    expect(classifyChangedFile(file("src/compiler/session.ts")).categories).toEqual(["code"]);
    expect(classifyChangedFile(file("x-pack/plugin/esql/session/Session.java")).categories).toEqual([
      "code"
    ]);
    expect(classifyChangedFile(file("src/protocol/quic/session.ts")).categories).toEqual([
      "code"
    ]);
    expect(classifyChangedFile(file("src/auth/hashers.py")).categories).toEqual([
      "security",
      "code"
    ]);
    expect(classifyChangedFile(file("config/credentials.yml")).categories).toEqual([
      "configuration",
      "security"
    ]);
    expect(classifyChangedFile(file("src/policies/permissions.ts")).categories).toEqual([
      "security",
      "code"
    ]);
  });

  it("does not treat non database schemas as migrations", () => {
    expect(classifyChangedFile(file("schemas/user.schema.json")).categories).toEqual(["unknown"]);
    expect(classifyChangedFile(file("src/types/schema.ts")).categories).toEqual(["code"]);
    expect(classifyChangedFile(file("tests/migrations/test_runner.py")).categories).toEqual([
      "tests"
    ]);
    expect(classifyChangedFile(file("tests/fixtures/generated/schema.prisma")).categories).toEqual([
      "generated",
      "tests"
    ]);
  });

  it("requires strong context before treating key paths as secrets", () => {
    expect(classifyChangedFile(file("AUTHORS")).categories).not.toContain("security");
    expect(
      classifyChangedFile(
        file(
          "packages/client/src/__tests__/integration/errors/referentialActions-onDelete-default-foreign-key-error-mysql/prisma.config.ts"
        )
      ).categories
    ).toEqual(["tests", "configuration", "migrations"]);
    expect(classifyChangedFile(file("pandas/tests/io/pytables/test_keys.py")).categories).toEqual([
      "tests"
    ]);
    expect(classifyChangedFile(file("src/security/api-key.ts")).categories).toEqual([
      "security",
      "code"
    ]);
  });

  it("classifies test requirements and uv lockfiles as dependency files", () => {
    expect(classifyChangedFile(file("requirements-tests.txt")).categories).toEqual([
      "dependencies"
    ]);
    expect(classifyChangedFile(file("uv.lock")).categories).toEqual(["dependencies"]);
  });
});

function file(path: string): GitHubChangedFileSummary {
  return {
    path,
    previous_path: null,
    status: "modified",
    additions: 5,
    deletions: 1,
    changes: 6,
    patch_available: true,
    blob_url: null,
    raw_url: null
  };
}
