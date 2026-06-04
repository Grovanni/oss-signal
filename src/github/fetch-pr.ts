import { Buffer } from "node:buffer";

import { z } from "zod";

import type { ParsedGitHubPullRequestUrl } from "./parse-url.js";
import type {
  GitHubCiItem,
  GitHubCiState,
  GitHubCiSummary,
  GitHubChangedFileSummary,
  GitHubPullRequestData,
  PullRequestDataSource
} from "./types.js";

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type GitHubFetchErrorCode =
  | "not_found"
  | "rate_limited"
  | "forbidden"
  | "network_unavailable"
  | "diff_unavailable"
  | "unexpected_response";

export class GitHubFetchError extends Error {
  code: GitHubFetchErrorCode;
  action: string;
  status: number | null;

  constructor(
    code: GitHubFetchErrorCode,
    message: string,
    action: string,
    status: number | null = null,
    cause?: unknown
  ) {
    super(`${message} Action: ${action}`, { cause });
    this.name = "GitHubFetchError";
    this.code = code;
    this.action = action;
    this.status = status;
  }
}

const githubUserSchema = z.object({
  login: z.string()
});

const githubRepoSchema = z.object({
  name: z.string(),
  full_name: z.string(),
  html_url: z.string().url(),
  owner: githubUserSchema
});

const githubRefSchema = z.object({
  ref: z.string(),
  sha: z.string(),
  repo: githubRepoSchema.nullable()
});

export const githubPullRequestApiSchema = z
  .object({
    number: z.number().int().positive(),
    html_url: z.string().url(),
    title: z.string(),
    body: z.string().nullable(),
    user: githubUserSchema.nullable(),
    state: z.string(),
    draft: z.boolean().default(false),
    created_at: z.string(),
    updated_at: z.string(),
    merged_at: z.string().nullable(),
    head: githubRefSchema,
    base: githubRefSchema.extend({
      repo: githubRepoSchema
    }),
    commits: z.number().int().nonnegative(),
    additions: z.number().int().nonnegative(),
    deletions: z.number().int().nonnegative(),
    changed_files: z.number().int().nonnegative()
  })
  .passthrough();

export const githubChangedFileApiSchema = z
  .object({
    filename: z.string(),
    previous_filename: z.string().optional(),
    status: z.string(),
    additions: z.number().int().nonnegative(),
    deletions: z.number().int().nonnegative(),
    changes: z.number().int().nonnegative(),
    patch: z.string().optional(),
    blob_url: z.string().url().optional(),
    raw_url: z.string().url().optional()
  })
  .passthrough();

export const githubChangedFilesApiSchema = z.array(githubChangedFileApiSchema);

const githubCommitStatusApiSchema = z
  .object({
    state: z.string(),
    total_count: z.number().int().nonnegative().default(0),
    statuses: z
      .array(
        z
          .object({
            context: z.string(),
            state: z.string(),
            target_url: z.string().url().nullable().optional()
          })
          .passthrough()
      )
      .default([])
  })
  .passthrough();

const githubCheckRunsApiSchema = z
  .object({
    total_count: z.number().int().nonnegative().default(0),
    check_runs: z
      .array(
        z
          .object({
            name: z.string(),
            status: z.string(),
            conclusion: z.string().nullable(),
            html_url: z.string().url().nullable().optional()
          })
          .passthrough()
      )
      .default([])
  })
  .passthrough();

export type GitHubPullRequestApiResponse = z.infer<typeof githubPullRequestApiSchema>;
export type GitHubChangedFileApiResponse = z.infer<typeof githubChangedFileApiSchema>;
export type GitHubCommitStatusApiResponse = z.infer<typeof githubCommitStatusApiSchema>;
export type GitHubCheckRunsApiResponse = z.infer<typeof githubCheckRunsApiSchema>;

export type FetchGitHubPullRequestOptions = {
  token?: string;
  fetchImpl?: FetchLike;
  maxFilePages?: number;
};

type NormalizeOptions = {
  source: PullRequestDataSource;
  parsedUrl: ParsedGitHubPullRequestUrl;
  pullRequest: GitHubPullRequestApiResponse;
  files: GitHubChangedFileApiResponse[];
  diffText: string;
  ci?: GitHubCiSummary;
  limitations?: string[];
};

const jsonAccept = "application/vnd.github+json";
const diffAccept = "application/vnd.github.v3.diff";

export function getGitHubToken(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const token = env.GITHUB_TOKEN || env.GH_TOKEN;
  return token && token.trim().length > 0 ? token : undefined;
}

