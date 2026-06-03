import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { OutputFormat } from "../cli/commands/pr.js";
import type { GitHubPullRequestOutput } from "../github/types.js";

import {
  buildReviewBriefJson,
  renderAgentContextMarkdown,
  renderReviewBriefMarkdown
} from "./review-brief.js";

export type WriteOutputOptions = {
  outDir: string;
  format: OutputFormat;
  includeAgentContext: boolean;
};

export type WrittenOutputs = {
  directory: string;
  files: Array<{
    kind: "markdown" | "json" | "agent-context";
    path: string;
  }>;
};

export async function writeReviewOutputs(
  result: GitHubPullRequestOutput,
  options: WriteOutputOptions
): Promise<WrittenOutputs> {
  await mkdir(options.outDir, { recursive: true });

  const files: WrittenOutputs["files"] = [];

  if (options.format === "md" || options.format === "all") {
    const path = join(options.outDir, "review-brief.md");
    await writeFile(path, renderReviewBriefMarkdown(result), "utf8");
    files.push({ kind: "markdown", path });
  }

  if (options.format === "json" || options.format === "all") {
    const path = join(options.outDir, "review-brief.json");
    await writeFile(path, `${JSON.stringify(buildReviewBriefJson(result), null, 2)}\n`, "utf8");
    files.push({ kind: "json", path });
  }

  if (options.includeAgentContext) {
    const path = join(options.outDir, "agent-context.md");
    await writeFile(path, renderAgentContextMarkdown(result), "utf8");
    files.push({ kind: "agent-context", path });
  }

  return {
    directory: options.outDir,
    files
  };
}
