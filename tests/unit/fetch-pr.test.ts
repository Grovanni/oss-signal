import { describe, expect, it } from "vitest";

import {
  fetchGitHubPullRequest,
  GitHubFetchError,
  getGitHubToken,
  type FetchLike
} from "../../src/github/fetch-pr.js";
import { parseGitHubPullRequestUrl } from "../../src/github/parse-url.js";

const pullRequestPayload = {
  number: 123,
  html_url: "https://github.com/org/repo/pull/123",
  title: "Add parser tests",
  body: "Adds deterministic parser coverage.",
  user: { login: "contributor" },
  state: "open",
  draft: false,
  created_at: "2026-06-01T10:00:00Z",
  updated_at: "2026-06-02T10:00:00Z",
  merged_at: null,
  head: {
    ref: "feature/parser-tests",
    sha: "1111111111111111111111111111111111111111",
    repo: {
      name: "repo",
      full_name: "contributor/repo",
      html_url: "https://github.com/contributor/repo",
      owner: { login: "contributor" }
    }
  },
  base: {
    ref: "main",
    sha: "2222222222222222222222222222222222222222",
    repo: {
      name: "repo",
      full_name: "org/repo",
      html_url: "https://github.com/org/repo",
      owner: { login: "org" }
    }
  },
  commits: 2,
  additions: 18,
  deletions: 3,
  changed_files: 2
};

const filesPayload = [
  {
    filename: "src/github/parse-url.ts",
    status: "modified",
    additions: 8,
    deletions: 1,
    changes: 9,
    patch: "@@ -1,2 +1,3 @@\n export function parse() {}\n+export function normalize() {}\n",
    blob_url: "https://github.com/org/repo/blob/sha/src/github/parse-url.ts",
    raw_url: "https://github.com/org/repo/raw/sha/src/github/parse-url.ts"
  },
  {
    filename: "tests/unit/parse-url.test.ts",
    status: "added",
    additions: 10,
    deletions: 2,
    changes: 12,
    patch: "@@ -0,0 +1,2 @@\n+import { expect, it } from \"vitest\";\n+it(\"parses\", () => expect(true).toBe(true));\n",
    blob_url: "https://github.com/org/repo/blob/sha/tests/unit/parse-url.test.ts",
    raw_url: "https://github.com/org/repo/raw/sha/tests/unit/parse-url.test.ts"
  }
];

const diffText = "diff --git a/file.ts b/file.ts\n+secret-looking-content-is-not-printed-by-summary\n";
const commitStatusPayload = {
  state: "success",
  total_count: 1,
  statuses: [
    {
      context: "legacy-ci",
      state: "success",
      target_url: "https://ci.example.test/legacy"
    }
  ]
};
const checkRunsPayload = {
  total_count: 2,
  check_runs: [
    {
      name: "build",
      status: "completed",
      conclusion: "success",
      html_url: "https://github.com/org/repo/actions/runs/1"
    },
    {
      name: "test",
      status: "completed",
      conclusion: "success",
      html_url: "https://github.com/org/repo/actions/runs/2"
    }
  ]
};