export async function fetchGitHubPullRequest(
  parsedUrl: ParsedGitHubPullRequestUrl,
  options: FetchGitHubPullRequestOptions = {}
): Promise<GitHubPullRequestData> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  if (!fetchImpl) {
    throw new GitHubFetchError(
      "network_unavailable",
      "No fetch implementation is available.",
      "Use Node.js 20 or newer."
    );
  }

  const apiPullUrl = buildPullRequestApiUrl(parsedUrl);
  const pullRequest = await fetchJson(
    apiPullUrl,
    githubPullRequestApiSchema,
    "pull request metadata",
    { ...options, fetchImpl }
  );
  const { files, limitations } = await fetchChangedFiles(parsedUrl, { ...options, fetchImpl });
  const { diffText, limitations: diffLimitations } = await fetchDiff(apiPullUrl, {
    ...options,
    fetchImpl
  });
  const { ci, limitations: ciLimitations } = await fetchCiSummary(parsedUrl, pullRequest.head.sha, {
    ...options,
    fetchImpl
  });

  return normalizeGitHubPullRequestData({
    source: "github",
    parsedUrl,
    pullRequest,
    files,
    diffText,
    ci,
    limitations: [...limitations, ...diffLimitations, ...ciLimitations]
  });
}

export function normalizeGitHubPullRequestData(options: NormalizeOptions): GitHubPullRequestData {
  const baseRepo = options.pullRequest.base.repo;
  const diffBytes = Buffer.byteLength(options.diffText, "utf8");

  return {
    schema_version: "github-pr.v1",
    source: options.source,
    repository: {
      owner: baseRepo.owner.login || options.parsedUrl.owner,
      name: baseRepo.name || options.parsedUrl.repo,
      full_name: baseRepo.full_name || `${options.parsedUrl.owner}/${options.parsedUrl.repo}`,
      html_url: baseRepo.html_url
    },
    pull_request: {
      number: options.pullRequest.number,
      title: options.pullRequest.title,
      body: options.pullRequest.body ?? "",
      author: options.pullRequest.user?.login ?? null,
      html_url: options.pullRequest.html_url,
      state: options.pullRequest.state,
      draft: options.pullRequest.draft,
      created_at: options.pullRequest.created_at,
      updated_at: options.pullRequest.updated_at,
      merged_at: options.pullRequest.merged_at,
      head: {
        ref: options.pullRequest.head.ref,
        sha: options.pullRequest.head.sha,
        repo_full_name: options.pullRequest.head.repo?.full_name ?? null
      },
      base: {
        ref: options.pullRequest.base.ref,
        sha: options.pullRequest.base.sha,
        repo_full_name: options.pullRequest.base.repo.full_name
      },
      commits: options.pullRequest.commits,
      additions: options.pullRequest.additions,
      deletions: options.pullRequest.deletions,
      changed_files: options.pullRequest.changed_files
    },
    files: options.files.map(normalizeChangedFile),
    diff: {
      format: "unified",
      text: options.diffText,
      bytes: diffBytes,
      lines: countLines(options.diffText)
    },
    ci: options.ci ?? buildUnknownCiSummary(options.pullRequest.head.sha),
    limitations: options.limitations ?? []
  };
}

function normalizeChangedFile(file: GitHubChangedFileApiResponse): GitHubChangedFileSummary {
  return {
    path: file.filename,
    previous_path: file.previous_filename ?? null,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    patch_available: typeof file.patch === "string" && file.patch.length > 0,
    blob_url: file.blob_url ?? null,
    raw_url: file.raw_url ?? null
  };
}

async function fetchChangedFiles(
  parsedUrl: ParsedGitHubPullRequestUrl,
  options: RequiredPick<FetchGitHubPullRequestOptions, "fetchImpl"> & FetchGitHubPullRequestOptions
) {
  const maxFilePages = options.maxFilePages ?? 30;
  const files: GitHubChangedFileApiResponse[] = [];
  const limitations: string[] = [];

  for (let page = 1; page <= maxFilePages; page += 1) {
    const pageUrl = buildChangedFilesApiUrl(parsedUrl, page);
    const pageFiles = await fetchJson(
      pageUrl,
      githubChangedFilesApiSchema,
      "changed files",
      options
    );

    files.push(...pageFiles);

    if (pageFiles.length < 100) {
      return { files, limitations };
    }
  }

  limitations.push("Changed files may be truncated after 3000 files.");
  return { files, limitations };
}

