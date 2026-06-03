import { GitHubPullRequestUrlError, parseGitHubPullRequestUrl } from "../../github/parse-url.js";
import {
  fetchGitHubPullRequest,
  getGitHubToken,
  GitHubFetchError
} from "../../github/fetch-pr.js";
import { GitHubFixtureError, loadGitHubPullRequestFixture } from "../../github/fixtures.js";
import { summarizeGitHubPullRequestData } from "../../github/summary.js";

export type OutputFormat = "md" | "json" | "all";

export type PrCommandOptions = {
  dryRun?: boolean;
  fixture?: string;
  out: string;
  format: OutputFormat;
  quiet?: boolean;
  agent?: boolean;
};

export function buildPrDryRun(url: string, options: PrCommandOptions) {
  const pullRequest = parseGitHubPullRequestUrl(url);

  return {
    mode: "dry-run",
    pull_request: pullRequest,
    output: {
      directory: options.out,
      format: options.format,
      agent_context: options.agent !== false
    },
    next: "Run without --dry-run to fetch GitHub metadata, changed files and diff."
  };
}

export async function buildPrResult(url: string, options: PrCommandOptions) {
  const pullRequest = parseGitHubPullRequestUrl(url);

  if (options.dryRun) {
    return buildPrDryRun(url, options);
  }

  const data = options.fixture
    ? await loadGitHubPullRequestFixture(options.fixture, pullRequest)
    : await fetchGitHubPullRequest(pullRequest, { token: getGitHubToken() });

  return summarizeGitHubPullRequestData(data);
}

export async function runPrCommand(url: string, options: PrCommandOptions): Promise<void> {
  try {
    const result = await buildPrResult(url, options);

    if (!options.quiet) {
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    if (error instanceof GitHubPullRequestUrlError) {
      throw new Error(
        `${error.message} Action: retry with a URL like https://github.com/org/repo/pull/123.`,
        { cause: error }
      );
    }

    if (error instanceof GitHubFetchError || error instanceof GitHubFixtureError) {
      throw new Error(error.message, { cause: error });
    }

    throw error;
  }
}
