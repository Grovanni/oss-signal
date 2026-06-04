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
    expect(classifyChangedFile(file("tests/unit/parser.test.ts")).categories).toEqual(["tests"]);
    expect(classifyChangedFile(file("test/session.js")).categories).toEqual(["tests", "security"]);
    expect(classifyChangedFile(file("prisma/migrations/001_init.sql")).categories).toEqual([
      "migrations"
    ]);
    expect(classifyChangedFile(file("dist/generated/client.js")).categories).toEqual([
      "generated",
      "build"
    ]);
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