async function fetchDiff(
  apiPullUrl: string,
  options: RequiredPick<FetchGitHubPullRequestOptions, "fetchImpl"> & FetchGitHubPullRequestOptions
): Promise<{ diffText: string; limitations: string[] }> {
  try {
    const response = await requestGitHub(apiPullUrl, "pull request diff", {
      ...options,
      accept: diffAccept
    });

    if (!response.ok) {
      throw buildHttpError(response, "pull request diff", "diff_unavailable");
    }

    return {
      diffText: await response.text(),
      limitations: []
    };
  } catch (error) {
    if (!(error instanceof GitHubFetchError)) {
      throw error;
    }

    return {
      diffText: "",
      limitations: [`GitHub pull request diff unavailable: ${error.code}.`]
    };
  }
}

async function fetchCiSummary(
  parsedUrl: ParsedGitHubPullRequestUrl,
  headSha: string,
  options: RequiredPick<FetchGitHubPullRequestOptions, "fetchImpl"> & FetchGitHubPullRequestOptions
): Promise<{ ci: GitHubCiSummary; limitations: string[] }> {
  const limitations: string[] = [];
  const unavailableCodes: string[] = [];
  let statusResponse: GitHubCommitStatusApiResponse = {
    state: "unknown",
    total_count: 0,
    statuses: []
  };
  let checkRunsResponse: GitHubCheckRunsApiResponse = {
    total_count: 0,
    check_runs: []
  };

  try {
    statusResponse = await fetchJson(
      buildCommitStatusApiUrl(parsedUrl, headSha),
      githubCommitStatusApiSchema,
      "commit status",
      options
    );
  } catch (error) {
    if (!(error instanceof GitHubFetchError)) {
      throw error;
    }

    unavailableCodes.push(error.code);
    limitations.push(`GitHub commit status unavailable: ${error.code}.`);
  }

  try {
    checkRunsResponse = await fetchJson(
      buildCheckRunsApiUrl(parsedUrl, headSha),
      githubCheckRunsApiSchema,
      "check runs",
      options
    );
  } catch (error) {
    if (!(error instanceof GitHubFetchError)) {
      throw error;
    }

    unavailableCodes.push(error.code);
    limitations.push(`GitHub check runs unavailable: ${error.code}.`);
  }

  if (unavailableCodes.length === 2) {
    limitations.push(`GitHub CI status unavailable: ${[...new Set(unavailableCodes)].join(", ")}.`);
    return { ci: buildUnknownCiSummary(headSha), limitations };
  }

  if (checkRunsResponse.total_count > checkRunsResponse.check_runs.length) {
    limitations.push("GitHub check runs may be truncated after 100 items.");
  }

  return {
    ci: normalizeCiSummary(headSha, statusResponse, checkRunsResponse),
    limitations
  };
}

async function fetchJson<T>(
  url: string,
  schema: z.ZodType<T>,
  description: string,
  options: RequiredPick<FetchGitHubPullRequestOptions, "fetchImpl"> & FetchGitHubPullRequestOptions
): Promise<T> {
  const response = await requestGitHub(url, description, { ...options, accept: jsonAccept });

  if (!response.ok) {
    throw buildHttpError(response, description);
  }

  const payload: unknown = await response.json();
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw new GitHubFetchError(
      "unexpected_response",
      `GitHub returned an unexpected ${description} response.`,
      "Retry later or open an issue with a sanitized fixture.",
      response.status,
      parsed.error
    );
  }

  return parsed.data;
}

async function requestGitHub(
  url: string,
  description: string,
  options: RequiredPick<FetchGitHubPullRequestOptions, "fetchImpl"> &
    FetchGitHubPullRequestOptions & {
      accept: string;
    }
): Promise<Response> {
  try {
    return await options.fetchImpl(url, {
      headers: buildHeaders(options.accept, options.token)
    });
  } catch (error) {
    throw new GitHubFetchError(
      "network_unavailable",
      `Unable to reach GitHub while fetching ${description}.`,
      "Check your network connection and retry.",
      null,
      error
    );
  }
}

