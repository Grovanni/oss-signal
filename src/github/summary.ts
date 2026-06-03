import { analyzePullRequestData } from "../analyze/analyze-pr.js";
import type { GitHubPullRequestData, GitHubPullRequestOutput } from "./types.js";

export function summarizeGitHubPullRequestData(
  data: GitHubPullRequestData
): GitHubPullRequestOutput {
  const analysis = analyzePullRequestData(data);

  return {
    mode: data.source,
    schema_version: data.schema_version,
    source: data.source,
    repository: data.repository,
    pull_request: {
      number: data.pull_request.number,
      title: data.pull_request.title,
      author: data.pull_request.author,
      html_url: data.pull_request.html_url,
      state: data.pull_request.state,
      draft: data.pull_request.draft,
      created_at: data.pull_request.created_at,
      updated_at: data.pull_request.updated_at,
      merged_at: data.pull_request.merged_at,
      head: data.pull_request.head,
      base: data.pull_request.base,
      commits: data.pull_request.commits,
      additions: data.pull_request.additions,
      deletions: data.pull_request.deletions,
      changed_files: data.pull_request.changed_files,
      body_present: data.pull_request.body.trim().length > 0,
      body_length: data.pull_request.body.length
    },
    files: {
      count: data.files.length,
      items: data.files
    },
    diff: {
      format: data.diff.format,
      bytes: data.diff.bytes,
      lines: data.diff.lines,
      available: data.diff.text.length > 0
    },
    analysis,
    limitations: data.limitations
  };
}
