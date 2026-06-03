import { GitHubPullRequestUrlError, parseGitHubPullRequestUrl } from "../../github/parse-url.js";

export type OutputFormat = "md" | "json" | "all";

export type PrCommandOptions = {
  dryRun?: boolean;
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
    next: "GitHub fetch is intentionally not implemented in Phase 1."
  };
}

export function runPrCommand(url: string, options: PrCommandOptions): void {
  try {
    const result = buildPrDryRun(url, options);

    if (!options.dryRun) {
      throw new Error(
        "GitHub fetching is not implemented yet. Re-run with --dry-run to validate PR URL parsing."
      );
    }

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

    throw error;
  }
}
