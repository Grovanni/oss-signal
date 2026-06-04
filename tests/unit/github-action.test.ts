import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("GitHub Action metadata", () => {
  it("defines a non-intrusive artifact-producing action", async () => {
    const metadata = await readFile("action.yml", "utf8");
    const runner = await readFile("scripts/github-action/run.mjs", "utf8");

    expect(metadata).toContain("actions/upload-artifact@v4");
    expect(metadata).toContain("config:");
    expect(runner).toContain("GITHUB_STEP_SUMMARY");
    expect(runner).toContain("INPUT_CONFIG");
    expect(runner).toContain("review-brief.md` was not generated");
    expect(metadata).not.toContain("fail-on");
    expect(metadata).not.toContain("comment:");
    expect(metadata).not.toContain("pull-requests: write");
  });

  it("documents that PR comments and fail-on are intentionally unsupported", async () => {
    const docs = await readFile("docs/github-action.md", "utf8");

    expect(docs).toContain("does not comment on pull requests by default");
    expect(docs).toContain("Commenting is not supported");
    expect(docs).toContain("does not support `fail-on`");
  });
});
