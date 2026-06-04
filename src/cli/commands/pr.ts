import { GitHubPullRequestUrlError, parseGitHubPullRequestUrl } from "../../github/parse-url.js";
import {
  loadOssSignalConfig,
  OssSignalConfigError,
  type OssSignalConfig
} from "../../config/config.js";
import { fetchGitHubPullRequest, getGitHubToken, GitHubFetchError } from "../../github/fetch-pr.js";
import { GitHubFixtureError, loadGitHubPullRequestFixture } from "../../github/fixtures.js";
import { summarizeGitHubPullRequestData } from "../../github/summary.js";
import type { GitHubPullRequestOutput } from "../../github/types.js";
import { renderTerminalSummary } from "../../output/terminal.js";
import { writeReviewOutputs } from "../../output/write-outputs.js";

export type OutputFormat = "md" | "json" | "all";

export type PrCommandOptions = {
  dryRun?: boolean;
  fixture?: string;
  config?: string;
  analysisConfig?: OssSignalConfig;
  out: string;
  format: OutputFormat;
  quiet?: boolean;
  agent?: boolean;
};

export async function buildPrDryRun(url: string, options: PrCommandOptions) {
  const pullRequest = parseGitHubPullRequestUrl(url);
  const loadedConfig = await resolveConfig(options);

  return {
    mode: "dry-run",
    pull_request: pullRequest,
    config: {
      path: loadedConfig.path,
      default: loadedConfig.path === null && options.analysisConfig === undefined
    },
    output: {
      directory: options.out,
      format: options.format,
      agent_context: options.agent !== false
    },
    next: "Run without --dry-run to fetch GitHub metadata, changed files and diff."
  };
}

export async function buildPrResult(
  url: string,
  options: PrCommandOptions
): Promise<GitHubPullRequestOutput> {
  const pullRequest = parseGitHubPullRequestUrl(url);
  const loadedConfig = await resolveConfig(options);

  const data = options.fixture
    ? await loadGitHubPullRequestFixture(options.fixture, pullRequest)
    : await fetchGitHubPullRequest(pullRequest, { token: getGitHubToken() });

  return summarizeGitHubPullRequestData(data, loadedConfig.config);
}

export async function runPrCommand(url: string, options: PrCommandOptions): Promise<void> {
  try {
    if (options.dryRun) {
      const result = await buildPrDryRun(url, options);

      if (!options.quiet) {
        console.log(JSON.stringify(result, null, 2));
      }
      return;
    }

    const result = await buildPrResult(url, options);

    const written = await writeReviewOutputs(result, {
      outDir: options.out,
      format: options.format,
      includeAgentContext: options.agent !== false
    });

    if (!options.quiet) {
      console.log(renderTerminalSummary(result, written));
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

    if (error instanceof OssSignalConfigError) {
      throw new Error(error.message, { cause: error });
    }

    throw error;
  }
}

async function resolveConfig(options: PrCommandOptions) {
  if (options.analysisConfig) {
    return {
      config: options.analysisConfig,
      path: null
    };
  }

  return loadOssSignalConfig(options.config);
}
