import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadGitHubPullRequestFixture } from "../../src/github/fixtures.js";
import { parseGitHubPullRequestUrl } from "../../src/github/parse-url.js";

describe("loadGitHubPullRequestFixture", () => {
  it("loads normalized GitHub PR data without network access", async () => {
    const data = await loadGitHubPullRequestFixture(
      join("tests", "fixtures", "github-basic"),
      parseGitHubPullRequestUrl("https://github.com/org/repo/pull/123")
    );

    expect(data.source).toBe("fixture");
    expect(data.repository.full_name).toBe("org/repo");
    expect(data.pull_request.changed_files).toBe(2);
    expect(data.files.map((file) => file.path)).toEqual([
      "src/github/parse-url.ts",
      "tests/unit/parse-url.test.ts"
    ]);
    expect(data.diff.text).toContain("diff --git");
    expect(data.ci.state).toBe("unknown");
  });
});
