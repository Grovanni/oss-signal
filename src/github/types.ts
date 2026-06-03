import type { PullRequestAnalysis } from "../analyze/analyze-pr.js";

export type PullRequestDataSource = "github" | "fixture";

export type GitHubRepositorySummary = {
  owner: string;
  name: string;
  full_name: string;
  html_url: string;
};

export type GitHubPullRequestRef = {
  ref: string;
  sha: string;
  repo_full_name: string | null;
};

export type GitHubPullRequestSummary = {
  number: number;
  title: string;
  body: string;
  author: string | null;
  html_url: string;
  state: string;
  draft: boolean;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  head: GitHubPullRequestRef;
  base: GitHubPullRequestRef;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
};

export type GitHubChangedFileSummary = {
  path: string;
  previous_path: string | null;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch_available: boolean;
  blob_url: string | null;
  raw_url: string | null;
};

export type GitHubDiffData = {
  format: "unified";
  text: string;
  bytes: number;
  lines: number;
};

export type GitHubPullRequestData = {
  schema_version: "github-pr.v1";
  source: PullRequestDataSource;
  repository: GitHubRepositorySummary;
  pull_request: GitHubPullRequestSummary;
  files: GitHubChangedFileSummary[];
  diff: GitHubDiffData;
  limitations: string[];
};

export type GitHubPullRequestOutput = Omit<GitHubPullRequestData, "diff" | "files" | "pull_request"> & {
  mode: PullRequestDataSource;
  pull_request: Omit<GitHubPullRequestSummary, "body"> & {
    body_present: boolean;
    body_length: number;
  };
  files: {
    count: number;
    items: GitHubChangedFileSummary[];
  };
  diff: Omit<GitHubDiffData, "text"> & {
    available: boolean;
  };
  analysis: PullRequestAnalysis;
};
