import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { ParsedGitHubPullRequestUrl } from "./parse-url.js";
import {
  githubChangedFilesApiSchema,
  githubPullRequestApiSchema,
  normalizeGitHubPullRequestData
} from "./fetch-pr.js";
import type { GitHubPullRequestData } from "./types.js";

export class GitHubFixtureError extends Error {
  constructor(message: string, cause?: unknown) {
    super(`${message} Action: verify the fixture contains metadata.json, files.json and diff.diff.`, {
      cause
    });
    this.name = "GitHubFixtureError";
  }
}

export async function loadGitHubPullRequestFixture(
  fixtureDir: string,
  parsedUrl: ParsedGitHubPullRequestUrl
): Promise<GitHubPullRequestData> {
  try {
    const [metadataJson, filesJson, diffText] = await Promise.all([
      readJson(join(fixtureDir, "metadata.json")),
      readJson(join(fixtureDir, "files.json")),
      readFile(join(fixtureDir, "diff.diff"), "utf8")
    ]);

    const metadata = githubPullRequestApiSchema.safeParse(metadataJson);
    const files = githubChangedFilesApiSchema.safeParse(filesJson);

    if (!metadata.success) {
      throw new GitHubFixtureError("Invalid metadata.json fixture.", metadata.error);
    }

    if (!files.success) {
      throw new GitHubFixtureError("Invalid files.json fixture.", files.error);
    }

    return normalizeGitHubPullRequestData({
      source: "fixture",
      parsedUrl,
      pullRequest: metadata.data,
      files: files.data,
      diffText
    });
  } catch (error) {
    if (error instanceof GitHubFixtureError) {
      throw error;
    }

    throw new GitHubFixtureError("Unable to read GitHub PR fixture.", error);
  }
}

async function readJson(filePath: string): Promise<unknown> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as unknown;
}
