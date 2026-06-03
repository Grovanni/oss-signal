import { Buffer } from "node:buffer";

import { z } from "zod";

import type { ParsedGitHubPullRequestUrl } from "./parse-url.js";
import type {
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

export type GitHubPullRequestApiResponse = z.infer<typeof githubPullRequestApiSchema>;
export type GitHubChangedFileApiResponse = z.infer<typeof githubChangedFileApiSchema>;

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
  const diffText = await fetchDiff(apiPullUrl, { ...options, fetchImpl });

  return normalizeGitHubPullRequestData({
    source: "github",
    parsedUrl,
    pullRequest,
    files,
    diffText,
    limitations
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
): Promise<string> {
  const response = await requestGitHub(apiPullUrl, "pull request diff", {
    ...options,
    accept: diffAccept
  });

  if (!response.ok) {
    throw buildHttpError(response, "pull request diff", "diff_unavailable");
  }

  return response.text();
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

function countLines(text: string): number {
  if (text.length === 0) {
    return 0;
  }

  return text.split(/\r\n|\r|\n/).length;
}

type RequiredPick<T, K extends keyof T> = T & Required<Pick<T, K>>;