describe("fetchGitHubPullRequest", () => {
  it("fetches and normalizes metadata, changed files and diff", async () => {
    const calls: Array<{ url: string; accept: string | null; authorization: string | null }> = [];
    const fetchImpl = createFetchMock({
      "application/vnd.github+json https://api.github.com/repos/org/repo/pulls/123": jsonResponse(
        pullRequestPayload
      ),
      "application/vnd.github+json https://api.github.com/repos/org/repo/pulls/123/files?per_page=100&page=1":
        jsonResponse(filesPayload),
      "application/vnd.github.v3.diff https://api.github.com/repos/org/repo/pulls/123": textResponse(
        diffText
      ),
      "application/vnd.github+json https://api.github.com/repos/org/repo/commits/1111111111111111111111111111111111111111/status":
        jsonResponse(commitStatusPayload),
      "application/vnd.github+json https://api.github.com/repos/org/repo/commits/1111111111111111111111111111111111111111/check-runs?per_page=100":
        jsonResponse(checkRunsPayload)
    }, calls);

    const data = await fetchGitHubPullRequest(
      parseGitHubPullRequestUrl("https://github.com/org/repo/pull/123"),
      {
        fetchImpl,
        token: "test-token"
      }
    );

    expect(data.repository.full_name).toBe("org/repo");
    expect(data.pull_request.title).toBe("Add parser tests");
    expect(data.files).toHaveLength(2);
    expect(data.files[0]).toMatchObject({
      path: "src/github/parse-url.ts",
      status: "modified",
      patch_available: true
    });
    expect(data.diff.text).toBe(diffText);
    expect(data.diff.bytes).toBeGreaterThan(0);
    expect(data.ci).toMatchObject({
      state: "success",
      total: 3,
      successful: 3,
      failed: 0,
      pending: 0
    });
    expect(calls.map((call) => call.authorization)).toEqual([
      "Bearer test-token",
      "Bearer test-token",
      "Bearer test-token",
      "Bearer test-token",
      "Bearer test-token"
    ]);
    expect(JSON.stringify(data)).not.toContain("test-token");
  });

  it("keeps PR data usable when GitHub CI status is unavailable", async () => {
    const fetchImpl = createFetchMock({
      "application/vnd.github+json https://api.github.com/repos/org/repo/pulls/123": jsonResponse(
        pullRequestPayload
      ),
      "application/vnd.github+json https://api.github.com/repos/org/repo/pulls/123/files?per_page=100&page=1":
        jsonResponse(filesPayload),
      "application/vnd.github.v3.diff https://api.github.com/repos/org/repo/pulls/123": textResponse(
        diffText
      ),
      "application/vnd.github+json https://api.github.com/repos/org/repo/commits/1111111111111111111111111111111111111111/status":
        new Response(JSON.stringify({ message: "forbidden" }), { status: 403 }),
      "application/vnd.github+json https://api.github.com/repos/org/repo/commits/1111111111111111111111111111111111111111/check-runs?per_page=100":
        new Response(JSON.stringify({ message: "forbidden" }), { status: 403 })
    });

    const data = await fetchGitHubPullRequest(
      parseGitHubPullRequestUrl("https://github.com/org/repo/pull/123"),
      { fetchImpl }
    );

    expect(data.ci.state).toBe("unknown");
    expect(data.limitations).toContain("GitHub CI status unavailable: forbidden.");
  });

  it("maps GitHub rate limit responses to a readable error", async () => {
    const fetchImpl = createFetchMock({
      "application/vnd.github+json https://api.github.com/repos/org/repo/pulls/123": new Response(
        JSON.stringify({ message: "API rate limit exceeded" }),
        {
          status: 403,
          headers: {
            "content-type": "application/json",
            "x-ratelimit-remaining": "0"
          }
        }
      )
    });

    await expect(
      fetchGitHubPullRequest(parseGitHubPullRequestUrl("https://github.com/org/repo/pull/123"), {
        fetchImpl
      })
    ).rejects.toMatchObject<Partial<GitHubFetchError>>({
      code: "rate_limited",
      status: 403
    });
  });

  it("prefers GITHUB_TOKEN over GH_TOKEN", () => {
    expect(
      getGitHubToken({
        GITHUB_TOKEN: "github-token",
        GH_TOKEN: "gh-token"
      })
    ).toBe("github-token");
  });
});

function createFetchMock(
  routes: Record<string, Response>,
  calls: Array<{ url: string; accept: string | null; authorization: string | null }> = []
): FetchLike {
  return async (input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    const accept = headers.get("accept");
    const authorization = headers.get("authorization");
    calls.push({ url, accept, authorization });

    const response = routes[`${accept} ${url}`];

    if (!response) {
      return new Response(JSON.stringify({ message: "missing mock route" }), { status: 500 });
    }

    return response;
  };
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

function textResponse(payload: string): Response {
  return new Response(payload, {
    status: 200,
    headers: { "content-type": "text/plain" }
  });
}
