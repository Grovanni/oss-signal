import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { analyzePullRequestData } from "../../src/analyze/analyze-pr.js";
import { loadGitHubPullRequestFixture } from "../../src/github/fixtures.js";
import { parseGitHubPullRequestUrl } from "../../src/github/parse-url.js";
import type { GitHubChangedFileSummary, GitHubPullRequestData } from "../../src/github/types.js";

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
    expect(analysis.questions.map((question) => question.signal_id)).toContain("code_without_tests");
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

  it("routes large PRs to request split", () => {
    const files = Array.from({ length: 21 }, (_, index) => changedFile(`src/module-${index}.ts`, 10));
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

  it("detects mixed concerns and limits questions", () => {
    const analysis = analyzePullRequestData(
      dataWith({
        body: "Update dependency and tests.",
        files: [
          changedFile("src/app.ts", 30),
          changedFile("tests/app.test.ts", 12),
          changedFile("docs/usage.md", 4),
          changedFile("package.json", 6)
        ]
      })
    );

    expect(signalIds(analysis.signals)).toContain("mixed_concerns");
    expect(analysis.recommended_action).toBe("request_split");
    expect(analysis.questions.length).toBeLessThanOrEqual(5);
  });
});

function signalIds(signals: Array<{ id: string }>): string[] {
  return signals.map((signal) => signal.id);
}

function dataWith(options: {
  body: string;
  files: GitHubChangedFileSummary[];
  additions?: number;
  deletions?: number;
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
      title: "Synthetic PR",
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
    limitations: []
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