function buildHeaders(accept: string, token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: accept,
    "User-Agent": "oss-signal",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function buildHttpError(
  response: Response,
  description: string,
  fallbackCode: GitHubFetchErrorCode = "unexpected_response"
): GitHubFetchError {
  const status = response.status;
  const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");

  if (status === 403 && rateLimitRemaining === "0") {
    return new GitHubFetchError(
      "rate_limited",
      `GitHub rate limit reached while fetching ${description}.`,
      "Retry later or set GITHUB_TOKEN for a higher rate limit.",
      status
    );
  }

  if (status === 404) {
    return new GitHubFetchError(
      "not_found",
      `GitHub pull request data was not found while fetching ${description}.`,
      "Verify the PR URL and repository visibility.",
      status
    );
  }

  if (status === 401 || status === 403) {
    return new GitHubFetchError(
      "forbidden",
      `GitHub refused access while fetching ${description}.`,
      "Check repository visibility or token permissions.",
      status
    );
  }

  return new GitHubFetchError(
    fallbackCode,
    `GitHub returned HTTP ${status} while fetching ${description}.`,
    "Retry later or open an issue with a sanitized fixture.",
    status
  );
}

function buildPullRequestApiUrl(parsedUrl: ParsedGitHubPullRequestUrl): string {
  return `https://api.github.com/repos/${parsedUrl.owner}/${parsedUrl.repo}/pulls/${parsedUrl.pullNumber}`;
}

function buildChangedFilesApiUrl(parsedUrl: ParsedGitHubPullRequestUrl, page: number): string {
  return `${buildPullRequestApiUrl(parsedUrl)}/files?per_page=100&page=${page}`;
}

function buildCommitStatusApiUrl(parsedUrl: ParsedGitHubPullRequestUrl, headSha: string): string {
  return `https://api.github.com/repos/${parsedUrl.owner}/${parsedUrl.repo}/commits/${headSha}/status`;
}

function buildCheckRunsApiUrl(parsedUrl: ParsedGitHubPullRequestUrl, headSha: string): string {
  return `https://api.github.com/repos/${parsedUrl.owner}/${parsedUrl.repo}/commits/${headSha}/check-runs?per_page=100`;
}

function countLines(text: string): number {
  if (text.length === 0) {
    return 0;
  }

  return text.split(/\r\n|\r|\n/).length;
}

function normalizeCiSummary(
  headSha: string,
  statusResponse: GitHubCommitStatusApiResponse,
  checkRunsResponse: GitHubCheckRunsApiResponse
): GitHubCiSummary {
  const items: GitHubCiItem[] = [
    ...checkRunsResponse.check_runs.map(normalizeCheckRun),
    ...statusResponse.statuses.map(normalizeCommitStatus)
  ];

  const successful = items.filter((item) => item.state === "success").length;
  const failed = items.filter((item) => item.state === "failure").length;
  const pending = items.filter((item) => item.state === "pending").length;
  const skipped = items.filter(
    (item) => item.conclusion === "skipped" || item.conclusion === "neutral"
  ).length;

  return {
    head_sha: headSha,
    state: summarizeCiState(items),
    total: items.length,
    successful,
    failed,
    pending,
    skipped,
    items
  };
}

function normalizeCheckRun(
  checkRun: GitHubCheckRunsApiResponse["check_runs"][number]
): GitHubCiItem {
  return {
    kind: "check_run",
    name: checkRun.name,
    state: normalizeCheckRunState(checkRun.status, checkRun.conclusion),
    status: checkRun.status,
    conclusion: checkRun.conclusion,
    url: checkRun.html_url ?? null
  };
}

function normalizeCommitStatus(
  status: GitHubCommitStatusApiResponse["statuses"][number]
): GitHubCiItem {
  return {
    kind: "status",
    name: status.context,
    state: normalizeCommitStatusState(status.state),
    status: status.state,
    conclusion: status.state,
    url: status.target_url ?? null
  };
}

function normalizeCheckRunState(status: string, conclusion: string | null): GitHubCiState {
  if (status !== "completed") {
    return "pending";
  }

  switch (conclusion) {
    case "success":
    case "neutral":
    case "skipped":
      return "success";
    case "failure":
    case "timed_out":
    case "action_required":
    case "startup_failure":
    case "cancelled":
    case "stale":
      return "failure";
    default:
      return "unknown";
  }
}

function normalizeCommitStatusState(state: string): GitHubCiState {
  switch (state) {
    case "success":
      return "success";
    case "failure":
    case "error":
      return "failure";
    case "pending":
      return "pending";
    default:
      return "unknown";
  }
}

function summarizeCiState(items: GitHubCiItem[]): GitHubCiState {
  if (items.length === 0) {
    return "unknown";
  }

  if (items.some((item) => item.state === "failure")) {
    return "failure";
  }

  if (items.some((item) => item.state === "pending")) {
    return "pending";
  }

  if (items.every((item) => item.state === "success")) {
    return "success";
  }

  return "unknown";
}

function buildUnknownCiSummary(headSha: string): GitHubCiSummary {
  return {
    head_sha: headSha,
    state: "unknown",
    total: 0,
    successful: 0,
    failed: 0,
    pending: 0,
    skipped: 0,
    items: []
  };
}

type RequiredPick<T, K extends keyof T> = T & Required<Pick<T, K>>;
