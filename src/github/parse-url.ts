import { z } from "zod";

const ownerPattern = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
const repoPattern = /^[a-zA-Z0-9._-]+$/;

export const githubPullRequestUrlSchema = z.object({
  owner: z.string().regex(ownerPattern),
  repo: z.string().min(1).max(100).regex(repoPattern),
  pullNumber: z.number().int().positive(),
  htmlUrl: z.string().url()
});

export type ParsedGitHubPullRequestUrl = z.infer<typeof githubPullRequestUrlSchema>;

export class GitHubPullRequestUrlError extends Error {
  constructor(message = "Expected a GitHub pull request URL like https://github.com/org/repo/pull/123.") {
    super(message);
    this.name = "GitHubPullRequestUrlError";
  }
}

export function parseGitHubPullRequestUrl(input: string): ParsedGitHubPullRequestUrl {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    throw new GitHubPullRequestUrlError();
  }

  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com") {
    throw new GitHubPullRequestUrlError("Expected an HTTPS github.com pull request URL.");
  }

  const segments = url.pathname.split("/").filter(Boolean);

  if (segments.length !== 4 || segments[2] !== "pull") {
    throw new GitHubPullRequestUrlError();
  }

  const [owner, repo, , pullNumberText] = segments;
  const pullNumber = Number.parseInt(pullNumberText, 10);

  if (!Number.isSafeInteger(pullNumber) || String(pullNumber) !== pullNumberText) {
    throw new GitHubPullRequestUrlError("Pull request number must be a positive integer.");
  }

  const result = {
    owner,
    repo,
    pullNumber,
    htmlUrl: `https://github.com/${owner}/${repo}/pull/${pullNumber}`
  };

  const parsed = githubPullRequestUrlSchema.safeParse(result);

  if (!parsed.success) {
    throw new GitHubPullRequestUrlError();
  }

  return parsed.data;
}
