import { describe, expect, it } from "vitest";

import {
  GitHubPullRequestUrlError,
  parseGitHubPullRequestUrl
} from "../../src/github/parse-url.js";

describe("parseGitHubPullRequestUrl", () => {
  it("parses a canonical GitHub pull request URL", () => {
    expect(parseGitHubPullRequestUrl("https://github.com/org/repo/pull/123")).toEqual({
      owner: "org",
      repo: "repo",
      pullNumber: 123,
      htmlUrl: "https://github.com/org/repo/pull/123"
    });
  });

  it("normalizes query strings, hashes, and trailing slashes", () => {
    expect(parseGitHubPullRequestUrl("https://github.com/Grovanni/oss-signal/pull/7/?x=1#diff")).toEqual({
      owner: "Grovanni",
      repo: "oss-signal",
      pullNumber: 7,
      htmlUrl: "https://github.com/Grovanni/oss-signal/pull/7"
    });
  });

  it("supports common repository name characters", () => {
    expect(parseGitHubPullRequestUrl("https://github.com/org/repo.name_test-case/pull/42")).toEqual({
      owner: "org",
      repo: "repo.name_test-case",
      pullNumber: 42,
      htmlUrl: "https://github.com/org/repo.name_test-case/pull/42"
    });
  });

  it.each([
    "not-a-url",
    "http://github.com/org/repo/pull/1",
    "https://gitlab.com/org/repo/pull/1",
    "https://github.com/org/repo/issues/1",
    "https://github.com/org/repo/pull/0",
    "https://github.com/org/repo/pull/01",
    "https://github.com/org/repo/pull/not-a-number",
    "https://github.com/-org/repo/pull/1",
    "https://github.com/org/repo/pull/1/files"
  ])("rejects invalid PR URL %s", (url) => {
    expect(() => parseGitHubPullRequestUrl(url)).toThrow(GitHubPullRequestUrlError);
  });
});
